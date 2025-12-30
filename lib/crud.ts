import { supabase } from './supabase'

/**
 * Generic CRUD operations for Supabase tables
 */

// Create a new record
export async function createRecord<T>(table: string, data: Partial<T>) {
  const { data: record, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return record as T
}

// Read all records with optional filtering
export async function readRecords<T>(
  table: string,
  options?: {
    select?: string
    filter?: Record<string, any>
    orderBy?: { column: string; ascending?: boolean }
    limit?: number
  }
) {
  let query = supabase.from(table).select(options?.select || '*')

  // Apply filters
  if (options?.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
  }

  // Apply ordering
  if (options?.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? true,
    })
  }

  // Apply limit
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data as T[]
}

// Read a single record by ID
export async function readRecord<T>(table: string, id: string | number) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as T
}

// Update a record by ID
export async function updateRecord<T>(
  table: string,
  id: string | number,
  updates: Partial<T>
) {
  const { data, error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as T
}

// Delete a record by ID
export async function deleteRecord(table: string, id: string | number) {
  const { error } = await supabase.from(table).delete().eq('id', id)

  if (error) throw error
  return true
}

// Upsert (insert or update) a record
export async function upsertRecord<T>(table: string, data: Partial<T>) {
  const { data: record, error } = await supabase
    .from(table)
    .upsert(data)
    .select()
    .single()

  if (error) throw error
  return record as T
}
