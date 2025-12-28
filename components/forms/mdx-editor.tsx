'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MdxEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  rows?: number
}

export function MdxEditor({
  value,
  onChange,
  placeholder = 'Write your content in Markdown...',
  label = 'Content (Markdown)',
  rows = 20
}: MdxEditorProps) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              !showPreview
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              showPreview
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {!showPreview ? (
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm resize-none"
            placeholder={placeholder}
          />
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            <p>Markdown tips:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li># Heading 1, ## Heading 2, ### Heading 3</li>
              <li>**bold**, *italic*, `code`</li>
              <li>[Link text](url), ![Image alt](image-url)</li>
              <li>- List item or 1. Numbered list</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-background min-h-[400px]">
          {value ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Nothing to preview yet...</p>
          )}
        </div>
      )}
    </div>
  )
}
