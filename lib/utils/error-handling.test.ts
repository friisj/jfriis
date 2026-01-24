/**
 * Unit Tests: Error Handling Utilities
 *
 * Tests for error message formatting, Supabase error handling,
 * and async operation wrappers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getErrorMessage,
  handleSupabaseResult,
  withErrorHandling,
} from './error-handling'

// ============================================================================
// getErrorMessage
// ============================================================================

describe('getErrorMessage', () => {
  it('returns default message for null/undefined', () => {
    expect(getErrorMessage(null)).toBe('An unknown error occurred')
    expect(getErrorMessage(undefined)).toBe('An unknown error occurred')
  })

  describe('Supabase PostgrestError codes', () => {
    it('handles unique constraint violation (23505)', () => {
      const error = { code: '23505', message: 'duplicate key' }
      expect(getErrorMessage(error)).toBe('This item is already linked')
    })

    it('handles foreign key violation (23503)', () => {
      const error = { code: '23503', message: 'foreign key constraint' }
      expect(getErrorMessage(error)).toBe('Referenced item not found')
    })

    it('handles not found (PGRST116)', () => {
      const error = { code: 'PGRST116', message: 'not found' }
      expect(getErrorMessage(error)).toBe('No data found')
    })

    it('returns message for unknown Supabase errors', () => {
      const error = { code: '99999', message: 'Something went wrong' }
      expect(getErrorMessage(error)).toBe('Something went wrong')
    })

    it('returns fallback for Supabase error with empty message', () => {
      // Object with 'message' in it will enter the Supabase error handling branch
      const error = { code: '99999', message: '' }
      expect(getErrorMessage(error)).toBe('Database operation failed')
    })
  })

  describe('Standard Error', () => {
    it('returns error message from Error instance', () => {
      const error = new Error('Custom error message')
      expect(getErrorMessage(error)).toBe('Custom error message')
    })

    it('handles TypeError', () => {
      const error = new TypeError('Type mismatch')
      expect(getErrorMessage(error)).toBe('Type mismatch')
    })
  })

  describe('Unknown error types', () => {
    it('returns generic message for string', () => {
      expect(getErrorMessage('some error')).toBe('An unexpected error occurred')
    })

    it('returns generic message for number', () => {
      expect(getErrorMessage(500)).toBe('An unexpected error occurred')
    })

    it('returns generic message for empty object', () => {
      // Empty object doesn't have 'message' property, so falls through to final return
      expect(getErrorMessage({})).toBe('An unexpected error occurred')
    })
  })
})

// ============================================================================
// handleSupabaseResult
// ============================================================================

describe('handleSupabaseResult', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns success result for valid data', () => {
    const data = { id: '123', name: 'Test' }
    const result = handleSupabaseResult(data, null)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(data)
    }
  })

  it('returns error result for Supabase error', () => {
    const error = { code: '23505', message: 'duplicate key', details: '', hint: '', name: 'PostgrestError' }
    const result = handleSupabaseResult(null, error)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('This item is already linked')
      expect(result.details).toBe('duplicate key')
    }
  })

  it('returns error result for null data without error', () => {
    const result = handleSupabaseResult(null, null)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('No data returned')
    }
  })

  it('logs error to console when error present', () => {
    const error = { code: 'ERROR', message: 'test error', details: '', hint: '', name: 'PostgrestError' }
    handleSupabaseResult(null, error)

    expect(console.error).toHaveBeenCalledWith('Supabase error:', error)
  })
})

// ============================================================================
// withErrorHandling
// ============================================================================

describe('withErrorHandling', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns success result when operation succeeds', async () => {
    const operation = vi.fn().mockResolvedValue({ data: 'test' })
    const result = await withErrorHandling(operation)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ data: 'test' })
    }
  })

  it('returns error result when operation throws', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Failed'))
    const result = await withErrorHandling(operation, 'Custom error')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Custom error')
      expect(result.details).toBe('Failed')
    }
  })

  it('uses default error message if not provided', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Failed'))
    const result = await withErrorHandling(operation)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Operation failed')
    }
  })

  it('logs error to console', async () => {
    const error = new Error('Test error')
    const operation = vi.fn().mockRejectedValue(error)
    await withErrorHandling(operation, 'Test failed')

    expect(console.error).toHaveBeenCalledWith('Test failed', error)
  })

  it('handles non-Error thrown values', async () => {
    const operation = vi.fn().mockRejectedValue('string error')
    const result = await withErrorHandling(operation)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.details).toBe('An unexpected error occurred')
    }
  })
})
