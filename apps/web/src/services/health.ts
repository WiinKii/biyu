import { API_BASE_PATH, healthResponseSchema, type HealthResponse } from '@biyu/contracts';

export type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: HealthResponse; checkedAt: Date }
  | { kind: 'degraded'; data: HealthResponse; checkedAt: Date }
  | { kind: 'offline'; checkedAt: Date }
  | { kind: 'error'; checkedAt: Date };

/**
 * Asks the API for its health. The response is validated with the shared contract, so a
 * malformed answer is reported as an error instead of being trusted (ARCHITECTURE §3).
 */
export async function fetchHealth(
  fetcher: typeof fetch = fetch,
  isOnline: () => boolean = () => navigator.onLine,
): Promise<HealthState> {
  const checkedAt = new Date();
  if (!isOnline()) return { kind: 'offline', checkedAt };
  try {
    const response = await fetcher(`${API_BASE_PATH}/health`, {
      headers: { accept: 'application/json' },
    });
    const parsed = healthResponseSchema.safeParse(await response.json());
    if (!parsed.success) return { kind: 'error', checkedAt };
    return parsed.data.status === 'ok'
      ? { kind: 'ok', data: parsed.data, checkedAt }
      : { kind: 'degraded', data: parsed.data, checkedAt };
  } catch {
    return isOnline() ? { kind: 'error', checkedAt } : { kind: 'offline', checkedAt };
  }
}
