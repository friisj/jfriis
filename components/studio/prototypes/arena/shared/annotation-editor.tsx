'use client'

/**
 * Annotation Editor — contentEditable with inline grab pills
 *
 * Renders a rich-text editor where users type free text and insert
 * non-editable "pill" spans representing grabbed React elements.
 * Serializes to AnnotationSegment[] for structured AI consumption.
 */

import { useRef, useCallback, useImperativeHandle, forwardRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import type { DebonoHatKey } from '@/lib/studio/arena/debono-hats'
import { DEBONO_HATS } from '@/lib/studio/arena/debono-hats'
import type { GrabSegment, AnnotationSegment } from '@/lib/studio/arena/types'

// ---------------------------------------------------------------------------
// Public API (imperative handle)
// ---------------------------------------------------------------------------

export interface AnnotationEditorHandle {
  insertGrabPill: (seg: GrabSegment) => void
  appendTranscription: (text: string) => void
}

export interface AnnotationEditorProps {
  hatKey: DebonoHatKey
  onHatChange: (key: DebonoHatKey) => void
  onSegmentsChange: (segments: AnnotationSegment[]) => void
  isGrabActive: boolean
  onToggleGrab: () => void
  isRecording: boolean
  isTranscribing: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onDone: () => void
  onCancel: () => void
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

const PILL_ATTR = 'data-grab-segment'

function serializeEditor(editor: HTMLDivElement): AnnotationSegment[] {
  const segments: AnnotationSegment[] = []

  for (const node of Array.from(editor.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.textContent ?? ''
      if (value) segments.push({ type: 'text', value })
    } else if (node instanceof HTMLElement && node.hasAttribute(PILL_ATTR)) {
      segments.push({
        type: 'grab',
        componentName: node.dataset.componentName ?? '',
        filePath: node.dataset.filePath || null,
        lineNumber: node.dataset.lineNumber ? Number(node.dataset.lineNumber) : null,
        displayName: node.dataset.displayName ?? '',
        elementTag: node.dataset.elementTag ?? 'div',
      })
    } else if (node instanceof HTMLElement) {
      // Collapsed block element (e.g. <br>) — skip, or extract text
      const text = node.textContent ?? ''
      if (text) segments.push({ type: 'text', value: text })
    }
  }

  return segments
}

function createPillElement(seg: GrabSegment): HTMLSpanElement {
  const pill = document.createElement('span')
  pill.contentEditable = 'false'
  pill.setAttribute(PILL_ATTR, 'true')
  pill.dataset.componentName = seg.componentName
  if (seg.filePath) pill.dataset.filePath = seg.filePath
  if (seg.lineNumber != null) pill.dataset.lineNumber = String(seg.lineNumber)
  pill.dataset.displayName = seg.displayName
  pill.dataset.elementTag = seg.elementTag
  pill.className =
    'inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-full text-[11px] font-medium ' +
    'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 ' +
    'border border-purple-200 dark:border-purple-700 select-none cursor-default align-baseline'
  pill.textContent = `@ ${seg.displayName}`
  return pill
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AnnotationEditor = forwardRef<AnnotationEditorHandle, AnnotationEditorProps>(
  function AnnotationEditor(
    {
      hatKey,
      onHatChange,
      onSegmentsChange,
      isGrabActive,
      onToggleGrab,
      isRecording,
      isTranscribing,
      onStartRecording,
      onStopRecording,
      onDone,
      onCancel,
    },
    ref,
  ) {
    const editorRef = useRef<HTMLDivElement>(null)

    const emitSegments = useCallback(() => {
      if (editorRef.current) {
        onSegmentsChange(serializeEditor(editorRef.current))
      }
    }, [onSegmentsChange])

    // Imperative handle for parent to insert pills / append transcription
    useImperativeHandle(ref, () => ({
      insertGrabPill(seg: GrabSegment) {
        const editor = editorRef.current
        if (!editor) return

        const pill = createPillElement(seg)
        const sel = window.getSelection()

        // If the selection is inside our editor, insert at cursor
        if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
          const range = sel.getRangeAt(0)
          range.deleteContents()
          range.insertNode(pill)
          // Move cursor after the pill
          range.setStartAfter(pill)
          range.collapse(true)
          sel.removeAllRanges()
          sel.addRange(range)
        } else {
          // Fallback: append at end
          editor.appendChild(pill)
        }

        // Add a trailing space so cursor has somewhere to go
        const space = document.createTextNode('\u00A0')
        pill.after(space)

        emitSegments()
      },

      appendTranscription(text: string) {
        const editor = editorRef.current
        if (!editor) return

        // Add space separator if editor already has content
        const existing = editor.textContent ?? ''
        const separator = existing.length > 0 && !existing.endsWith(' ') ? ' ' : ''
        editor.appendChild(document.createTextNode(separator + text))
        emitSegments()
      },
    }))

    const handlePaste = useCallback((e: ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      document.execCommand('insertText', false, text)
    }, [])

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault() // single-line editor
      }
    }, [])

    const activeHat = DEBONO_HATS.find(h => h.key === hatKey)!
    const hasGrabApi = typeof window !== 'undefined' && !!window.__REACT_GRAB__

    return (
      <div className="mt-4 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
        {/* Hat selector */}
        <div className="flex flex-wrap gap-1.5">
          {DEBONO_HATS.map(hat => (
            <button
              key={hat.key}
              onClick={() => onHatChange(hat.key)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                hatKey === hat.key
                  ? `${hat.bgColor} ${hat.borderColor} ${hat.color}`
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span>{hat.emoji}</span>
              <span>{hat.label.replace(' Hat', '')}</span>
            </button>
          ))}
        </div>

        {/* contentEditable editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitSegments}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          data-placeholder={activeHat.placeholder}
          className={
            'min-h-[2.5rem] px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg ' +
            'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 ' +
            'focus:outline-none focus:ring-1 focus:ring-purple-400 ' +
            'empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none'
          }
        />

        {/* Action bar */}
        <div className="flex items-center gap-2">
          {hasGrabApi && (
            <button
              onClick={onToggleGrab}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isGrabActive
                  ? 'border-purple-400 dark:border-purple-600 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              {'\u2316'} {isGrabActive ? 'Grabbing...' : 'Grab Element'}
            </button>
          )}

          {!isRecording ? (
            <button
              onClick={onStartRecording}
              disabled={isTranscribing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {'\uD83C\uDFA4'} Record Voice
            </button>
          ) : (
            <button
              onClick={onStopRecording}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Stop Recording
            </button>
          )}

          {isTranscribing && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
              Transcribing...
            </span>
          )}

          <div className="flex-1" />

          <button
            onClick={onDone}
            disabled={isRecording || isTranscribing}
            className="px-4 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            Done
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  },
)
