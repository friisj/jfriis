'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { EditorView } from '@codemirror/view'

type StrudelEditorProps = {
  code: string
  onChange: (code: string) => void
  onEvaluate: () => void
  onStop: () => void
  miniLocations?: number[][]
}

export function StrudelEditor({
  code,
  onChange,
  onEvaluate,
  onStop,
  miniLocations,
}: StrudelEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const callbacksRef = useRef({ onEvaluate, onStop, onChange })

  // Keep callbacks ref current without re-creating the editor
  useEffect(() => {
    callbacksRef.current = { onEvaluate, onStop, onChange }
  }, [onEvaluate, onStop, onChange])

  useEffect(() => {
    if (!containerRef.current) return

    let view: EditorView | null = null

    async function mount() {
      const { initEditor, flash: flashEditor, isFlashEnabled, isPatternHighlightingEnabled } =
        await import('@strudel/codemirror')

      if (!containerRef.current) return

      view = initEditor({
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
          if (view) flashEditor(view)
          callbacksRef.current.onEvaluate()
        },
        onStop: () => {
          callbacksRef.current.onStop()
        },
      })

      viewRef.current = view
    }

    mount()

    return () => {
      view?.destroy()
      viewRef.current = null
    }
    // Only mount once — code updates flow through the ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync mini locations (pattern highlighting) into the editor
  useEffect(() => {
    const view = viewRef.current
    if (!view || !miniLocations) return

    import('@strudel/codemirror').then(({ updateMiniLocations }) => {
      updateMiniLocations(view, miniLocations)
    })
  }, [miniLocations])

  // Sync external code changes into the editor (e.g. loading a saved pattern)
  const lastExternalCode = useRef(code)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    // Only dispatch if the code changed externally (not from typing)
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
