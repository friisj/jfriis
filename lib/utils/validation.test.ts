/**
 * Unit Tests: Validation Utilities
 *
 * Tests for URL validation, string length validation, form validation,
 * and UUID validation utilities.
 */
import { describe, it, expect } from 'vitest'
import {
  isValidUrl,
  sanitizeUrl,
  isValidLength,
  validateEvidenceForm,
  validateAssumptionForm,
  validateCanvasItemForm,
  isValidUuid,
} from './validation'

// ============================================================================
// URL Validation
// ============================================================================

describe('isValidUrl', () => {
  describe('valid URLs', () => {
    it('accepts http URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true)
      expect(isValidUrl('http://example.com/path')).toBe(true)
      expect(isValidUrl('http://example.com:8080')).toBe(true)
    })

    it('accepts https URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('https://example.com/path/to/resource')).toBe(true)
      expect(isValidUrl('https://sub.example.com')).toBe(true)
    })

    it('accepts URLs with query parameters', () => {
      expect(isValidUrl('https://example.com?foo=bar')).toBe(true)
      expect(isValidUrl('https://example.com?a=1&b=2')).toBe(true)
    })

    it('accepts URLs with fragments', () => {
      expect(isValidUrl('https://example.com#section')).toBe(true)
      expect(isValidUrl('https://example.com/page#top')).toBe(true)
    })

    it('trims whitespace', () => {
      expect(isValidUrl('  https://example.com  ')).toBe(true)
      expect(isValidUrl('\nhttps://example.com\n')).toBe(true)
    })
  })

  describe('invalid URLs', () => {
    it('rejects empty values', () => {
      expect(isValidUrl('')).toBe(false)
      expect(isValidUrl('   ')).toBe(false)
      expect(isValidUrl(null as unknown as string)).toBe(false)
      expect(isValidUrl(undefined as unknown as string)).toBe(false)
    })

    it('rejects non-http(s) protocols', () => {
      expect(isValidUrl('javascript:alert(1)')).toBe(false)
      expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
      expect(isValidUrl('vbscript:msgbox(1)')).toBe(false)
      expect(isValidUrl('file:///etc/passwd')).toBe(false)
      expect(isValidUrl('ftp://example.com')).toBe(false)
    })

    it('rejects malformed URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false)
      expect(isValidUrl('example.com')).toBe(false)
      expect(isValidUrl('//example.com')).toBe(false)
      expect(isValidUrl('http://')).toBe(false)
    })

    it('rejects URLs without hostname', () => {
      expect(isValidUrl('http://')).toBe(false)
    })
  })
})

describe('sanitizeUrl', () => {
  it('returns normalized URL for valid inputs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com/')
    expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com/')
  })

  it('returns null for invalid URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizeUrl('not-a-url')).toBeNull()
    expect(sanitizeUrl('')).toBeNull()
  })
})

// ============================================================================
// String Length Validation
// ============================================================================

describe('isValidLength', () => {
  it('validates within range', () => {
    expect(isValidLength('hello', 1, 10)).toBe(true)
    expect(isValidLength('hello', 5, 5)).toBe(true)
  })

  it('rejects below minimum', () => {
    expect(isValidLength('', 1, 10)).toBe(false)
    expect(isValidLength('hi', 5, 10)).toBe(false)
  })

  it('rejects above maximum', () => {
    expect(isValidLength('hello world', 1, 5)).toBe(false)
  })

  it('handles null/undefined with min=0', () => {
    expect(isValidLength(null, 0, 10)).toBe(true)
    expect(isValidLength(undefined, 0, 10)).toBe(true)
    // Empty string after trim has length 0, which is >= min of 0, so returns true
    expect(isValidLength('', 0, 10)).toBe(true)
  })

  it('handles null/undefined with min>0', () => {
    expect(isValidLength(null, 1, 10)).toBe(false)
    expect(isValidLength(undefined, 1, 10)).toBe(false)
  })

  it('trims whitespace before checking', () => {
    expect(isValidLength('  hello  ', 1, 5)).toBe(true)
    expect(isValidLength('   ', 1, 10)).toBe(false) // All whitespace
  })
})

// ============================================================================
// UUID Validation
// ============================================================================

describe('isValidUuid', () => {
  it('accepts valid UUIDs', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isValidUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
    expect(isValidUuid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true)
  })

  it('accepts uppercase UUIDs', () => {
    expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
  })

  it('accepts UUIDs with whitespace (trimmed)', () => {
    expect(isValidUuid('  550e8400-e29b-41d4-a716-446655440000  ')).toBe(true)
  })

  it('rejects invalid UUIDs', () => {
    expect(isValidUuid('')).toBe(false)
    expect(isValidUuid('not-a-uuid')).toBe(false)
    expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false) // Too short
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false) // Too long
    expect(isValidUuid('550g8400-e29b-41d4-a716-446655440000')).toBe(false) // Invalid char
  })

  it('rejects null/undefined', () => {
    expect(isValidUuid(null)).toBe(false)
    expect(isValidUuid(undefined)).toBe(false)
  })
})

// ============================================================================
// Evidence Form Validation
// ============================================================================

describe('validateEvidenceForm', () => {
  it('accepts valid evidence form', () => {
    const result = validateEvidenceForm({
      title: 'Test Evidence',
      summary: 'A summary',
      url: 'https://example.com',
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('accepts form with only required fields', () => {
    const result = validateEvidenceForm({ title: 'Test' })
    expect(result.valid).toBe(true)
  })

  it('rejects empty title', () => {
    const result = validateEvidenceForm({ title: '' })
    expect(result.valid).toBe(false)
    expect(result.errors.title).toBe('Title is required')
  })

  it('rejects whitespace-only title', () => {
    const result = validateEvidenceForm({ title: '   ' })
    expect(result.valid).toBe(false)
    expect(result.errors.title).toBe('Title is required')
  })

  it('rejects title exceeding max length', () => {
    const result = validateEvidenceForm({ title: 'a'.repeat(201) })
    expect(result.valid).toBe(false)
    expect(result.errors.title).toMatch(/between 1 and 200/)
  })

  it('rejects summary exceeding max length', () => {
    const result = validateEvidenceForm({
      title: 'Test',
      summary: 'a'.repeat(2001),
    })
    expect(result.valid).toBe(false)
    expect(result.errors.summary).toMatch(/less than 2000/)
  })

  it('rejects invalid URL', () => {
    const result = validateEvidenceForm({
      title: 'Test',
      url: 'not-a-url',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.url).toMatch(/valid URL/)
  })

  it('accepts empty/whitespace URL', () => {
    const result = validateEvidenceForm({
      title: 'Test',
      url: '   ',
    })
    expect(result.valid).toBe(true)
  })
})

// ============================================================================
// Assumption Form Validation
// ============================================================================

describe('validateAssumptionForm', () => {
  it('accepts valid assumption form', () => {
    const result = validateAssumptionForm({
      statement: 'Users prefer dark mode',
      category: 'User Preferences',
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('rejects empty statement', () => {
    const result = validateAssumptionForm({
      statement: '',
      category: 'Test',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.statement).toBe('Statement is required')
  })

  it('rejects statement exceeding max length', () => {
    const result = validateAssumptionForm({
      statement: 'a'.repeat(501),
      category: 'Test',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.statement).toMatch(/between 1 and 500/)
  })

  it('rejects empty category', () => {
    const result = validateAssumptionForm({
      statement: 'Test statement',
      category: '',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.category).toBe('Category is required')
  })
})

// ============================================================================
// Canvas Item Form Validation
// ============================================================================

describe('validateCanvasItemForm', () => {
  it('accepts valid canvas item form', () => {
    const result = validateCanvasItemForm({
      title: 'Revenue Streams',
      item_type: 'value_proposition',
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('rejects empty title', () => {
    const result = validateCanvasItemForm({
      title: '',
      item_type: 'test',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.title).toBe('Title is required')
  })

  it('rejects title exceeding max length', () => {
    const result = validateCanvasItemForm({
      title: 'a'.repeat(201),
      item_type: 'test',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.title).toMatch(/between 1 and 200/)
  })

  it('rejects empty item_type', () => {
    const result = validateCanvasItemForm({
      title: 'Test',
      item_type: '',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.item_type).toBe('Item type is required')
  })
})
