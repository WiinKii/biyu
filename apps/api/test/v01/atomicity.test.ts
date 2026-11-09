/**
 * V-01 — Atomicidad de `batch` en D1 con guardia de publicación (ADR 0001, TESTING I01–I06).
 *
 * Se ejecuta dentro de workerd con D1 local (Miniflare). La validación en D1 remoto de prueba
 * queda pendiente hasta disponer de una cuenta Cloudflare (ver docs/entregas/FASE-0.md).
 */
import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildPublicationSteps, publish, type PublishCommand, type Step } from './publication.ts';

const db = env.DB;
const WS = 'ws-fixture-a';

const TABLES = [
  'drafts',
  'operations',
  'entries',
  'asset_usage',
  'idempotency_keys',
  'outbox',
  'audit_events',
] as const;

async function snapshot(): Promise<Record<string, unknown[]>> {
  const result: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    const { results } = await db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all();
    result[table] = results;
  }
  return result;
}

async function seedDraft(id = 'draft-1', version = 1): Promise<void> {
  await db
    .prepare(`INSERT INTO drafts (id, workspace_id, status, version) VALUES (?, ?, 'ready', ?)`)
    .bind(id, WS, version)
    .run();
}

/** F05-shaped command: 100 USD out, 97 USD in, 3 USD fee (in minor units). */
function transferCommand(overrides: Partial<PublishCommand> = {}): PublishCommand {
  return {
    workspaceId: WS,
    draftId: 'draft-1',
    expectedDraftVersion: 1,
    idempotencyKey: 'key-1',
    requestHash: 'hash-1',
    operationId: 'op-1',
    entries: [
      { id: 'e1', ledgerAccountId: 'pocket:cash-usd', assetCode: 'USD', amountMinor: -10000n },
      { id: 'e2', ledgerAccountId: 'pocket:kontigo-usd', assetCode: 'USD', amountMinor: 9700n },
      { id: 'e3', ledgerAccountId: 'expense:fee', assetCode: 'USD', amountMinor: 300n },
    ],
    ...overrides,
  };
}

function failingStep(label: string): Step {
  return {
    label,
    statement: db.prepare(`INSERT INTO publication_guard (ok, label) VALUES (0, ?)`).bind(label),
  };
}

/**
 * Rebuilds the spike schema before each test. Rows of posted operations cannot be deleted
 * (that is what the triggers guarantee), so the reset drops triggers, views and tables.
 */
async function resetSchema(): Promise<void> {
  const { results } = await db
    .prepare(
      `SELECT type, name FROM sqlite_master
       WHERE type IN ('trigger', 'view', 'table')
         AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%'`,
    )
    .all<{ type: 'trigger' | 'view' | 'table'; name: string }>();
  const order = { trigger: 0, view: 1, table: 2 } as const;
  const drops = results
    .sort((a, b) => order[a.type] - order[b.type])
    .map((o) => db.prepare(`DROP ${o.type.toUpperCase()} IF EXISTS "${o.name}"`));
  if (drops.length > 0) await db.batch([db.prepare('PRAGMA defer_foreign_keys = ON'), ...drops]);
  await applyD1Migrations(db, env.V01_MIGRATIONS, 'v01_migrations');
}

beforeEach(resetSchema);

describe('V-01 · happy path', () => {
  it('publishes operation, entries, usage, audit, outbox and idempotency in one batch', async () => {
    await seedDraft();
    const outcome = await publish(db, transferCommand());
    expect(outcome.kind).toBe('posted');

    const state = await snapshot();
    expect(state.operations).toEqual([
      { id: 'op-1', workspace_id: WS, status: 'posted', reverses_operation_id: null },
    ]);
    expect(state.entries).toHaveLength(3);
    expect(state.asset_usage).toEqual([
      { workspace_id: WS, asset_code: 'USD', absolute_minor_total: 20000 },
    ]);
    expect(state.drafts).toEqual([
      { id: 'draft-1', workspace_id: WS, status: 'posted', version: 2 },
    ]);
    expect(state.idempotency_keys).toHaveLength(1);
    expect(state.outbox).toHaveLength(1);
    expect(state.audit_events).toHaveLength(1);

    const balance = await db
      .prepare(`SELECT asset_code, SUM(amount_minor) AS total FROM entries GROUP BY asset_code`)
      .all();
    expect(balance.results).toEqual([{ asset_code: 'USD', total: 0 }]);
  });
});

describe('V-01 · I01 forced failure after every step leaves no effect', () => {
  it('rolls back completely wherever the batch fails', async () => {
    await seedDraft();
    const before = await snapshot();
    const steps = buildPublicationSteps(db, transferCommand());
    expect(steps.length).toBeGreaterThanOrEqual(10);

    for (let failAfter = 0; failAfter < steps.length; failAfter++) {
      const label = `injected_after_${steps[failAfter]?.label ?? 'unknown'}`;
      const sequence = [
        ...steps.slice(0, failAfter + 1),
        failingStep(label),
        ...steps.slice(failAfter + 1),
      ];
      await expect(db.batch(sequence.map((s) => s.statement)), label).rejects.toThrow(
        /GUARD_FAILED/,
      );
      expect(await snapshot(), label).toEqual(before);
    }

    // The untouched sequence still publishes afterwards: nothing was left half-claimed.
    await db.batch(steps.map((s) => s.statement));
    expect((await snapshot()).operations).toHaveLength(1);
  });
});

describe('V-01 · natural failures roll back the whole unit of work', () => {
  it('stale draft version: UPDATE matches 0 rows, the guard aborts (I04)', async () => {
    await seedDraft('draft-1', 2);
    const before = await snapshot();
    await expect(publish(db, transferCommand({ expectedDraftVersion: 1 }))).rejects.toThrow(
      /GUARD_FAILED/,
    );
    expect(await snapshot()).toEqual(before);
  });

  it('missing draft: the guard aborts and the idempotency key is not consumed', async () => {
    const before = await snapshot();
    await expect(publish(db, transferCommand())).rejects.toThrow(/GUARD_FAILED/);
    expect(await snapshot()).toEqual(before);
  });

  it('unbalanced operation is rejected by the posting trigger (I06)', async () => {
    await seedDraft();
    const before = await snapshot();
    const command = transferCommand();
    command.entries[2] = {
      id: 'e3',
      ledgerAccountId: 'expense:fee',
      assetCode: 'USD',
      amountMinor: 200n,
    };
    await expect(publish(db, command)).rejects.toThrow(/UNBALANCED_OPERATION/);
    expect(await snapshot()).toEqual(before);
  });

  it('balance is checked per asset: USD and VES never offset each other', async () => {
    await seedDraft();
    const before = await snapshot();
    const command = transferCommand({
      entries: [
        { id: 'e1', ledgerAccountId: 'pocket:cash-usd', assetCode: 'USD', amountMinor: -10000n },
        { id: 'e2', ledgerAccountId: 'pocket:bank-ves', assetCode: 'VES', amountMinor: 10000n },
      ],
    });
    await expect(publish(db, command)).rejects.toThrow(/UNBALANCED_OPERATION/);
    expect(await snapshot()).toEqual(before);
  });

  it('a single-line operation is rejected (I06)', async () => {
    await seedDraft();
    const before = await snapshot();
    const command = transferCommand({
      entries: [
        { id: 'e1', ledgerAccountId: 'pocket:cash-usd', assetCode: 'USD', amountMinor: 5n },
      ],
    });
    await expect(publish(db, command)).rejects.toThrow(/UNBALANCED_OPERATION/);
    expect(await snapshot()).toEqual(before);
  });

  it('a line above 10^12 minor units is rejected by CHECK (F18 at storage level)', async () => {
    await seedDraft();
    const before = await snapshot();
    const big = 10n ** 12n + 1n;
    const command = transferCommand({
      entries: [
        { id: 'e1', ledgerAccountId: 'pocket:a', assetCode: 'USD', amountMinor: -big },
        { id: 'e2', ledgerAccountId: 'pocket:b', assetCode: 'USD', amountMinor: big },
      ],
    });
    await expect(publish(db, command)).rejects.toThrow(/CHECK constraint failed/);
    expect(await snapshot()).toEqual(before);
  });

  it('the cumulative asset_usage limit is enforced atomically', async () => {
    await seedDraft();
    await db
      .prepare(`INSERT INTO asset_usage VALUES (?, 'USD', ?)`)
      .bind(WS, 9_000_000_000_000_000 - 100)
      .run();
    const before = await snapshot();
    await expect(publish(db, transferCommand())).rejects.toThrow(/CHECK constraint failed/);
    expect(await snapshot()).toEqual(before);
  });

  it('a duplicated outbox dedupe key (last step) rolls back everything before it', async () => {
    await seedDraft();
    await db
      .prepare(
        `INSERT INTO outbox VALUES ('other', ?, 'operation.posted', 'operation.posted:op-1')`,
      )
      .bind(WS)
      .run();
    const before = await snapshot();
    await expect(publish(db, transferCommand())).rejects.toThrow(
      /UNIQUE constraint failed: outbox/,
    );
    expect(await snapshot()).toEqual(before);
  });

  it('non-integer amounts are rejected by typeof(amount_minor) = integer', async () => {
    await db.prepare(`INSERT INTO operations VALUES ('op-x', ?, 'building', NULL)`).bind(WS).run();
    const insert = (amount: unknown) =>
      db
        .prepare(`INSERT INTO entries VALUES ('ex', ?, 'op-x', 'pocket:a', 'USD', ?)`)
        .bind(WS, amount)
        .run();
    await expect(insert(1.5)).rejects.toThrow(/CHECK constraint failed/);
    await expect(insert('100.50')).rejects.toThrow(/CHECK constraint failed/);
    await expect(insert('abc')).rejects.toThrow(/CHECK constraint failed/);
  });

  it('documents SQLite affinity: an integer-looking text is stored as an exact INTEGER', async () => {
    // Finding: INTEGER affinity converts '100' to 100 before the CHECK runs. No precision is
    // lost, but adapters must still bind numbers produced by toBindingInteger(), never text.
    await db.prepare(`INSERT INTO operations VALUES ('op-x', ?, 'building', NULL)`).bind(WS).run();
    await db
      .prepare(`INSERT INTO entries VALUES ('ex', ?, 'op-x', 'pocket:a', 'USD', ?)`)
      .bind(WS, '100')
      .run();
    const row = await db
      .prepare(`SELECT typeof(amount_minor) AS t, amount_minor AS v FROM entries WHERE id = 'ex'`)
      .first();
    expect(row).toEqual({ t: 'integer', v: 100 });
  });

  it('integers beyond 2^53 are refused before reaching the binding', async () => {
    const { toBindingInteger } = await import('./publication.ts');
    expect(toBindingInteger(9_007_199_254_740_991n)).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => toBindingInteger(9_007_199_254_740_992n)).toThrow('MONEY_LIMIT');
  });
});

describe('V-01 · immutability of posted operations (I05)', () => {
  beforeEach(async () => {
    await seedDraft();
    await publish(db, transferCommand());
  });

  it('entries of a posted operation cannot be updated, deleted or added', async () => {
    await expect(
      db.prepare(`UPDATE entries SET amount_minor = 1 WHERE id = 'e1'`).run(),
    ).rejects.toThrow(/POSTED_IMMUTABLE/);
    await expect(db.prepare(`DELETE FROM entries WHERE id = 'e1'`).run()).rejects.toThrow(
      /POSTED_IMMUTABLE/,
    );
    await expect(
      db
        .prepare(`INSERT INTO entries VALUES ('e9', ?, 'op-1', 'expense:fee', 'USD', 1)`)
        .bind(WS)
        .run(),
    ).rejects.toThrow(/POSTED_IMMUTABLE/);
  });

  it('a posted operation cannot go back to building nor be deleted', async () => {
    await expect(
      db.prepare(`UPDATE operations SET status = 'building' WHERE id = 'op-1'`).run(),
    ).rejects.toThrow(/POSTED_IMMUTABLE/);
    await expect(db.prepare(`DELETE FROM operations WHERE id = 'op-1'`).run()).rejects.toThrow(
      /POSTED_IMMUTABLE/,
    );
  });
});

describe('V-01 · idempotency and concurrency (I02, I03)', () => {
  it('two simultaneous publications with the same key produce one operation and the same response', async () => {
    await seedDraft();
    const [a, b] = await Promise.all([
      publish(db, transferCommand()),
      publish(db, transferCommand()),
    ]);
    const kinds = [a.kind, b.kind].sort();
    expect(kinds).toEqual(['posted', 'replayed']);
    expect(a.kind !== 'idempotency_mismatch' && b.kind !== 'idempotency_mismatch').toBe(true);
    if (a.kind !== 'idempotency_mismatch' && b.kind !== 'idempotency_mismatch') {
      expect(a.response).toEqual(b.response);
    }
    const state = await snapshot();
    expect(state.operations).toHaveLength(1);
    expect(state.entries).toHaveLength(3);
    expect(state.asset_usage).toEqual([
      { workspace_id: WS, asset_code: 'USD', absolute_minor_total: 20000 },
    ]);
  });

  it('ten concurrent retries still produce exactly one operation', async () => {
    await seedDraft();
    const outcomes = await Promise.all(
      Array.from({ length: 10 }, () => publish(db, transferCommand())),
    );
    expect(outcomes.filter((o) => o.kind === 'posted')).toHaveLength(1);
    expect(outcomes.filter((o) => o.kind === 'replayed')).toHaveLength(9);
    expect((await snapshot()).operations).toHaveLength(1);
  });

  it('same key with a different body returns IDEMPOTENCY_MISMATCH and changes nothing', async () => {
    await seedDraft();
    await publish(db, transferCommand());
    const before = await snapshot();
    const outcome = await publish(
      db,
      transferCommand({ requestHash: 'hash-2', operationId: 'op-2' }),
    );
    expect(outcome).toEqual({ kind: 'idempotency_mismatch' });
    expect(await snapshot()).toEqual(before);
  });

  it('different keys on the same draft version: only the first wins, the second fails the guard', async () => {
    await seedDraft();
    const results = await Promise.allSettled([
      publish(db, transferCommand()),
      publish(
        db,
        transferCommand({ idempotencyKey: 'key-2', requestHash: 'hash-2', operationId: 'op-2' }),
      ),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected');
    expect(String(rejected?.status === 'rejected' ? rejected.reason : '')).toMatch(/GUARD_FAILED/);
    const state = await snapshot();
    expect(state.operations).toHaveLength(1);
    expect(state.idempotency_keys).toHaveLength(1);
  });
});

describe('V-01 · reversal uniqueness (F16 at storage level)', () => {
  it('a second reversal of the same operation violates the partial unique index', async () => {
    await seedDraft();
    await publish(db, transferCommand());
    const reverse = (id: string) =>
      db.prepare(`INSERT INTO operations VALUES (?, ?, 'building', 'op-1')`).bind(id, WS).run();
    await reverse('rev-1');
    await expect(reverse('rev-2')).rejects.toThrow(/UNIQUE constraint failed/);
  });
});
