'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface RelationshipItem {
  id: string
  title: string
  slug?: string
  type?: string
}

interface RelationshipSelectorProps {
  label: string
  tableName: 'specimens' | 'projects' | 'log_entries'
  selectedIds: string[]
  onChange: (ids: string[]) => void
  helperText?: string
}

export function RelationshipSelector({
  label,
  tableName,
  selectedIds,
  onChange,
  helperText
}: RelationshipSelectorProps) {
  const [items, setItems] = useState<RelationshipItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadItems()
  }, [tableName])

  const loadItems = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from(tableName)
      .select('id, title, slug, type')
      .order('title')

    if (!error && data) {
      setItems(data)
    }
    setLoading(false)
  }

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(selectedId => selectedId !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const getSelectedItems = () => {
    return items.filter(item => selectedIds.includes(item.id))
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        {label}
      </label>

      {/* Selected items */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          {getSelectedItems().map(item => (
            <div
              key={item.id}
              className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm"
            >
              <span>{item.title}</span>
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="hover:opacity-70"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search and select */}
      <div className="border rounded-lg overflow-hidden">
        <input
          type="text"
          placeholder={`Search ${tableName}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border-b bg-background"
        />

        <div className="max-h-48 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Loading...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No {tableName} found
            </div>
          ) : (
            <div className="divide-y">
              {filteredItems.map(item => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleItem(item.id)}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {item.title}
                    </div>
                    {item.type && (
                      <div className="text-xs text-muted-foreground">
                        {item.type}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  )
}
