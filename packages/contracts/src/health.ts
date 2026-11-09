import { z } from 'zod';

export const healthResponseSchema = z.strictObject({
  status: z.enum(['ok', 'degraded']),
  service: z.literal('biyu-api'),
  api_version: z.literal('v1'),
  checks: z.strictObject({
    database: z.enum(['ok', 'error']),
  }),
  time: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
