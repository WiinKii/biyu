import { errorEnvelopeSchema, healthResponseSchema } from '@biyu/contracts';
import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

const BASE = 'https://biyu.test/api/v1';

describe('GET /api/v1/health', () => {
  it('reports the API and D1 as healthy with the contract shape', async () => {
    const response = await exports.default.fetch(`${BASE}/health`);
    expect(response.status).toBe(200);
    const body = healthResponseSchema.parse(await response.json());
    expect(body.checks.database).toBe('ok');
  });

  it('sets correlation and security headers', async () => {
    const response = await exports.default.fetch(`${BASE}/health`);
    expect(response.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('ignores a client-provided request id', async () => {
    const response = await exports.default.fetch(`${BASE}/health`, {
      headers: { 'X-Request-Id': 'attacker-controlled' },
    });
    expect(response.headers.get('X-Request-Id')).not.toBe('attacker-controlled');
  });
});

describe('API error format (API.md §2)', () => {
  it('returns NOT_FOUND in the documented envelope for unknown API routes', async () => {
    const response = await exports.default.fetch(`${BASE}/does-not-exist`);
    expect(response.status).toBe(404);
    const body = errorEnvelopeSchema.parse(await response.json());
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.request_id).toBe(response.headers.get('X-Request-Id'));
  });

  it('rejects oversized bodies with VALIDATION_ERROR', async () => {
    const response = await exports.default.fetch(`${BASE}/health`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': String(70 * 1024) },
      body: 'x'.repeat(70 * 1024),
    });
    expect(response.status).toBe(400);
    expect(errorEnvelopeSchema.parse(await response.json()).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('logging policy (SECURITY_OPERATIONS §5)', () => {
  it('access logs contain only allow-listed fields', async () => {
    const lines: string[] = [];
    const original = console.log;
    console.log = (line: unknown) => {
      lines.push(String(line));
    };
    try {
      await exports.default.fetch(`${BASE}/health?amount=12345&note=secreto`);
    } finally {
      console.log = original;
    }
    const entry = JSON.parse(lines.find((l) => l.includes('http_request')) ?? '{}') as Record<
      string,
      unknown
    >;
    expect(Object.keys(entry).sort()).toEqual(
      ['duration_ms', 'event', 'level', 'method', 'request_id', 'route', 'status'].sort(),
    );
    expect(JSON.stringify(entry)).not.toMatch(/12345|secreto/);
  });
});
