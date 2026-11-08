import { z } from 'zod';

/**
 * Error contracts (docs/api.md#common-values). Compiler content problems
 * are structured job results, not generic server errors.
 */

export const API_ERROR_CODES = [
  'unauthenticated',
  'forbidden',
  'invalid_request',
  'not_found',
  'conflict',
  'unsupported',
  'unavailable',
] as const;

export const ApiErrorCodeSchema = z.enum(API_ERROR_CODES);
export type ApiErrorCode = z.output<typeof ApiErrorCodeSchema>;

/** Error response body: `{error: {code, message}, requestId}`. */
export const ErrorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: ApiErrorCodeSchema,
    message: z.string().min(1),
  }),
  requestId: z.string().min(1).nullable(),
});
export type ErrorResponse = z.output<typeof ErrorResponseSchema>;

/**
 * Typed error for every client failure. Server rejections carry the
 * response's request ID; client-side failures without a server request
 * have a null request ID. Failures reject with ApiError rather than
 * returning an error as a successful document.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly requestId: string | null;

  constructor(code: ApiErrorCode, message: string, requestId?: string | null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.requestId = requestId ?? null;
  }
}

/** True when the value is an ApiError (usable across module instances). */
export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}
