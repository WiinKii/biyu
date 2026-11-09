import type { MiddlewareHandler } from 'hono';
import { routePath } from 'hono/route';
import { logger } from '../../adapters/logger.ts';
import type { AppEnv } from '../types.ts';

/**
 * Assigns a server-generated request id (never trusted from the client), exposes it as
 * `X-Request-Id` and writes one access log line without sensitive data.
 */
export const requestContext: MiddlewareHandler<AppEnv> = async (c, next) => {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  c.set('requestId', requestId);
  await next();
  c.header('X-Request-Id', requestId);
  logger.info('http_request', {
    request_id: requestId,
    method: c.req.method,
    route: routePath(c, -1),
    status: c.res.status,
    duration_ms: Date.now() - started,
  });
};
