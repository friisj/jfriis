'use client'

import { useState } from 'react'
import { Code2, ChevronDown, ChevronRight } from 'lucide-react'
import { SNIPPETS, SNIPPET_CATEGORIES } from './snippets'
import type { SnippetCategory } from './snippets'

type Props = {
  onInsert: (code: string) => void
  onReplace: (code: string) => void
}

export function StrudelSnippets({ onInsert, onReplace }: Props) {
  const [expanded, setExpanded] = useState<SnippetCategory | null>(null)

  return (
    <div className="text-xs font-mono space-y-0.5">
      {SNIPPET_CATEGORIES.map(({ id, label }) => {
        const isOpen = expanded === id
        const items = SNIPPETS.filter((s) => s.category === id)

        return (
          <div key={id}>
            <button
              onClick={() => setExpanded(isOpen ? null : id)}
              className="flex items-center gap-1 w-full px-2 py-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span className="uppercase tracking-wider text-[10px]">{label}</span>
              <span className="text-zinc-600 ml-auto">{items.length}</span>
            </button>

            {isOpen && (
              <div className="space-y-px ml-2">
                {items.map((snippet) => (
                  <div
                    key={snippet.name}
                    className="group flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 cursor-pointer"
                    onClick={() => onInsert(snippet.code)}
                    onDoubleClick={() => onReplace(snippet.code)}
                    title={`Click: insert at cursor\nDouble-click: replace all`}
                  >
                    <Code2 className="w-3 h-3 text-zinc-500 group-hover:text-purple-400 shrink-0" />
                    <span className="text-zinc-300 group-hover:text-white truncate">
                      {snippet.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
