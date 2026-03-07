'use client'

import { useState, useEffect } from 'react'
import type { FontFamily, SystemFont, FontWeight } from '@/lib/fonts/font-scanner'

interface FontsData {
  customFonts: FontFamily[]
  systemFonts: SystemFont[]
}

const WEIGHT_LABELS: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
}

const PREVIEW_TEXT = 'The quick brown fox jumps over the lazy dog'

export function FontsClient() {
  const [data, setData] = useState<FontsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/arena/fonts')
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => setError('Failed to load fonts'))
  }, [])

  // Inject @font-face for all custom fonts
  useEffect(() => {
    if (!data?.customFonts.length) return

    const css = data.customFonts
      .flatMap((family) =>
        family.files.map(
          (file) =>
            `@font-face { font-family: "__arena_preview_${family.name}"; src: url(${file.path}) format("${file.format}"); font-weight: ${file.weight}; font-style: ${file.style}; font-display: swap; }`
        )
      )
      .join('\n')

    const style = document.createElement('style')
    style.setAttribute('data-arena-font-previews', '')
    style.textContent = css
    document.head.appendChild(style)
    return () => {
      style.remove()
    }
  }, [data])

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-sm text-slate-400 dark:text-slate-500 py-8 text-center">
        Loading fonts...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Custom Fonts */}
      {data.customFonts.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Custom Fonts ({data.customFonts.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.customFonts.map((family) => (
              <FontFamilyCard key={family.name} family={family} />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">No custom fonts found.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Add font folders to <code className="text-xs">public/fonts/arena/</code>
          </p>
        </div>
      )}

      {/* System Fonts */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          System Fonts ({data.systemFonts.length})
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.systemFonts.map((font) => (
            <SystemFontCard key={font.name} font={font} />
          ))}
        </div>
      </div>
    </div>
  )
}

function FontFamilyCard({ family }: { family: FontFamily }) {
  const fontFamily = `"__arena_preview_${family.name}", system-ui, sans-serif`
  const weightRange =
    family.availableWeights.length > 1
      ? `${family.availableWeights[0]}\u2013${family.availableWeights[family.availableWeights.length - 1]}`
      : String(family.availableWeights[0])

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {family.displayName}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {family.files.length} file{family.files.length !== 1 ? 's' : ''} &middot; {weightRange}
            {family.hasItalic && ' \u00B7 italic'}
          </p>
        </div>
      </div>

      {/* Preview at multiple sizes */}
      <div className="space-y-2" style={{ fontFamily }}>
        <p className="text-2xl text-slate-800 dark:text-slate-200 leading-tight truncate">
          {PREVIEW_TEXT}
        </p>
        <p className="text-base text-slate-700 dark:text-slate-300 leading-snug truncate">
          {PREVIEW_TEXT}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{PREVIEW_TEXT}</p>
      </div>

      {/* Weight specimens */}
      <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-1">
        {family.availableWeights.map((weight: FontWeight) => (
          <p
            key={weight}
            className="text-sm text-slate-700 dark:text-slate-300 truncate"
            style={{ fontFamily, fontWeight: weight }}
          >
            {WEIGHT_LABELS[weight] ?? weight} ({weight})
            <span className="ml-2 text-slate-400 dark:text-slate-500">&mdash;</span>
            <span className="ml-2">{PREVIEW_TEXT.slice(0, 32)}</span>
          </p>
        ))}
      </div>
    </div>
  )
}

function SystemFontCard({ font }: { font: SystemFont }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {font.displayName}
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono truncate">
          {font.stack}
        </p>
      </div>
      <div className="space-y-1" style={{ fontFamily: font.stack }}>
        <p className="text-2xl text-slate-800 dark:text-slate-200 leading-tight truncate">
          {PREVIEW_TEXT}
        </p>
        <p className="text-base text-slate-700 dark:text-slate-300 leading-snug truncate">
          {PREVIEW_TEXT}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{PREVIEW_TEXT}</p>
      </div>
    </div>
  )
}
