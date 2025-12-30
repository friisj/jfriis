import type { SupabaseClient } from '@supabase/supabase-js'

// Response types
export interface SuccessResponse<T> {
  data: T
  count?: number
  error?: undefined
}

export interface ErrorResponse {
  data: null
  error: string
  validation_errors?: string[]
  code?: string
}

export type Response<T> = SuccessResponse<T> | ErrorResponse

// Tool input types
export interface DbQueryInput {
  table: string
  select?: string
  filter?: Record<string, any>
  filter_in?: Record<string, any[]>
  filter_like?: Record<string, string>
  order_by?: { column: string; ascending?: boolean }
  limit?: number
  offset?: number
}

export interface DbGetInput {
  table: string
  id?: string
  slug?: string
}

export interface DbCreateInput {
  table: string
  data: Record<string, any>
}

export interface DbUpdateInput {
  table: string
  id: string
  data: Record<string, any>
}

export interface DbDeleteInput {
  table: string
  id: string
}

// Supabase client type (generic to work with any database types)
export type SupabaseClientType = SupabaseClient<any, any, any>
