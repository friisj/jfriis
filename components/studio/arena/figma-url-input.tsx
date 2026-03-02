'use client'

import { useMemo } from 'react'

export interface ParsedUrl {
  url: string
  fileKey: string
  nodeId: string
  valid: boolean
}

export function parseFigmaUrl(url: string): ParsedUrl {
  try {
    const parsed = new URL(url.trim())
    if (!parsed.hostname.includes('figma.com')) {
      return { url, fileKey: '', nodeId: '', valid: false }
    }
    const pathMatch = parsed.pathname.match(/\/(design|file)\/([a-zA-Z0-9]+)/)
    if (!pathMatch) return { url, fileKey: '', nodeId: '', valid: false }
    const nodeId = parsed.searchParams.get('node-id')
    if (!nodeId) return { url, fileKey: '', nodeId: '', valid: false }
    return { url, fileKey: pathMatch[2], nodeId: nodeId.replace(/-/g, ':'), valid: true }
  } catch {
    return { url, fileKey: '', nodeId: '', valid: false }
  }
}

interface FigmaUrlInputProps {
  value: string
  onChange: (value: string) => void
  parsedUrls: ParsedUrl[]
}

export function FigmaUrlInput({ value, onChange, parsedUrls }: FigmaUrlInputProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Figma Frame URLs</h3>
      <p className="text-[10px] text-gray-400 mb-3">
        One URL per line. Right-click a frame in Figma and select &ldquo;Copy link&rdquo;.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'https://www.figma.com/design/abc123/My-Design?node-id=1-2\nhttps://www.figma.com/design/abc123/My-Design?node-id=3-4'}
        rows={6}
        className="w-full px-3 py-2 text-xs font-mono border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 resize-none"
      />

      {parsedUrls.length > 0 && (
        <div className="mt-3 space-y-1">
          {parsedUrls.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={`flex-shrink-0 ${p.valid ? 'text-green-500' : 'text-red-400'}`}>
                {p.valid ? '\u2713' : '\u2717'}
              </span>
              {p.valid ? (
                <span className="text-gray-500 truncate">
                  File: <code className="text-[10px]">{p.fileKey}</code> Node: <code className="text-[10px]">{p.nodeId}</code>
                </span>
              ) : (
                <span className="text-red-400 truncate">Invalid Figma URL</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Hook that parses Figma URLs from multi-line text input */
export function useFigmaUrls(urlText: string) {
  const parsedUrls = useMemo(() => {
    const lines = urlText.split('\n').map(l => l.trim()).filter(Boolean)
    return lines.map(parseFigmaUrl)
  }, [urlText])

  const validUrls = useMemo(() => parsedUrls.filter(p => p.valid), [parsedUrls])

  return { parsedUrls, validUrls }
}
