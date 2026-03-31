'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { EditorView } from '@codemirror/view'

export type EditorSettings = {
  isAutoCompletionEnabled: boolean
  isTooltipEnabled: boolean
  isLineNumbersDisplayed: boolean
  isLineWrappingEnabled: boolean
  isBracketMatchingEnabled: boolean
  isFlashEnabled: boolean
  isPatternHighlightingEnabled: boolean
  theme: string
  fontSize: number
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  isAutoCompletionEnabled: true,
  isTooltipEnabled: true,
  isLineNumbersDisplayed: true,
  isLineWrappingEnabled: false,
  isBracketMatchingEnabled: false,
  isFlashEnabled: true,
  isPatternHighlightingEnabled: true,
  theme: 'strudelTheme',
  fontSize: 18,
}

type Widget = {
  type: string
  from: number
  to: number
  value: string
  min?: number
  max?: number
  step?: number
}

type StrudelEditorProps = {
  code: string
  onChange: (code: string) => void
  onEvaluate: () => void
  onStop: () => void
  miniLocations?: number[][]
  widgets?: Widget[]
  settings?: EditorSettings
  onViewReady?: (view: EditorView) => void
}

export function StrudelEditor({
  code,
  onChange,
  onEvaluate,
  onStop,
  miniLocations,
  widgets,
  settings,
  onViewReady,
}: StrudelEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const cmRef = useRef<Awaited<typeof import('@strudel/codemirror')> | null>(null)
  const callbacksRef = useRef({ onEvaluate, onStop, onChange })

  useEffect(() => {
    callbacksRef.current = { onEvaluate, onStop, onChange }
  }, [onEvaluate, onStop, onChange])

  useEffect(() => {
    if (!containerRef.current) return

    let disposed = false
    let view: EditorView | null = null

    async function mount() {
      const cm = await import('@strudel/codemirror')

      if (disposed || !containerRef.current) return

      view = cm.initEditor({
        initialCode: code,
        root: containerRef.current,
        onChange: (update: unknown) => {
          const u = update as { docChanged?: boolean; state?: { doc?: { toString: () => string } } }
          if (u.docChanged) {
            const newCode = u.state?.doc?.toString() ?? ''
            callbacksRef.current.onChange(newCode)
          }
        },
        onEvaluate: () => {
          if (view) cm.flash(view)
          callbacksRef.current.onEvaluate()
        },
        onStop: () => {
          callbacksRef.current.onStop()
        },
      })

      if (disposed) {
        view.destroy()
        return
      }

      viewRef.current = view
      cmRef.current = cm
      onViewReady?.(view)

      // Apply initial settings overrides (initEditor uses codemirrorSettings defaults)
      if (settings) {
        applySettings(view, cm, settings)
      }
    }

    mount()

    return () => {
      disposed = true
      view?.destroy()
      viewRef.current = null
      // Remove any leftover .cm-editor DOM from the container
      if (containerRef.current) {
        containerRef.current.querySelectorAll('.cm-editor').forEach((el) => el.remove())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply settings changes
  useEffect(() => {
    const view = viewRef.current
    const cm = cmRef.current
    if (!view || !cm || !settings) return
    applySettings(view, cm, settings)
  }, [settings])

  // Sync mini locations (pattern highlighting)
  useEffect(() => {
    const view = viewRef.current
    const cm = cmRef.current
    if (!view || !cm || !miniLocations) return
    cm.updateMiniLocations(view, miniLocations)
  }, [miniLocations])

  // Sync widgets (sliders + custom)
  useEffect(() => {
    const view = viewRef.current
    const cm = cmRef.current
    if (!view || !cm || !widgets) return
    const sliders = widgets.filter((w) => w.type === 'slider')
    const others = widgets.filter((w) => w.type !== 'slider')
    if (sliders.length) cm.updateSliderWidgets(view, sliders)
    if (others.length) cm.updateWidgets(view, others)
  }, [widgets])

  // Sync external code changes
  const lastExternalCode = useRef(code)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentDoc = view.state.doc.toString()
    if (code !== currentDoc && code !== lastExternalCode.current) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: code },
      })
    }
    lastExternalCode.current = code
  }, [code])

  return (
    <div
      ref={containerRef}
      className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:!overflow-auto"
    />
  )
}

function applySettings(
  view: EditorView,
  cm: Awaited<typeof import('@strudel/codemirror')>,
  settings: EditorSettings,
) {
  const { compartments, extensions, activateTheme } = cm

  for (const [key, value] of Object.entries(settings)) {
    if (key === 'fontSize' || key === 'fontFamily') continue
    if (key === 'theme') {
      view.dispatch({
        effects: compartments[key].reconfigure(extensions[key](value as string)),
      })
      activateTheme(value as string)
    } else if (key in compartments && key in extensions) {
      view.dispatch({
        effects: compartments[key].reconfigure(extensions[key](value as boolean)),
      })
    }
  }

  // Font size via container style
  const container = view.dom.parentElement
  if (container && settings.fontSize) {
    container.style.fontSize = settings.fontSize + 'px'
  }
}
