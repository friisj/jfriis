'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface RelationshipItem {
  id: string
  label: string
  subtitle?: string
}

interface RelationshipFieldProps {
  label: string
  value: string | string[]
  onChange: (value: string | string[]) => void
  tableName: string
  displayField?: string
  subtitleField?: string
  mode: 'single' | 'multi'
  filterBy?: { field: string; value: string | null }
  required?: boolean
  disabled?: boolean
  placeholder?: string
  helperText?: string
  options?: RelationshipItem[]
}

export function RelationshipField({
  label,
  value,
  onChange,
  tableName,
  displayField = 'name',
  subtitleField,
  mode,
  filterBy,
  required = false,
  disabled = false,
  placeholder,
  helperText,
  options: providedOptions,
}: RelationshipFieldProps) {
  const [items, setItems] = useState<RelationshipItem[]>(providedOptions || [])
  const [loading, setLoading] = useState(!providedOptions)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const loadItems = useCallback(async () => {
    if (providedOptions) return

    if (filterBy && !filterBy.value) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const selectFields = subtitleField
        ? `id, ${displayField}, ${subtitleField}`
        : `id, ${displayField}`

      let query = (supabase as any)
        .from(tableName)
        .select(selectFields)
        .order(displayField)

      if (filterBy?.value) {
        query = query.eq(filterBy.field, filterBy.value)
      }

      const { data, error } = await query

      if (!error && data) {
        const mapped = data.map((item: Record<string, unknown>) => ({
          id: item.id as string,
          label: (item[displayField] as string) || (item.id as string),
          subtitle: subtitleField ? (item[subtitleField] as string) : undefined,
        }))
        setItems(mapped)
      }
    } catch (err) {
      console.error(`Error loading ${tableName}:`, err)
    } finally {
      setLoading(false)
    }
  }, [tableName, displayField, subtitleField, filterBy, providedOptions])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedIds = Array.isArray(value) ? value : value ? [value] : []

  const getSelectedItems = () => {
    return items.filter((item) => selectedIds.includes(item.id))
  }

  const handleSelect = (id: string) => {
    if (mode === 'single') {
      onChange(id)
      setIsOpen(false)
      setSearchTerm('')
    } else {
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter((selectedId) => selectedId !== id))
      } else {
        onChange([...selectedIds, id])
      }
    }
  }

  const handleClear = (id?: string) => {
    if (mode === 'single') {
      onChange('')
    } else if (id) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id))
    }
  }

  const selectedItem = mode === 'single' && value ? items.find((i) => i.id === value) : null

  if (mode === 'single') {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`w-full px-3 py-2 text-left border rounded-lg bg-background flex items-center justify-between transition-colors ${
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:border-primary/50 cursor-pointer'
            }`}
          >
            <span className={selectedItem ? '' : 'text-muted-foreground'}>
              {selectedItem?.label || placeholder || `Select ${label.toLowerCase()}...`}
            </span>
            <svg
              className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {selectedItem && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-64 overflow-hidden">
              <div className="p-2 border-b">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded bg-background"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {loading ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">Loading...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    {filterBy && !filterBy.value ? 'Select a filter first' : 'No items found'}
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      className={`w-full px-3 py-2 text-left hover:bg-accent transition-colors ${
                        selectedIds.includes(item.id) ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="text-sm font-medium">{item.label}</div>
                      {item.subtitle && (
                        <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      </div>
    )
  }

  // Multi-select mode
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
          {getSelectedItems().map((item) => (
            <div
              key={item.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-full text-xs"
            >
              <span>{item.label}</span>
              <button
                type="button"
                onClick={() => handleClear(item.id)}
                disabled={disabled}
                className="hover:opacity-70 disabled:opacity-50"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={`border rounded-lg overflow-hidden ${disabled ? 'opacity-50' : ''}`}>
        <input
          type="text"
          placeholder={placeholder || `Search ${label.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border-b bg-background disabled:cursor-not-allowed"
        />

        <div className="max-h-40 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              {filterBy && !filterBy.value ? 'Select a filter first' : 'No items found'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredItems.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer ${
                    disabled ? 'cursor-not-allowed' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => handleSelect(item.id)}
                    disabled={disabled}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.label}</div>
                    {item.subtitle && (
                      <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  )
}
