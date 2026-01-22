/**
 * Shared types for server action results
 * This file is not a 'use server' file, so it can export types and enums
 * that are used by both server actions and client components
 */

// ============================================================================
// Error Codes
// ============================================================================

export enum ActionErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
}

// ============================================================================
// Action Result Type
// ============================================================================

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: ActionErrorCode }
