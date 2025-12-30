/**
 * Validation utilities for user inputs
 */

/**
 * Validate URL format and safety
 */
export function isValidUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') {
    return false
  }

  // Trim whitespace
  urlString = urlString.trim()

  // Must not be empty after trim
  if (!urlString) {
    return false
  }

  // Try to parse as URL
  try {
    const url = new URL(urlString)

    // Only allow http and https protocols (no javascript:, data:, etc.)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false
    }

    // Must have a hostname
    if (!url.hostname) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Sanitize URL by ensuring proper protocol and removing dangerous characters
 */
export function sanitizeUrl(urlString: string): string | null {
  if (!isValidUrl(urlString)) {
    return null
  }

  try {
    const url = new URL(urlString.trim())
    return url.toString()
  } catch {
    return null
  }
}

/**
 * Validate string length
 */
export function isValidLength(
  value: string | null | undefined,
  min: number = 1,
  max: number = 1000
): boolean {
  if (!value) return min === 0

  const length = value.trim().length
  return length >= min && length <= max
}

/**
 * Validate evidence form data
 */
export interface EvidenceFormData {
  title: string
  summary?: string
  url?: string
}

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export function validateEvidenceForm(data: EvidenceFormData): ValidationResult {
  const errors: Record<string, string> = {}

  // Title is required
  if (!isValidLength(data.title, 1, 200)) {
    if (!data.title?.trim()) {
      errors.title = 'Title is required'
    } else {
      errors.title = 'Title must be between 1 and 200 characters'
    }
  }

  // Summary is optional but has max length
  if (data.summary && !isValidLength(data.summary, 0, 2000)) {
    errors.summary = 'Summary must be less than 2000 characters'
  }

  // URL is optional but must be valid if provided
  if (data.url && data.url.trim() && !isValidUrl(data.url)) {
    errors.url = 'Please enter a valid URL (http:// or https://)'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validate assumption form data
 */
export interface AssumptionFormData {
  statement: string
  category: string
}

export function validateAssumptionForm(data: AssumptionFormData): ValidationResult {
  const errors: Record<string, string> = {}

  if (!isValidLength(data.statement, 1, 500)) {
    if (!data.statement?.trim()) {
      errors.statement = 'Statement is required'
    } else {
      errors.statement = 'Statement must be between 1 and 500 characters'
    }
  }

  if (!data.category?.trim()) {
    errors.category = 'Category is required'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validate canvas item form data
 */
export interface CanvasItemFormData {
  title: string
  item_type: string
}

export function validateCanvasItemForm(data: CanvasItemFormData): ValidationResult {
  const errors: Record<string, string> = {}

  if (!isValidLength(data.title, 1, 200)) {
    if (!data.title?.trim()) {
      errors.title = 'Title is required'
    } else {
      errors.title = 'Title must be between 1 and 200 characters'
    }
  }

  if (!data.item_type?.trim()) {
    errors.item_type = 'Item type is required'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
