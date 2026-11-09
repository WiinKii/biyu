import { ERROR_HTTP_STATUS, type ErrorCode, type ErrorEnvelope } from '@biyu/contracts';

/**
 * Application error with a stable code (API.md §2). `message` is shown to the user, so it
 * must be Spanish, understandable and free of SQL, traces or data from other workspaces.
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }

  get status(): (typeof ERROR_HTTP_STATUS)[ErrorCode] {
    return ERROR_HTTP_STATUS[this.code];
  }
}

export function errorEnvelope(
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
): ErrorEnvelope {
  return {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
      request_id: requestId,
    },
  };
}
