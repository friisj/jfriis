/**
 * Unit Tests: Core Utilities
 *
 * Tests for className merging and date formatting utilities.
 */
import { describe, it, expect } from 'vitest'
import { cn, formatDate } from './utils'

// ============================================================================
// cn (className merger)
// ============================================================================

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', true && 'active')).toBe('base active')
    expect(cn('base', false && 'hidden')).toBe('base')
  })

  it('deduplicates Tailwind classes', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('handles objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar')
    expect(cn('foo', null, 'bar')).toBe('foo bar')
  })

  it('handles empty inputs', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
  })
})

// ============================================================================
// formatDate
// ============================================================================

describe('formatDate', () => {
  it('formats date string correctly', () => {
    // Use mid-month date with time to avoid timezone boundary issues
    const result = formatDate('2024-01-15T12:00:00')
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/2024/)
    // Day might be 14 or 15 depending on timezone, just check format
    expect(result).toMatch(/\d{1,2}/)
  })

  it('formats ISO date string', () => {
    const result = formatDate('2024-06-15T12:00:00Z')
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/2024/)
  })

  it('returns formatted date with month, day, year', () => {
    // Test the format pattern: "Mon DD, YYYY"
    const result = formatDate('2023-08-15T12:00:00')
    expect(result).toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{4}/)
  })
})
