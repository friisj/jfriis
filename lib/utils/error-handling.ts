import type { PostgrestError } from '@supabase/supabase-js'

export interface ErrorResult {
  success: false
  error: string
  details?: string
}

export interface SuccessResult<T = void> {
  success: true
  data: T
}

export type Result<T = void> = SuccessResult<T> | ErrorResult

/**
 * Convert Supabase error to user-friendly message
 */
export function getErrorMessage(error: PostgrestError | Error | unknown): string {
  if (!error) return 'An unknown error occurred'

  // Supabase PostgrestError
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const pgError = error as PostgrestError

    // Handle specific error codes
    if (pgError.code === '23505') {
      return 'This item is already linked'
    }
    if (pgError.code === '23503') {
      return 'Referenced item not found'
    }
    if (pgError.code === 'PGRST116') {
      return 'No data found'
    }

    return pgError.message || 'Database operation failed'
  }

  // Standard Error
  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred'
}

/**
 * Handle Supabase operation result and return standardized Result type
 */
export function handleSupabaseResult<T>(
  data: T | null,
  error: PostgrestError | null,
  successMessage?: string
): Result<T> {
  if (error) {
    console.error('Supabase error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
      details: error.message,
    }
  }

  if (data === null) {
    return {
      success: false,
      error: 'No data returned',
    }
  }

  return {
    success: true,
    data,
  }
}

/**
 * Simple toast notification (can be replaced with a proper toast library later)
 */
export function showErrorToast(message: string) {
  // For now, use console.error and alert as fallback
  // TODO: Replace with proper toast notification library (e.g., sonner, react-hot-toast)
  console.error('Error:', message)

  // Only show alert in development or for critical errors
  if (process.env.NODE_ENV === 'development') {
    // Using setTimeout to not block the UI thread
    setTimeout(() => {
      alert(`Error: ${message}`)
    }, 0)
  }
}

export function showSuccessToast(message: string) {
  console.log('Success:', message)

  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      alert(`Success: ${message}`)
    }, 0)
  }
}

/**
 * Wrapper for async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Operation failed'
): Promise<Result<T>> {
  try {
    const data = await operation()
    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error(errorMessage, error)
    return {
      success: false,
      error: errorMessage,
      details: getErrorMessage(error),
    }
  }
}
