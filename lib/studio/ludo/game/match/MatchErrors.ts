/**
 * Error types for match operations
 *
 * These represent business rule violations in match play.
 * Pure functions return these as values instead of throwing or logging.
 */

export enum MatchErrorCode {
  NO_PENDING_DOUBLE = 'NO_PENDING_DOUBLE',
  NO_DOUBLING_CUBE = 'NO_DOUBLING_CUBE',
}

export interface MatchError {
  code: MatchErrorCode;
  message: string;
}

/**
 * Result type for operations that can fail
 *
 * This allows pure functions to return errors as values
 * rather than throwing exceptions or logging.
 */
export type Result<T, E = MatchError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Helper to create success result
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Helper to create error result
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Error factory functions
 */
export const MatchErrors = {
  noPendingDouble(): MatchError {
    return {
      code: MatchErrorCode.NO_PENDING_DOUBLE,
      message: 'No pending double to accept or decline'
    };
  },

  noDoublingCube(): MatchError {
    return {
      code: MatchErrorCode.NO_DOUBLING_CUBE,
      message: 'Doubling cube not available'
    };
  },
};
