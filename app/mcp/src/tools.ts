import { supabase } from './supabase.js'
import { tables, getTableColumns, isValidTable } from './tables.js'

// Response types
interface SuccessResponse<T> {
  data: T
  count?: number
  error?: undefined
}

interface ErrorResponse {
  data: null
  error: string
  validation_errors?: string[]
  code?: string
}

type Response<T> = SuccessResponse<T> | ErrorResponse

// ============================================
// db_list_tables
// ============================================
export async function dbListTables(): Promise<Response<{
  tables: Array<{
    name: string
    description: string
    columns: Array<{ name: string; type: string; required: boolean }>
  }>
}>> {
  const tableList = Object.entries(tables).map(([name, def]) => ({
    name,
    description: def.description,
    columns: getTableColumns(name),
  }))

  return { data: { tables: tableList } }
}

// ============================================
// db_query
// ============================================
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

export async function dbQuery(input: DbQueryInput): Promise<Response<Record<string, any>[]>> {
  const { table, select = '*', filter, filter_in, filter_like, order_by, limit = 100, offset = 0 } = input

  if (!isValidTable(table)) {
    return { data: null, error: `Table not found: ${table}` }
  }

  let query = supabase.from(table).select(select, { count: 'exact' })

  // Apply equality filters
  if (filter) {
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value)
    }
  }

  // Apply IN filters
  if (filter_in) {
    for (const [key, values] of Object.entries(filter_in)) {
      query = query.in(key, values)
    }
  }

  // Apply ILIKE filters
  if (filter_like) {
    for (const [key, pattern] of Object.entries(filter_like)) {
      query = query.ilike(key, pattern)
    }
  }

  // Apply ordering
  if (order_by) {
    query = query.order(order_by.column, { ascending: order_by.ascending ?? true })
  }

  // Apply pagination
  const effectiveLimit = Math.min(limit, 1000)
  query = query.range(offset, offset + effectiveLimit - 1)

  const { data, error, count } = await query

  if (error) {
    return { data: null, error: `Database error: ${error.message}`, code: error.code }
  }

  return { data: data || [], count: count ?? undefined }
}

// ============================================
// db_get
// ============================================
export interface DbGetInput {
  table: string
  id?: string
  slug?: string
}

export async function dbGet(input: DbGetInput): Promise<Response<Record<string, any> | null>> {
  const { table, id, slug } = input

  if (!isValidTable(table)) {
    return { data: null, error: `Table not found: ${table}` }
  }

  if (!id && !slug) {
    return { data: null, error: 'Must provide either id or slug' }
  }

  const tableDef = tables[table]
  if (slug && !tableDef.hasSlug) {
    return { data: null, error: `Table ${table} does not have a slug field` }
  }

  let query = supabase.from(table).select('*')

  if (id) {
    query = query.eq('id', id)
  } else if (slug) {
    query = query.eq('slug', slug)
  }

  const { data, error } = await query.single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: 'Record not found' }
    }
    return { data: null, error: `Database error: ${error.message}`, code: error.code }
  }

  return { data }
}

// ============================================
// db_create
// ============================================
export interface DbCreateInput {
  table: string
  data: Record<string, any>
}

export async function dbCreate(input: DbCreateInput): Promise<Response<Record<string, any>>> {
  const { table, data } = input

  if (!isValidTable(table)) {
    return { data: null, error: `Table not found: ${table}` }
  }

  const tableDef = tables[table]

  // Validate against create schema
  const validation = tableDef.createSchema.safeParse(data)
  if (!validation.success) {
    const errors = validation.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    )
    return { data: null, error: 'Validation failed', validation_errors: errors }
  }

  const { data: created, error } = await supabase
    .from(table)
    .insert(validation.data)
    .select()
    .single()

  if (error) {
    return { data: null, error: `Database error: ${error.message}`, code: error.code }
  }

  return { data: created }
}

// ============================================
// db_update
// ============================================
export interface DbUpdateInput {
  table: string
  id: string
  data: Record<string, any>
}

export async function dbUpdate(input: DbUpdateInput): Promise<Response<Record<string, any>>> {
  const { table, id, data } = input

  if (!isValidTable(table)) {
    return { data: null, error: `Table not found: ${table}` }
  }

  const tableDef = tables[table]

  // Validate against update schema
  const validation = tableDef.updateSchema.safeParse(data)
  if (!validation.success) {
    const errors = validation.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    )
    return { data: null, error: 'Validation failed', validation_errors: errors }
  }

  const { data: updated, error } = await supabase
    .from(table)
    .update(validation.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: 'Record not found' }
    }
    return { data: null, error: `Database error: ${error.message}`, code: error.code }
  }

  return { data: updated }
}

// ============================================
// db_delete
// ============================================
export interface DbDeleteInput {
  table: string
  id: string
}

export async function dbDelete(input: DbDeleteInput): Promise<Response<{ success: boolean }>> {
  const { table, id } = input

  if (!isValidTable(table)) {
    return { data: null, error: `Table not found: ${table}` }
  }

  const { error } = await supabase.from(table).delete().eq('id', id)

  if (error) {
    return { data: null, error: `Database error: ${error.message}`, code: error.code }
  }

  return { data: { success: true } }
}
