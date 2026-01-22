/**
 * Structured logging utilities for server actions.
 *
 * Provides consistent error logging with context for debugging.
 */

interface ActionErrorParams {
  /** Name of the action function (e.g., 'upsertCellAction') */
  action: string
  /** The error that occurred */
  error: unknown
  /** Additional context about the operation */
  context?: Record<string, unknown>
}

/**
 * Log a server action error with consistent formatting.
 * Extracts error code and message from various error types.
 *
 * @param params - Error details and context
 */
export function logActionError(params: ActionErrorParams): void {
  const { action, error, context } = params

  const errorDetails: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  }

  // Extract error info based on type
  if (error instanceof Error) {
    errorDetails.message = error.message
    errorDetails.name = error.name
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>
    if ('message' in errObj) errorDetails.message = errObj.message
    if ('code' in errObj) errorDetails.code = errObj.code
  } else {
    errorDetails.message = String(error)
  }

  // Add context if provided
  if (context) {
    errorDetails.context = context
  }

  console.error(`[${action}]`, errorDetails)
}

/**
 * Parse database error codes into user-friendly messages.
 * Handles common PostgreSQL/Supabase error codes.
 *
 * @param errorCode - Database error code (e.g., '23505')
 * @param defaultMessage - Fallback message if code is not recognized
 * @returns User-friendly error message
 */
export function getDatabaseErrorMessage(
  errorCode: string | undefined,
  defaultMessage: string
): string {
  if (!errorCode) return defaultMessage

  switch (errorCode) {
    // Unique constraint violation
    case '23505':
      return 'This item already exists. Please try a different name or position.'

    // Foreign key violation
    case '23503':
      return 'The referenced item was deleted. Please refresh the page.'

    // Not null violation
    case '23502':
      return 'A required field is missing. Please fill in all required fields.'

    // Check constraint violation
    case '23514':
      return 'The value entered is not valid. Please check your input.'

    // Record not found (Supabase specific)
    case 'PGRST116':
      return 'The item was not found. It may have been deleted.'

    default:
      return defaultMessage
  }
}
