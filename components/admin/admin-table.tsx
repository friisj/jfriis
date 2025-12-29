import { ReactNode } from 'react'
import { AdminDataView } from './admin-data-view'

export interface AdminTableColumn<T = any> {
  key: string
  header: string
  accessor?: keyof T | ((row: T) => any)
  cell?: (row: T) => ReactNode
  headerClassName?: string
  cellClassName?: string
  align?: 'left' | 'right' | 'center'
}

interface AdminTableProps<T extends { id: string } = any> {
  columns: AdminTableColumn<T>[]
  data: T[]
  getRowKey?: (row: T) => string
}

/**
 * @deprecated Use AdminDataView instead for multi-view support
 * This is a backward-compatible wrapper that will be removed in a future version
 */
export function AdminTable<T extends { id: string } = any>({
  columns,
  data,
  getRowKey,
}: AdminTableProps<T>) {
  return (
    <AdminDataView
      data={data}
      views={{
        table: {
          columns,
          getRowKey,
        },
      }}
      defaultView="table"
    />
  )
}
