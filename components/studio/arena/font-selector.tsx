'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'

export interface SelectedFont {
  name: string
  displayName: string
  scopedName: string
  files: { path: string; weight: number; style: string; format: string }[]
}

export interface AvailableFonts {
  customFonts: { name: string; displayName: string; files: { path: string; weight: number; style: string; format: string }[] }[]
  systemFonts: { name: string; displayName: string; stack: string }[]
}

interface FontSelectorProps {
  fontDisplay: SelectedFont | null
  fontBody: SelectedFont | null
  fontMono: SelectedFont | null
  onFontChange: (slot: 'display' | 'body' | 'mono', font: SelectedFont | null) => void
  availableFonts: AvailableFonts | null
}

export function FontSelector({ fontDisplay, fontBody, fontMono, onFontChange, availableFonts }: FontSelectorProps) {
  const handleSelect = useCallback((slot: 'display' | 'body' | 'mono', familyName: string) => {
    if (!familyName || !availableFonts) {
      onFontChange(slot, null)
      return
    }
    const family = availableFonts.customFonts.find(f => f.name === familyName)
    if (!family) return
    onFontChange(slot, {
      name: family.name,
      displayName: family.displayName,
      scopedName: `__fi__${family.name}`,
      files: family.files,
    })
  }, [availableFonts, onFontChange])

  const slots = [
    { key: 'display' as const, font: fontDisplay },
    { key: 'body' as const, font: fontBody },
    { key: 'mono' as const, font: fontMono },
  ]

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Fonts</h3>
      <p className="text-[10px] text-gray-400 mb-3">
        Select fonts from <code className="text-[10px]">public/fonts/arena/</code> for canonical component comparisons
      </p>
      <div className="space-y-2">
        {slots.map(({ key, font }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-14 capitalize">{key}:</span>
            <select
              value={font?.name ?? ''}
              onChange={(e) => handleSelect(key, e.target.value)}
              className="flex-1 text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
              style={font ? { fontFamily: `"${font.scopedName}", system-ui, sans-serif` } : undefined}
            >
              <option value="">None</option>
              {availableFonts?.customFonts.map(f => (
                <option key={f.name} value={f.name}>{f.displayName}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {availableFonts && availableFonts.customFonts.length === 0 && (
        <p className="text-[10px] text-gray-400 mt-2">
          No fonts found. Add font folders to <code className="text-[10px]">public/fonts/arena/</code>.
        </p>
      )}
    </div>
  )
}

/** Hook to manage font state, load available fonts, and inject @font-face rules */
export function useArenaFonts() {
  const [availableFonts, setAvailableFonts] = useState<AvailableFonts | null>(null)
  const [fontDisplay, setFontDisplay] = useState<SelectedFont | null>(null)
  const [fontBody, setFontBody] = useState<SelectedFont | null>(null)
  const [fontMono, setFontMono] = useState<SelectedFont | null>(null)

  // Fetch available fonts on mount
  useEffect(() => {
    fetch('/api/arena/fonts')
      .then(res => res.json())
      .then(data => setAvailableFonts(data))
      .catch(err => console.error('Failed to load arena fonts:', err))
  }, [])

  // Inject @font-face rules
  useEffect(() => {
    const fonts = [fontDisplay, fontBody, fontMono].filter(Boolean) as SelectedFont[]
    if (fonts.length === 0) return

    const css = fonts.flatMap(f =>
      f.files.map(file =>
        `@font-face { font-family: "${f.scopedName}"; src: url(${file.path}) format("${file.format}"); font-weight: ${file.weight}; font-style: ${file.style}; font-display: swap; }`
      )
    ).join('\n')
    const style = document.createElement('style')
    style.setAttribute('data-figma-import-fonts', '')
    style.textContent = css
    document.head.appendChild(style)
    return () => { style.remove() }
  }, [fontDisplay, fontBody, fontMono])

  const fontOverrides = useMemo(() => {
    const overrides: { display?: string; body?: string; mono?: string } = {}
    if (fontDisplay) overrides.display = `"${fontDisplay.scopedName}", system-ui, sans-serif`
    if (fontBody) overrides.body = `"${fontBody.scopedName}", system-ui, sans-serif`
    if (fontMono) overrides.mono = `"${fontMono.scopedName}", ui-monospace, monospace`
    return Object.keys(overrides).length > 0 ? overrides : undefined
  }, [fontDisplay, fontBody, fontMono])

  const handleFontChange = useCallback((slot: 'display' | 'body' | 'mono', font: SelectedFont | null) => {
    if (slot === 'display') setFontDisplay(font)
    else if (slot === 'body') setFontBody(font)
    else setFontMono(font)
  }, [])

  return {
    availableFonts,
    fontDisplay,
    fontBody,
    fontMono,
    fontOverrides,
    handleFontChange,
  }
}
