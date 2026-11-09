import { describe, expect, it } from 'vitest';
import { fetchHealth } from './health';

const okBody = {
  status: 'ok',
  service: 'biyu-api',
  api_version: 'v1',
  checks: { database: 'ok' },
  time: '2026-11-09T12:00:00.000Z',
};

const respond = (body: unknown) => (() => Promise.resolve(Response.json(body))) as typeof fetch;

describe('fetchHealth', () => {
  it('reports ok for a valid healthy response', async () => {
    const state = await fetchHealth(respond(okBody), () => true);
    expect(state.kind).toBe('ok');
  });

  it('reports degraded when the database check fails', async () => {
    const state = await fetchHealth(
      respond({ ...okBody, status: 'degraded', checks: { database: 'error' } }),
      () => true,
    );
    expect(state.kind).toBe('degraded');
  });

  it('does not trust a response that breaks the shared contract', async () => {
    const state = await fetchHealth(respond({ ...okBody, extra: true }), () => true);
    expect(state.kind).toBe('error');
  });

  it('reports offline without calling the network when the device has no connection', async () => {
    let called = false;
    const fetcher = (() => {
      called = true;
      return Promise.reject(new Error('unreachable'));
    }) as typeof fetch;
    const state = await fetchHealth(fetcher, () => false);
    expect(state.kind).toBe('offline');
    expect(called).toBe(false);
  });

  it('reports error when the request fails while online', async () => {
    const fetcher = (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch;
    const state = await fetchHealth(fetcher, () => true);
    expect(state.kind).toBe('error');
  });
});
