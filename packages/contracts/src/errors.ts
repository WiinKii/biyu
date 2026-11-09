import { z } from 'zod';

/** Stable error codes and their HTTP status (API.md §2). */
export const ERROR_HTTP_STATUS = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  NEEDS_CLARIFICATION: 422,
  ASSET_MISMATCH: 422,
  UNBALANCED_OPERATION: 422,
  RATE_REQUIRED: 422,
  MONEY_LIMIT: 422,
  CONFIRMATION_EXPIRED: 409,
  ALREADY_REVERSED: 409,
  VERSION_CONFLICT: 409,
  IDEMPOTENCY_MISMATCH: 409,
  RATE_LIMITED: 429,
  INTEGRATION_DISABLED: 503,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_HTTP_STATUS;

export const ERROR_CODES = Object.keys(ERROR_HTTP_STATUS) as [ErrorCode, ...ErrorCode[]];

export const errorCodeSchema = z.enum(ERROR_CODES);

export const errorEnvelopeSchema = z.strictObject({
  error: z.strictObject({
    code: errorCodeSchema,
    /** Human readable, in Spanish (es-VE). Never SQL, traces or other users' data. */
    message: z.string().min(1),
    details: z.record(z.string(), z.unknown()).optional(),
    request_id: z.string().min(1),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
