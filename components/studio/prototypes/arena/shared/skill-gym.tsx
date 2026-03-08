'use client'

/**
 * Arena Skill Gym — Shared Component
 *
 * Self-contained gym for iterative skill refinement via structured feedback.
 * Used by figma-import-spike (inline after import) and skill-gym-spike (standalone).
 *
 * Flow: Gym (per-decision feedback) → Refining (AI call) → Review (diff + accept/reject)
 *       Accept loops back to Gym with updated skill and incremented round.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { SkillState, SkillDecision, ArenaAnnotation, ArenaReference, AnnotationSegment, TokenMap, ProjectTheme } from '@/lib/studio/arena/types'
import { resolveRenderTokens } from '@/lib/studio/arena/types'
import { DEBONO_HATS } from '@/lib/studio/arena/debono-hats'
import type { DebonoHatKey } from '@/lib/studio/arena/debono-hats'
import { CanonicalCard, CanonicalForm, CanonicalDashboard } from './canonical-components'
import { AnnotationEditor } from './annotation-editor'
import type { AnnotationEditorHandle } from './annotation-editor'
import { registerArenaGrabPlugin } from '@/lib/studio/arena/react-grab-plugin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GymPhase = 'gym' | 'refining' | 'review'

type FeedbackAction = 'approve' | 'adjust' | 'flag'

export interface GymFeedbackItem {
  dimension: string
  label: string
  action: FeedbackAction
  newValue?: string
  reason?: string
}

export interface GymRoundData {
  feedback: GymFeedbackItem[]
  annotations: ArenaAnnotation[]
  notes: string
  theme_updates?: Record<string, TokenMap>
  references?: ArenaReference[]
}

export interface CanvasTabDef {
  key: string
  label: string
  Component: React.ComponentType<{ skill: SkillState; label: string; fontOverrides?: { display?: string; body?: string; mono?: string }; theme?: ProjectTheme }>
}

export interface SkillGymProps {
  /** Current skill to refine */
  skill: SkillState
  /** Called when user accepts a refinement — parent should update its skill state */
  onSkillUpdate: (refined: SkillState, roundData: GymRoundData) => void
  /** Back to previous view */
  onBack: () => void
  /** Optional font overrides for canonical rendering */
  fontOverrides?: { display?: string; body?: string; mono?: string }
  /** When set, only show decisions for this dimension */
  targetDimension?: string | null
  /** Custom test components to show in canvas tabs (falls back to defaults) */
  testComponents?: CanvasTabDef[]
  /** Optional theme tokens — when present, canonical components render from theme (theme wins over skill values) */
  theme?: ProjectTheme
}

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

function feedbackKey(dim: string, label: string) {
  return `${dim}:${label}`
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(value)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ColorSwatch({ hex }: { hex: string }) {
  return (
    <div
      className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0"
      style={{ backgroundColor: hex }}
    />
  )
}

function DecisionRow({
  decision,
  dimension,
  feedback,
  onFeedback,
  themeValue,
}: {
  decision: SkillDecision
  dimension: string
  feedback: GymFeedbackItem | undefined
  onFeedback: (item: GymFeedbackItem | null) => void
  /** Token value from the theme layer (if available) */
  themeValue?: string
}) {
  // Display value: theme token takes precedence, then decision.value (legacy), then absent
  const displayValue = themeValue ?? decision.value
  const hasValue = displayValue != null

  const [editValue, setEditValue] = useState(feedback?.newValue ?? displayValue ?? '')
  const [editReason, setEditReason] = useState(feedback?.reason ?? '')
  const [mode, setMode] = useState<'view' | 'adjust' | 'flag'>(
    feedback?.action === 'adjust' ? 'adjust' : feedback?.action === 'flag' ? 'flag' : 'view'
  )

  const isColor = dimension === 'color' && hasValue && isHexColor(displayValue!)

  const handleApprove = () => {
    setMode('view')
    onFeedback({ dimension, label: decision.label, action: 'approve' })
  }

  const handleStartAdjust = () => {
    setMode('adjust')
    setEditValue(displayValue ?? '')
  }

  const handleConfirmAdjust = () => {
    if (editValue.trim() && editValue !== displayValue) {
      onFeedback({ dimension, label: decision.label, action: 'adjust', newValue: editValue.trim(), reason: editReason || undefined })
      setMode('view')
    }
  }

  const handleStartFlag = () => {
    setMode('flag')
    setEditReason('')
  }

  const handleConfirmFlag = () => {
    if (editReason.trim()) {
      onFeedback({ dimension, label: decision.label, action: 'flag', reason: editReason.trim() })
      setMode('view')
    }
  }

  const handleClear = () => {
    setMode('view')
    setEditValue(displayValue ?? '')
    setEditReason('')
    onFeedback(null)
  }

  const actionColor = feedback?.action === 'approve'
    ? 'text-green-600 dark:text-green-400'
    : feedback?.action === 'adjust'
    ? 'text-blue-600 dark:text-blue-400'
    : feedback?.action === 'flag'
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-gray-400'

  return (
    <div className="py-2 px-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
      {/* Main row */}
      <div className="flex items-center gap-2">
        <span className={`text-xs flex-shrink-0 w-4 text-center ${actionColor}`}>
          {feedback?.action === 'approve' ? '\u2713' : feedback?.action === 'adjust' ? '\u270E' : feedback?.action === 'flag' ? '\u2691' : '\u2022'}
        </span>

        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-28 flex-shrink-0">{decision.label}</span>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {hasValue ? (
            <>
              {isColor && <ColorSwatch hex={displayValue!} />}
              <code className="text-[11px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate">
                {displayValue}
              </code>
            </>
          ) : (
            <span className="text-[11px] text-gray-400 italic">no token</span>
          )}
          {feedback?.action === 'adjust' && feedback.newValue && (
            <>
              <span className="text-gray-400 text-xs">{'\u2192'}</span>
              {isColor && <ColorSwatch hex={feedback.newValue} />}
              <code className="text-[11px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded truncate">
                {feedback.newValue}
              </code>
            </>
          )}
          <span className="text-[10px] text-gray-400">[{decision.confidence}]</span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleApprove}
            className={`p-1 rounded text-xs transition-colors ${feedback?.action === 'approve' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-400 hover:text-green-600'}`}
            title="Approve"
          >
            {'\u2713'}
          </button>
          <button
            onClick={handleStartAdjust}
            className={`p-1 rounded text-xs transition-colors ${feedback?.action === 'adjust' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-600'}`}
            title="Adjust value"
          >
            {'\u270E'}
          </button>
          <button
            onClick={handleStartFlag}
            className={`p-1 rounded text-xs transition-colors ${feedback?.action === 'flag' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-400 hover:text-amber-600'}`}
            title="Flag for AI review"
          >
            {'\u2691'}
          </button>
          {feedback && (
            <button
              onClick={handleClear}
              className="p-1 rounded text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Clear feedback"
            >
              {'\u2717'}
            </button>
          )}
        </div>
      </div>

      {/* Intent (qualitative design philosophy) */}
      {decision.intent && (
        <p className="mt-1 ml-6 text-[10px] text-gray-400 dark:text-gray-500 italic leading-relaxed">
          {decision.intent}
        </p>
      )}

      {/* Inline adjust editor */}
      {mode === 'adjust' && !feedback?.action && (
        <div className="mt-2 ml-6 flex items-center gap-2">
          <input
            type={isColor ? 'color' : 'text'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-900 flex-1"
            autoFocus
          />
          <input
            type="text"
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            placeholder="Reason (optional)"
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-900 flex-1"
          />
          <button onClick={handleConfirmAdjust} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
            Set
          </button>
          <button onClick={handleClear} className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        </div>
      )}

      {/* Inline flag editor */}
      {mode === 'flag' && !feedback?.action && (
        <div className="mt-2 ml-6 flex items-center gap-2">
          <input
            type="text"
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            placeholder="What's wrong with this value?"
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-900 flex-1"
            autoFocus
          />
          <button onClick={handleConfirmFlag} disabled={!editReason.trim()} className="text-xs px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
            Flag
          </button>
          <button onClick={handleClear} className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

function ChangeDiffList({ previous, refined, themeUpdates }: { previous: SkillState; refined: SkillState; themeUpdates?: Record<string, TokenMap> }) {
  const intentChanges: { dim: string; label: string; oldIntent: string; newIntent: string }[] = []
  const tokenChanges: { dim: string; label: string; oldVal: string; newVal: string }[] = []

  // Detect intent changes between previous and refined skill
  for (const dim of Object.keys(refined)) {
    if (!refined[dim]?.decisions) continue
    for (const rd of refined[dim].decisions) {
      const pd = previous[dim]?.decisions?.find(d => d.label === rd.label)
      if (pd && pd.intent !== rd.intent && rd.intent) {
        intentChanges.push({ dim, label: rd.label, oldIntent: pd.intent ?? '', newIntent: rd.intent })
      }
    }
  }

  // Detect token changes from theme_updates
  if (themeUpdates) {
    for (const [dim, tokens] of Object.entries(themeUpdates)) {
      for (const [label, newVal] of Object.entries(tokens)) {
        tokenChanges.push({ dim, label, oldVal: '', newVal })
      }
    }
  }

  if (intentChanges.length === 0 && tokenChanges.length === 0) {
    return <p className="text-xs text-gray-400 italic">No changes from previous skill.</p>
  }

  return (
    <div className="space-y-2">
      {tokenChanges.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Token Corrections</span>
          {tokenChanges.map((ch, i) => (
            <div key={`t-${i}`} className="flex items-center gap-2 text-xs">
              <span className="text-amber-500 flex-shrink-0">{'\u0394'}</span>
              <span className="text-gray-500 w-16 capitalize">{ch.dim}</span>
              <span className="font-medium text-gray-600 dark:text-gray-400 w-28">{ch.label}</span>
              <div className="flex items-center gap-1">
                {isHexColor(ch.newVal) && <ColorSwatch hex={ch.newVal} />}
                <code className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1 rounded">{ch.newVal}</code>
              </div>
            </div>
          ))}
        </div>
      )}
      {intentChanges.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Intent Refinements</span>
          {intentChanges.map((ch, i) => (
            <div key={`i-${i}`} className="text-xs space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-blue-500 flex-shrink-0">{'\u270E'}</span>
                <span className="text-gray-500 w-16 capitalize">{ch.dim}</span>
                <span className="font-medium text-gray-600 dark:text-gray-400">{ch.label}</span>
              </div>
              <p className="ml-6 text-[10px] text-gray-500 dark:text-gray-400 italic">{ch.newIntent}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AnnotationQueue({ annotations, onRemove }: {
  annotations: ArenaAnnotation[]
  onRemove: (id: string) => void
}) {
  if (annotations.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-gray-400">No annotations yet. Click &quot;+ New Annotation&quot; to start.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {annotations.map(ann => {
        const hat = DEBONO_HATS.find(h => h.key === ann.hatKey)
        return (
          <div key={ann.id} className={`flex items-start gap-3 py-2.5 px-3 rounded-lg border ${hat?.borderColor ?? 'border-gray-100'} ${hat?.bgColor ?? ''}`}>
            <span className="text-base flex-shrink-0 mt-0.5" title={hat?.label}>{hat?.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">
                {ann.segments.map((seg, i) =>
                  seg.type === 'text' ? (
                    <span key={i}>{seg.value}</span>
                  ) : (
                    <span
                      key={i}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-full text-[11px] font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 align-baseline"
                    >
                      @ {seg.displayName}
                    </span>
                  )
                )}
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5 block">{hat?.label}</span>
            </div>
            <button
              onClick={() => onRemove(ann.id)}
              className="p-1 rounded text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
              title="Remove annotation"
            >
              {'\u2717'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reference Editor (inline)
// ---------------------------------------------------------------------------

function ReferenceEditor({ references, onChange }: {
  references: ArenaReference[]
  onChange: (refs: ArenaReference[]) => void
}) {
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFigmaReference = useCallback(async (url: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/arena/figma-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch Figma screenshot')
      const ref: ArenaReference = {
        id: `ref_${Date.now()}`,
        type: 'figma',
        url,
        imageUrl: data.imageUrl,
        label: '',
        figmaNodeName: data.nodeName,
      }
      onChange([...references, ref])
    } catch (err) {
      console.error('Figma reference failed:', err)
    } finally {
      setLoading(false)
      setInputValue('')
    }
  }, [references, onChange])

  const addImageReference = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const ref: ArenaReference = {
        id: `ref_${Date.now()}`,
        type: 'image',
        url: dataUrl,
        label: '',
      }
      onChange([...references, ref])
    }
    reader.readAsDataURL(file)
  }, [references, onChange])

  const handleAddUrl = useCallback(() => {
    const url = inputValue.trim()
    if (!url) return
    if (url.includes('figma.com')) {
      addFigmaReference(url)
    }
  }, [inputValue, addFigmaReference])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      addImageReference(file)
    }
    e.target.value = ''
  }, [addImageReference])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) addImageReference(file)
        return
      }
    }
  }, [addImageReference])

  const handleRemove = useCallback((id: string) => {
    onChange(references.filter(r => r.id !== id))
  }, [references, onChange])

  const handleLabelChange = useCallback((id: string, label: string) => {
    onChange(references.map(r => r.id === id ? { ...r, label } : r))
  }, [references, onChange])

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Reference Images
      </h3>
      <p className="text-xs text-gray-400">
        Paste a Figma URL or upload images as &quot;like this&quot; references for the AI.
      </p>

      {/* Add reference controls */}
      <div className="flex gap-2" onPaste={handlePaste}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
          placeholder="Paste a Figma URL..."
          className="flex-1 px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
          disabled={loading}
        />
        <button
          onClick={handleAddUrl}
          disabled={!inputValue.trim().includes('figma.com') || loading}
          className="px-3 py-2 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Loading...' : 'Add'}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
        >
          Upload Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Reference cards */}
      {references.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-xs text-gray-400">No references yet. Paste a Figma URL or upload an image.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {references.map(ref => (
            <div key={ref.id} className="flex gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
              {/* Thumbnail */}
              <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                {(ref.type === 'figma' && ref.imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ref.imageUrl} alt={ref.figmaNodeName ?? 'Figma reference'} className="w-full h-full object-cover" />
                ) : ref.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ref.url} alt="Uploaded reference" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No preview</div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    ref.type === 'figma'
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  }`}>
                    {ref.type === 'figma' ? 'Figma' : 'Image'}
                  </span>
                  {ref.figmaNodeName && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{ref.figmaNodeName}</span>
                  )}
                </div>
                <textarea
                  value={ref.label}
                  onChange={(e) => handleLabelChange(ref.id, e.target.value)}
                  placeholder="Describe what to use from this reference..."
                  rows={2}
                  className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 resize-none"
                />
              </div>

              {/* Remove */}
              <button
                onClick={() => handleRemove(ref.id)}
                className="p-1 rounded text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0 self-start"
                title="Remove reference"
              >
                {'\u2717'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main SkillGym component
// ---------------------------------------------------------------------------

export function SkillGym({ skill, onSkillUpdate, onBack, fontOverrides, targetDimension, testComponents, theme }: SkillGymProps) {
  const [phase, setPhase] = useState<GymPhase>('gym')
  const [roundCount, setRoundCount] = useState(0)
  const [feedbackMap, setFeedbackMap] = useState<Record<string, GymFeedbackItem>>({})
  const [notes, setNotes] = useState('')
  const [previousSkill, setPreviousSkill] = useState<SkillState | null>(null)
  const [refinedSkill, setRefinedSkill] = useState<SkillState | null>(null)
  const [refineSummary, setRefineSummary] = useState('')
  const [refineThemeUpdates, setRefineThemeUpdates] = useState<Record<string, TokenMap> | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  // Annotation state
  const [activeTab, setActiveTab] = useState<'tokens' | 'annotations' | 'references'>('tokens')
  const [annotations, setAnnotations] = useState<ArenaAnnotation[]>([])
  const [references, setReferences] = useState<ArenaReference[]>([])
  const [activeHat, setActiveHat] = useState<DebonoHatKey>('white')
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // Canvas tab — show one canonical component at a time
  const [activeCanvas, setActiveCanvas] = useState<string>('card')

  // Annotation session state (explicit start → editor → optional record → done)
  const [isAnnotating, setIsAnnotating] = useState(false)
  const [currentSegments, setCurrentSegments] = useState<AnnotationSegment[]>([])
  const [isGrabActive, setIsGrabActive] = useState(false)
  const editorRef = useRef<AnnotationEditorHandle>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const visibleDimensions = useMemo(
    () => targetDimension
      ? [targetDimension]
      : Object.keys(skill).filter(d => skill[d]?.decisions?.length > 0),
    [targetDimension, skill]
  )
  const feedbackCount = useMemo(() => {
    return Object.values(feedbackMap).filter(f => visibleDimensions.includes(f.dimension)).length
  }, [feedbackMap, visibleDimensions])
  const decisionCount = useMemo(() => {
    return visibleDimensions.reduce((sum, d) => sum + (skill[d]?.decisions?.length ?? 0), 0)
  }, [skill, visibleDimensions])

  const handleFeedback = useCallback((dim: string, label: string, item: GymFeedbackItem | null) => {
    const key = feedbackKey(dim, label)
    setFeedbackMap(prev => {
      if (item === null) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: item }
    })
  }, [])

  // --- Annotation session lifecycle ---

  const handleStartAnnotation = useCallback(() => {
    setIsAnnotating(true)
    setCurrentSegments([])
  }, [])

  const handleStartRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100)
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }, [])

  const handleStopRecording = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return

    setIsRecording(false)
    setIsTranscribing(true)

    const audioBlob = await new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        mediaRecorder.stream.getTracks().forEach(t => t.stop())
        resolve(blob)
      }
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') mediaRecorder.stop()
      }, 150)
    })

    if (audioBlob.size < 1000) {
      setIsTranscribing(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('audio', new File([audioBlob], 'recording.webm', { type: 'audio/webm' }))
      const res = await fetch('/apps/chalk/api/transcribe-audio', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error(`Transcription API returned ${res.status}`)
      const data = await res.json()
      if (data.transcript) {
        editorRef.current?.appendTranscription(data.transcript)
      }
    } catch (err) {
      console.error('Transcription failed:', err)
    } finally {
      setIsTranscribing(false)
    }
  }, [])

  const handleFinishAnnotation = useCallback(() => {
    const newAnnotation: ArenaAnnotation = {
      id: `ann_${Date.now()}`,
      hatKey: activeHat,
      segments: currentSegments,
      timestamp: Date.now(),
    }

    setAnnotations(prev => [...prev, newAnnotation])
    setIsAnnotating(false)
    setIsGrabActive(false)
    setCurrentSegments([])
  }, [activeHat, currentSegments])

  const handleCancelAnnotation = useCallback(() => {
    // Stop recording if active
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach(t => t.stop())
    }
    setIsAnnotating(false)
    setIsRecording(false)
    setIsTranscribing(false)
    setIsGrabActive(false)
    setCurrentSegments([])
  }, [])

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      const mediaRecorder = mediaRecorderRef.current
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
        mediaRecorder.stream.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  const handleRemoveAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id))
  }, [])

  // React Grab plugin lifecycle
  useEffect(() => {
    if (!isGrabActive) return
    const unregister = registerArenaGrabPlugin({
      containerRef: previewContainerRef,
      onGrab: (segment) => editorRef.current?.insertGrabPill(segment),
    })
    const api = window.__REACT_GRAB__
    api?.activate()
    return () => { unregister(); api?.deactivate() }
  }, [isGrabActive])

  const handleRefine = useCallback(async () => {
    if (feedbackCount === 0 && annotations.length === 0 && references.length === 0) return

    setPhase('refining')
    setError(null)

    // Filter feedback to target dimension when scoped
    const scopedFeedback = targetDimension
      ? Object.values(feedbackMap).filter(f => f.dimension === targetDimension)
      : Object.values(feedbackMap)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'arena-refine-skill',
          input: {
            currentSkill: skill,
            currentThemeTokens: theme ? Object.fromEntries(
              Object.entries(theme).map(([dim, dt]) => [dim, dt.tokens])
            ) : undefined,
            feedback: scopedFeedback,
            annotations: annotations.map(a => ({
              hatKey: a.hatKey,
              segments: a.segments,
            })),
            references: references.map(r => ({
              type: r.type,
              url: r.url,
              imageUrl: r.imageUrl,
              label: r.label,
              figmaNodeName: r.figmaNodeName,
            })),
            notes,
            iterationCount: roundCount,
            targetDimension: targetDimension ?? undefined,
          },
        }),
      })

      const data = await res.json()
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? 'Refinement failed')
      }

      const result = data.data as SkillState & { summary: string; theme_updates?: Record<string, TokenMap> }
      const { summary: resultSummary, theme_updates: resultThemeUpdates, ...refinedDims } = result
      // Merge refined dimensions into the full skill (scoped responses only contain the target dimension)
      const mergedSkill = { ...skill, ...refinedDims }
      setPreviousSkill(skill)
      setRefinedSkill(mergedSkill)
      setRefineSummary(resultSummary)
      setRefineThemeUpdates(resultThemeUpdates)
      setPhase('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setPhase('gym')
    }
  }, [skill, feedbackMap, annotations, references, notes, roundCount, feedbackCount, targetDimension])

  const handleAccept = useCallback(() => {
    if (!refinedSkill) return
    onSkillUpdate(refinedSkill, {
      feedback: Object.values(feedbackMap),
      annotations,
      notes,
      theme_updates: refineThemeUpdates,
      references,
    })
    setPreviousSkill(null)
    setRefinedSkill(null)
    setRefineSummary('')
    setRefineThemeUpdates(undefined)
    setRoundCount(r => r + 1)
    setFeedbackMap({})
    setNotes('')
    setAnnotations([])
    setReferences([])
    setActiveTab('tokens')
    setPhase('gym')
  }, [refinedSkill, onSkillUpdate, feedbackMap, annotations, notes, refineThemeUpdates, references])

  const handleReject = useCallback(() => {
    setRefinedSkill(null)
    setRefineSummary('')
    setPhase('gym')
  }, [])

  const handleExport = useCallback((s: SkillState) => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `skill-gym-round-${roundCount}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [roundCount])

  // Canvas tab definitions — computed before early returns so all phases can reference them
  const DEFAULT_CANVAS_TABS: CanvasTabDef[] = useMemo(() => [
    { key: 'card', label: 'Card', Component: CanonicalCard },
    { key: 'form', label: 'Form', Component: CanonicalForm },
    { key: 'dashboard', label: 'Dashboard', Component: CanonicalDashboard },
  ], [])
  const effectiveTabs = testComponents ?? DEFAULT_CANVAS_TABS

  // -------------------------------------------------------------------------
  // Refining (loading)
  // -------------------------------------------------------------------------

  if (phase === 'refining') {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Refining (round {roundCount + 1})...</p>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Review
  // -------------------------------------------------------------------------

  if (phase === 'review' && previousSkill && refinedSkill) {
    return (
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Review Refinement</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Round {roundCount + 1} — Compare previous and refined skill side by side.
          </p>
        </div>

        {refineSummary && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Refinement Summary</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">{refineSummary}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Changes</h3>
          <ChangeDiffList previous={previousSkill} refined={refinedSkill} themeUpdates={refineThemeUpdates} />
        </div>

        {/* Side-by-side canonical components */}
        {effectiveTabs.map(({ label, Component }) => {
          // Build a theme with refineThemeUpdates merged for the "Refined" preview
          const refinedTheme = theme && refineThemeUpdates
            ? Object.entries(refineThemeUpdates).reduce((acc, [dim, tokens]) => ({
                ...acc,
                [dim]: { ...acc[dim], tokens: { ...acc[dim]?.tokens, ...tokens }, source: acc[dim]?.source ?? 'refinement' },
              }), { ...theme })
            : theme
          return (
            <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{label}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Component skill={previousSkill} label="Previous" fontOverrides={fontOverrides} theme={theme} />
                <Component skill={refinedSkill} label="Refined" fontOverrides={fontOverrides} theme={refinedTheme} />
              </div>
            </div>
          )
        })}

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleAccept}
            className="px-8 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors text-sm"
          >
            Accept &amp; Continue
          </button>
          <button
            onClick={handleReject}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            Reject
          </button>
          <button
            onClick={() => handleExport(refinedSkill)}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            Export JSON
          </button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Gym
  // -------------------------------------------------------------------------

  const activeCanvasTab = effectiveTabs.find(t => t.key === activeCanvas) ?? effectiveTabs[0]
  const canonicalPreview = (
    <activeCanvasTab.Component skill={skill} label={activeCanvasTab.label} fontOverrides={fontOverrides} theme={theme} />
  )

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Skill Gym</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Round {roundCount + 1} — Review each decision: approve, adjust, or flag for AI review.
          </p>
        </div>
        <button
          onClick={handleRefine}
          disabled={feedbackCount === 0 && annotations.length === 0 && references.length === 0}
          className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm flex-shrink-0"
        >
          Refine (Round {roundCount + 1})
        </button>
      </div>

      {/* Canonical components preview / annotation canvas */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        {/* Canvas component tabs */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Current Skill Preview</h3>
          <div className="flex gap-1">
            {effectiveTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveCanvas(tab.key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeCanvas === tab.key
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div ref={previewContainerRef}>
          {canonicalPreview}
        </div>

        {/* Annotation editor (below the preview) */}
        {isAnnotating && (
          <AnnotationEditor
            ref={editorRef}
            hatKey={activeHat}
            onHatChange={setActiveHat}
            onSegmentsChange={setCurrentSegments}
            isGrabActive={isGrabActive}
            onToggleGrab={() => setIsGrabActive(g => !g)}
            isRecording={isRecording}
            isTranscribing={isTranscribing}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onDone={handleFinishAnnotation}
            onCancel={handleCancelAnnotation}
          />
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('tokens')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tokens'
              ? 'border-purple-600 text-purple-700 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Tokens
        </button>
        <button
          onClick={() => setActiveTab('annotations')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'annotations'
              ? 'border-purple-600 text-purple-700 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Annotations{annotations.length > 0 ? ` (${annotations.length})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('references')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'references'
              ? 'border-purple-600 text-purple-700 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          References{references.length > 0 ? ` (${references.length})` : ''}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'references' ? (
        <ReferenceEditor references={references} onChange={setReferences} />
      ) : activeTab === 'tokens' ? (
        <>
          {/* Per-dimension feedback sections */}
          {visibleDimensions.map(dim => {
            const state = skill[dim]
            if (state.decisions.length === 0) return null

            const dimFeedbackCount = state.decisions.filter(
              d => feedbackMap[feedbackKey(dim, d.label)]
            ).length

            return (
              <div key={dim} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">{dim}</h3>
                  <span className="text-[10px] text-gray-400">
                    {dimFeedbackCount}/{state.decisions.length} reviewed
                  </span>
                </div>
                <div className="space-y-1">
                  {state.decisions.map(decision => {
                    const resolvedTokens = resolveRenderTokens(skill, theme)
                    const themeVal = resolvedTokens[dim]?.[decision.label]
                    return (
                      <DecisionRow
                        key={decision.id}
                        decision={decision}
                        dimension={dim}
                        feedback={feedbackMap[feedbackKey(dim, decision.label)]}
                        onFeedback={(item) => handleFeedback(dim, decision.label, item)}
                        themeValue={themeVal}
                      />
                    )
                  })}
                </div>

                {state.rules.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Rules</span>
                    <div className="mt-1 space-y-1">
                      {state.rules.map(rule => (
                        <div key={rule.id} className="flex items-start gap-2 text-xs">
                          <span className={`flex-shrink-0 mt-0.5 ${rule.type === 'must-not' ? 'text-red-500' : 'text-blue-500'}`}>
                            {rule.type === 'must-not' ? '!' : '*'}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            <span className="font-medium capitalize">{rule.type}:</span> {rule.statement}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* General notes */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">General Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any overall feedback, style direction, or specific instructions for the refinement..."
              rows={3}
              className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 resize-none"
            />
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Captured Annotations
            </h3>
            {!isAnnotating && (
              <button
                onClick={handleStartAnnotation}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/40 transition-colors"
              >
                + New Annotation
              </button>
            )}
          </div>
          <AnnotationQueue annotations={annotations} onRemove={handleRemoveAnnotation} />
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
        >
          Back to compare
        </button>
        <span className="text-xs text-gray-400">
          {feedbackCount}/{decisionCount} decisions reviewed
          {annotations.length > 0 ? ` + ${annotations.length} annotation${annotations.length !== 1 ? 's' : ''}` : ''}
          {references.length > 0 ? ` + ${references.length} reference${references.length !== 1 ? 's' : ''}` : ''}
        </span>
        <button
          onClick={() => handleExport(skill)}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
        >
          Export current
        </button>
      </div>
    </div>
  )
}
