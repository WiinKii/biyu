/**
 * V-01 — Prototipo de la unidad de trabajo de publicación (DATABASE §Publicación atómica).
 *
 * Construye un único `db.batch()` con los pasos de publicación. Este código vive en `test/`
 * a propósito: valida el mecanismo; el adaptador real se escribe en la fase 1.
 */

export interface EntryInput {
  id: string;
  ledgerAccountId: string;
  assetCode: string;
  /** Minor units. Kept as bigint until the binding boundary (AGENTS §3). */
  amountMinor: bigint;
}

export interface PublishCommand {
  workspaceId: string;
  draftId: string;
  expectedDraftVersion: number;
  idempotencyKey: string;
  requestHash: string;
  operationId: string;
  entries: EntryInput[];
}

export interface Step {
  label: string;
  statement: D1PreparedStatement;
}

const SAFE_MAX = BigInt(Number.MAX_SAFE_INTEGER);

/** Converts a validated bigint to the number the D1 binding needs, refusing unsafe values. */
export function toBindingInteger(value: bigint): number {
  if (value > SAFE_MAX || value < -SAFE_MAX) {
    throw new RangeError('MONEY_LIMIT');
  }
  return Number(value);
}

function absoluteTotalsByAsset(entries: EntryInput[]): Map<string, bigint> {
  const totals = new Map<string, bigint>();
  for (const entry of entries) {
    const abs = entry.amountMinor < 0n ? -entry.amountMinor : entry.amountMinor;
    totals.set(entry.assetCode, (totals.get(entry.assetCode) ?? 0n) + abs);
  }
  return totals;
}

export function responseFor(command: PublishCommand): string {
  return JSON.stringify({ operation_id: command.operationId, status: 'posted' });
}

export function buildPublicationSteps(db: D1Database, command: PublishCommand): Step[] {
  const { workspaceId, draftId, operationId } = command;
  const steps: Step[] = [
    {
      label: 'claim_idempotency_key',
      statement: db
        .prepare(
          `INSERT INTO idempotency_keys
             (workspace_id, command_scope, key, request_hash, operation_id, response_json)
           VALUES (?, 'post_draft', ?, ?, ?, ?)`,
        )
        .bind(
          workspaceId,
          command.idempotencyKey,
          command.requestHash,
          operationId,
          responseFor(command),
        ),
    },
    {
      label: 'claim_draft_version',
      statement: db
        .prepare(
          `UPDATE drafts SET status = 'posted', version = version + 1
           WHERE id = ? AND workspace_id = ? AND version = ? AND status = 'ready'`,
        )
        .bind(draftId, workspaceId, command.expectedDraftVersion),
    },
    {
      label: 'guard_draft_claimed',
      statement: db.prepare(
        `INSERT INTO publication_guard (ok, label) SELECT changes() = 1, 'draft_claim'`,
      ),
    },
    {
      label: 'insert_operation_building',
      statement: db
        .prepare(`INSERT INTO operations (id, workspace_id, status) VALUES (?, ?, 'building')`)
        .bind(operationId, workspaceId),
    },
    ...command.entries.map((entry, index) => ({
      label: `insert_entry_${index}`,
      statement: db
        .prepare(
          `INSERT INTO entries (id, workspace_id, operation_id, ledger_account_id, asset_code, amount_minor)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          entry.id,
          workspaceId,
          operationId,
          entry.ledgerAccountId,
          entry.assetCode,
          toBindingInteger(entry.amountMinor),
        ),
    })),
    {
      label: 'mark_operation_posted',
      statement: db
        .prepare(`UPDATE operations SET status = 'posted' WHERE id = ? AND status = 'building'`)
        .bind(operationId),
    },
    {
      label: 'guard_operation_posted',
      statement: db.prepare(
        `INSERT INTO publication_guard (ok, label) SELECT changes() = 1, 'operation_posted'`,
      ),
    },
    ...[...absoluteTotalsByAsset(command.entries)].map(([assetCode, total]) => ({
      label: `asset_usage_${assetCode}`,
      statement: db
        .prepare(
          `INSERT INTO asset_usage (workspace_id, asset_code, absolute_minor_total)
           VALUES (?, ?, ?)
           ON CONFLICT (workspace_id, asset_code)
           DO UPDATE SET absolute_minor_total = absolute_minor_total + excluded.absolute_minor_total`,
        )
        .bind(workspaceId, assetCode, toBindingInteger(total)),
    })),
    {
      label: 'insert_audit_event',
      statement: db
        .prepare(
          `INSERT INTO audit_events (id, workspace_id, action, entity_id) VALUES (?, ?, 'operation.posted', ?)`,
        )
        .bind(`audit-${operationId}`, workspaceId, operationId),
    },
    {
      label: 'insert_outbox',
      statement: db
        .prepare(
          `INSERT INTO outbox (id, workspace_id, event_type, dedupe_key) VALUES (?, ?, 'operation.posted', ?)`,
        )
        .bind(`outbox-${operationId}`, workspaceId, `operation.posted:${operationId}`),
    },
  ];
  return steps;
}

export type PublishOutcome =
  | { kind: 'posted'; response: string }
  | { kind: 'replayed'; response: string }
  | { kind: 'idempotency_mismatch' };

/**
 * Publishes once; when the idempotency key already exists, returns the stored response if the
 * request hash matches (I02) or reports a mismatch (I03). Any other failure propagates.
 */
export async function publish(db: D1Database, command: PublishCommand): Promise<PublishOutcome> {
  try {
    await db.batch(buildPublicationSteps(db, command).map((step) => step.statement));
    return { kind: 'posted', response: responseFor(command) };
  } catch (error) {
    if (!isUniqueViolation(error, 'idempotency_keys')) throw error;
    const stored = await db
      .prepare(
        `SELECT request_hash, response_json FROM idempotency_keys
         WHERE workspace_id = ? AND command_scope = 'post_draft' AND key = ?`,
      )
      .bind(command.workspaceId, command.idempotencyKey)
      .first<{ request_hash: string; response_json: string }>();
    if (stored === null) throw error;
    if (stored.request_hash !== command.requestHash) return { kind: 'idempotency_mismatch' };
    return { kind: 'replayed', response: stored.response_json };
  }
}

export function isUniqueViolation(error: unknown, table: string): boolean {
  return (
    error instanceof Error &&
    error.message.includes('UNIQUE constraint failed') &&
    error.message.includes(`${table}.`)
  );
}
