import { Hono } from 'hono';
import type { HealthResponse } from '@biyu/contracts';
import { logger } from '../../adapters/logger.ts';
import type { AppEnv } from '../types.ts';

export const healthRoutes = new Hono<AppEnv>().get('/health', async (c) => {
  let database: HealthResponse['checks']['database'] = 'ok';
  try {
    await c.env.DB.prepare('SELECT 1 AS ok').first();
  } catch (error) {
    database = 'error';
    logger.error('health_database_failed', {
      request_id: c.get('requestId'),
      error_name: error instanceof Error ? error.name : 'unknown',
    });
  }

  const body: HealthResponse = {
    status: database === 'ok' ? 'ok' : 'degraded',
    service: 'biyu-api',
    api_version: 'v1',
    checks: { database },
    time: new Date().toISOString(),
  };
  return c.json(body, database === 'ok' ? 200 : 503);
});
