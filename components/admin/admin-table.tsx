import { ReactNode } from 'react'

export interface AdminTableColumn<T = any> {
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

export function AdminTable<T extends { id: string } = any>({
  columns,
  data,
  getRowKey = (row) => row.id,
}: AdminTableProps<T>) {
  const getAlignClass = (align?: 'left' | 'right' | 'center') => {
    if (align === 'right') return 'text-right'
    if (align === 'center') return 'text-center'
    return 'text-left'
  }

  const getCellValue = (row: T, column: AdminTableColumn<T>) => {
    if (column.cell) {
      return column.cell(row)
    }
    if (typeof column.accessor === 'function') {
      return column.accessor(row)
    }
    if (column.accessor) {
      return row[column.accessor] as any
    }
    return null
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  className={`px-6 py-3 text-sm font-medium ${getAlignClass(column.align)} ${column.headerClassName || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row) => (
              <tr key={getRowKey(row)} className="hover:bg-accent transition-colors">
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={`px-6 py-4 ${getAlignClass(column.align)} ${column.cellClassName || ''}`}
                  >
                    {getCellValue(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
