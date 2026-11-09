import type { MiddlewareHandler } from 'hono';

/** Security headers for API responses (SECURITY_OPERATIONS §6). */
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  c.header('Cache-Control', 'no-store');
};
