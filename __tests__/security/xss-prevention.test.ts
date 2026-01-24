/**
 * Security Tests: XSS Prevention
 *
 * Comprehensive XSS attack vector testing for all validation functions.
 * Ensures user input is properly sanitized across the application.
 */
import { describe, it, expect } from 'vitest'
import { XSS_VECTORS } from '../factories'
import { validateCellContent } from '@/lib/boundary-objects/blueprint-cells'
import { validateCellContent as validateJourneyCellContent } from '@/lib/boundary-objects/journey-cells'
import {
  validateLayerName,
  validateActivityName,
  validateLayerDescription,
} from '@/lib/boundary-objects/story-map-layers'

// ============================================================================
// Test Suite Configuration
// ============================================================================

/**
 * Validation functions to test.
 * All these functions should reject XSS attack vectors.
 */
const VALIDATORS_WITH_XSS_PROTECTION = [
  { name: 'Blueprint validateCellContent', fn: validateCellContent },
  { name: 'Journey validateCellContent', fn: validateJourneyCellContent },
  { name: 'StoryMap validateLayerName', fn: validateLayerName },
  { name: 'StoryMap validateActivityName', fn: validateActivityName },
]

// For validators that return DataResult<string | null>, we need different test handling
const OPTIONAL_VALIDATORS = [
  { name: 'StoryMap validateLayerDescription', fn: validateLayerDescription },
]

// All required field validators for tests
const VALIDATORS = VALIDATORS_WITH_XSS_PROTECTION

// ============================================================================
// Basic Script Injection Tests
// ============================================================================

describe('XSS Prevention: Basic Script Injection', () => {
  it.each(VALIDATORS)('$name rejects basic script tags', ({ fn }) => {
    for (const vector of XSS_VECTORS.basic) {
      const result = fn(vector)
      expect(result.success).toBe(false)
    }
  })
})

// ============================================================================
// Event Handler Injection Tests
// ============================================================================

describe('XSS Prevention: Event Handler Injection', () => {
  it.each(VALIDATORS)('$name rejects event handlers', ({ fn }) => {
    for (const vector of XSS_VECTORS.eventHandlers) {
      const result = fn(vector)
      expect(result.success, `Should reject: ${vector}`).toBe(false)
    }
  })
})

// ============================================================================
// SVG-Based XSS Tests
// ============================================================================

describe('XSS Prevention: SVG-Based XSS', () => {
  it.each(VALIDATORS)('$name rejects SVG-based XSS', ({ fn }) => {
    for (const vector of XSS_VECTORS.svg) {
      const result = fn(vector)
      expect(result.success, `Should reject: ${vector}`).toBe(false)
    }
  })
})

// ============================================================================
// Protocol-Based XSS Tests
// ============================================================================

describe('XSS Prevention: Dangerous Protocols', () => {
  it.each(VALIDATORS)('$name rejects javascript: protocol', ({ fn }) => {
    const result = fn('javascript:alert(1)')
    expect(result.success).toBe(false)
  })

  it.each(VALIDATORS)('$name rejects data: protocol', ({ fn }) => {
    const result = fn('data:text/html,<script>alert(1)</script>')
    expect(result.success).toBe(false)
  })

  // These protocols are now blocked after the security fix
  it.each(VALIDATORS)('$name rejects vbscript: protocol', ({ fn }) => {
    const result = fn('vbscript:msgbox(1)')
    expect(result.success).toBe(false)
  })

  it.each(VALIDATORS)('$name rejects file: protocol', ({ fn }) => {
    const result = fn('file:///etc/passwd')
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// Unicode/Fullwidth XSS Tests
// ============================================================================

describe('XSS Prevention: Unicode Evasion', () => {
  // Fullwidth characters are now blocked after the security fix
  it.each(VALIDATORS)('$name rejects fullwidth script tags', ({ fn }) => {
    const result = fn('＜script＞alert(1)＜/script＞')
    expect(result.success).toBe(false)
  })

  it.each(VALIDATORS)('$name rejects fullwidth characters in general', ({ fn }) => {
    // Any fullwidth character should be rejected
    const result = fn('Hello＜World')
    expect(result.success).toBe(false)
  })

  it.each(VALIDATORS)('$name rejects mixed case script tags', ({ fn }) => {
    const result = fn('<sCrIpT>alert(1)</sCrIpT>')
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// CDATA-Based XSS Tests
// ============================================================================

describe('XSS Prevention: CDATA Injection', () => {
  it.each(VALIDATORS)('$name rejects CDATA sections', ({ fn }) => {
    const result = fn('<![CDATA[<script>alert(1)</script>]]>')
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// Iframe-Based XSS Tests
// ============================================================================

describe('XSS Prevention: Iframe Injection', () => {
  it.each(VALIDATORS)('$name rejects iframe with javascript', ({ fn }) => {
    const result = fn('<iframe src="javascript:alert(1)">')
    expect(result.success).toBe(false)
  })

  it.each(VALIDATORS)('$name rejects iframe with data protocol', ({ fn }) => {
    const result = fn('<iframe src="data:text/html,<script>alert(1)</script>">')
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// Comprehensive Coverage Test
// ============================================================================

describe('XSS Prevention: Full Vector Coverage', () => {
  // All vectors that should be blocked
  const ALL_BLOCKED_VECTORS = [
    ...XSS_VECTORS.basic,
    ...XSS_VECTORS.eventHandlers,
    ...XSS_VECTORS.svg,
    ...XSS_VECTORS.protocols,
    ...XSS_VECTORS.cdata,
    ...XSS_VECTORS.iframe,
    ...XSS_VECTORS.unicode,
  ]

  it('Blueprint validateCellContent rejects all XSS vectors', () => {
    const rejectedCount = ALL_BLOCKED_VECTORS.filter(
      (vector) => !validateCellContent(vector).success
    ).length

    // All vectors should be rejected
    expect(rejectedCount).toBe(ALL_BLOCKED_VECTORS.length)
  })

  it('Journey validateCellContent rejects all XSS vectors', () => {
    const rejectedCount = ALL_BLOCKED_VECTORS.filter(
      (vector) => !validateJourneyCellContent(vector).success
    ).length

    expect(rejectedCount).toBe(ALL_BLOCKED_VECTORS.length)
  })

  it('StoryMap validateLayerName rejects all XSS vectors', () => {
    const rejectedCount = ALL_BLOCKED_VECTORS.filter(
      (vector) => !validateLayerName(vector).success
    ).length

    expect(rejectedCount).toBe(ALL_BLOCKED_VECTORS.length)
  })

  it('StoryMap validateActivityName rejects all XSS vectors', () => {
    const rejectedCount = ALL_BLOCKED_VECTORS.filter(
      (vector) => !validateActivityName(vector).success
    ).length

    expect(rejectedCount).toBe(ALL_BLOCKED_VECTORS.length)
  })
})

// ============================================================================
// Safe Content Tests (Should Pass)
// ============================================================================

describe('XSS Prevention: Safe Content Allowed', () => {
  const SAFE_CONTENT = [
    'Normal text without any special characters',
    'Text with numbers 123 and punctuation!',
    'Text with "quotes" and \'apostrophes\'',
    'Multi-line\ntext\nis\nallowed',
    'Parentheses (like this) are fine',
    'Ampersand & is allowed',
    'Percentages 100% are fine',
    'Currency $100 £50 €75 are fine',
    'Math expressions 5+3=8 are fine',
    'Email addresses user@example.com are fine',
  ]

  it.each(VALIDATORS)('$name allows safe content', ({ fn }) => {
    for (const content of SAFE_CONTENT) {
      const result = fn(content)
      expect(result.success, `Should allow: ${content}`).toBe(true)
    }
  })
})

// ============================================================================
// Error Message Quality Tests
// ============================================================================

describe('XSS Prevention: Error Message Quality', () => {
  it('provides clear error message for HTML tags', () => {
    const result = validateCellContent('<script>alert(1)</script>')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/HTML|tags|invalid/i)
    }
  })

  it('provides clear error message for protocols', () => {
    const result = validateCellContent('javascript:alert(1)')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/invalid|characters|protocol/i)
    }
  })

  it('provides clear error message for event handlers', () => {
    const result = validateCellContent('onclick=alert(1)')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/invalid|characters|handler/i)
    }
  })

  it('provides clear error message for fullwidth unicode', () => {
    const result = validateCellContent('＜script＞')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/Unicode|invalid/i)
    }
  })
})

// ============================================================================
// Boundary Tests
// ============================================================================

describe('XSS Prevention: Boundary Cases', () => {
  it('rejects angle brackets even without script', () => {
    const result = validateCellContent('Use < and > for comparisons')
    expect(result.success).toBe(false)
  })

  it('rejects content that looks like broken HTML', () => {
    const result = validateCellContent('<div>')
    expect(result.success).toBe(false)
  })

  it('rejects content with unclosed tags', () => {
    const result = validateCellContent('<p>unclosed')
    expect(result.success).toBe(false)
  })

  it('rejects vbscript protocol in various forms', () => {
    const vectors = [
      'vbscript:msgbox(1)',
      'VBSCRIPT:MsgBox(1)',
      'VbScript:alert(1)',
    ]
    for (const vector of vectors) {
      const result = validateCellContent(vector)
      expect(result.success, `Should reject: ${vector}`).toBe(false)
    }
  })

  it('rejects file protocol in various forms', () => {
    const vectors = [
      'file:///etc/passwd',
      'FILE:///C:/Windows/System32',
      'file://localhost/etc/hosts',
    ]
    for (const vector of vectors) {
      const result = validateCellContent(vector)
      expect(result.success, `Should reject: ${vector}`).toBe(false)
    }
  })
})

// ============================================================================
// Optional Field Validators
// ============================================================================

describe('XSS Prevention: Optional Field Validators', () => {
  it.each(OPTIONAL_VALIDATORS)('$name rejects XSS in optional fields', ({ fn }) => {
    for (const vector of XSS_VECTORS.basic) {
      const result = fn(vector)
      expect(result.success, `Should reject: ${vector}`).toBe(false)
    }
  })

  it.each(OPTIONAL_VALIDATORS)('$name allows null/undefined', ({ fn }) => {
    expect(fn(undefined).success).toBe(true)
    expect(fn('').success).toBe(true)
  })
})
