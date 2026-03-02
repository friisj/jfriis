'use client'

import { useState } from 'react'
import type { ExtractedTokens } from '@/lib/studio/arena/figma-extractor'

interface ExtractedTokensPanelProps {
  tokens: ExtractedTokens
}

export function ExtractedTokensPanel({ tokens }: ExtractedTokensPanelProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Raw Extracted Data</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {tokens.colors.length} colors, {tokens.fonts.length} fonts, {tokens.spacing.length} spacing values
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <div>
            <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Colors ({tokens.colors.length})</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tokens.colors.slice(0, 18).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-5 h-5 rounded border border-gray-200 dark:border-gray-700 flex-shrink-0"
                    style={{ backgroundColor: c.hex }}
                  />
                  <div className="min-w-0">
                    <code className="text-[10px]">{c.hex}</code>
                    <span className="text-gray-400 ml-1">({c.count}x, {c.usage})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Fonts ({tokens.fonts.length})</h4>
            <div className="space-y-1">
              {tokens.fonts.slice(0, 10).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    {f.family} {f.size}px w{f.weight}
                  </code>
                  <span className="text-gray-400">({f.count}x)</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Spacing ({tokens.spacing.length})</h4>
            <div className="space-y-1">
              {tokens.spacing.slice(0, 10).map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 w-24">{s.type}:</span>
                  <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">{s.value}px</code>
                  <span className="text-gray-400">({s.count}x)</span>
                </div>
              ))}
            </div>
          </div>

          {tokens.frameNames.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Frames</h4>
              <p className="text-xs text-gray-400">{tokens.frameNames.join(', ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
