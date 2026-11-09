import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { API_BASE_PATH } from '@biyu/contracts';
import { logger } from '../adapters/logger.ts';
import { ApiError, errorEnvelope } from './errors.ts';
import { requestContext } from './middleware/request-context.ts';
import { securityHeaders } from './middleware/security-headers.ts';
import { healthRoutes } from './routes/health.ts';
import type { AppEnv } from './types.ts';

/** Maximum JSON body accepted by the API (SECURITY_OPERATIONS §6). */
export const MAX_BODY_BYTES = 64 * 1024;

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use('*', requestContext, securityHeaders);
  app.use(
    `${API_BASE_PATH}/*`,
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) =>
        c.json(
          errorEnvelope(
            'VALIDATION_ERROR',
            'La solicitud es demasiado grande.',
            c.get('requestId'),
          ),
          400,
        ),
    }),
  );

  app.route(API_BASE_PATH, healthRoutes);

  app.notFound((c) =>
    c.json(errorEnvelope('NOT_FOUND', 'El recurso no existe.', c.get('requestId')), 404),
  );

  app.onError((error, c) => {
    const requestId = c.get('requestId');
    if (error instanceof ApiError) {
      return c.json(
        errorEnvelope(error.code, error.message, requestId, error.details),
        error.status,
      );
    }
    if (error instanceof HTTPException && error.status < 500) {
      return c.json(
        errorEnvelope('VALIDATION_ERROR', 'La solicitud no es válida.', requestId),
        400,
      );
    }
    logger.error('unhandled_error', { request_id: requestId, error_name: error.name });
    return c.json(
      errorEnvelope('INTERNAL', 'Ocurrió un error inesperado. Intenta de nuevo.', requestId),
      500,
    );
  });

  return app;
}
