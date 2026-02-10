'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { ChevronDown, Code, Eye } from 'lucide-react'

const DOCS = [
  { slug: 'prd', label: 'PRD' },
  { slug: 'design-target', label: 'Design Target' },
  { slug: 'design-current', label: 'Design Current' },
  { slug: 'principles', label: 'Principles' },
  { slug: 'ux-map', label: 'UX Map' },
  { slug: 'critique', label: 'Critique' },
  { slug: 'feedback', label: 'Feedback' },
  { slug: 'attachment-skill', label: 'Attachment Skill' },
]

export default function DocViewer() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'rendered' | 'raw'>('rendered')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const currentDoc = DOCS.find((d) => d.slug === slug)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/demo/adsk/docs/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.text()
      })
      .then((text) => {
        setContent(text)
        setLoading(false)
      })
      .catch(() => {
        setContent(null)
        setLoading(false)
      })
  }, [slug])

  return (
    <div className="flex flex-col h-[calc(100vh-2.5rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-background shrink-0">
        <div className="flex items-center gap-3">
          {/* Doc switcher dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {currentDoc?.label ?? slug}
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-md border bg-popover shadow-md">
                  {DOCS.map((doc) => (
                    <button
                      key={doc.slug}
                      className={cn(
                        'flex w-full items-center px-3 py-2 text-left text-sm hover:bg-muted',
                        doc.slug === slug && 'bg-muted font-medium'
                      )}
                      onClick={() => {
                        router.push(`/demo/adsk/docs/${doc.slug}`)
                        setDropdownOpen(false)
                      }}
                    >
                      {doc.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center rounded-md border">
          <button
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs',
              mode === 'rendered'
                ? 'bg-muted font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setMode('rendered')}
          >
            <Eye className="size-3.5" />
            Rendered
          </button>
          <button
            className={cn(
              'flex items-center gap-1.5 border-l px-3 py-1.5 text-xs',
              mode === 'raw'
                ? 'bg-muted font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setMode('raw')}
          >
            <Code className="size-3.5" />
            Raw
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : content === null ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Document not found
          </div>
        ) : mode === 'raw' ? (
          <pre className="p-6 text-sm font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed">
            {content}
          </pre>
        ) : (
          <article className="prose prose-sm dark:prose-invert max-w-none p-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  )
}
