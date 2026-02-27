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
import type { SkillState, SkillDecision, ArenaAnnotation } from '@/lib/studio/arena/types'
import { DEBONO_HATS } from '@/lib/studio/arena/debono-hats'
import type { DebonoHatKey } from '@/lib/studio/arena/debono-hats'
import { CanonicalCard, CanonicalForm, CanonicalDashboard } from './canonical-components'
import { UnifiedAnnotationCanvas } from '@/components/studio/chalk/annotation/UnifiedAnnotationCanvas'
import type { AnnotationType } from '@/components/studio/chalk/annotation/UnifiedAnnotationCanvas'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GymPhase = 'gym' | 'refining' | 'review'

type FeedbackAction = 'approve' | 'adjust' | 'flag'

interface FeedbackItem {
  dimension: 'color' | 'typography' | 'spacing'
  label: string
  action: FeedbackAction
  newValue?: string
  reason?: string
}

export interface SkillGymProps {
  /** Current skill to refine */
  skill: SkillState
  /** Called when user accepts a refinement — parent should update its skill state */
  onSkillUpdate: (refined: SkillState) => void
  /** Back to previous view */
  onBack: () => void
  /** Optional font overrides for canonical rendering */
  fontOverrides?: { display?: string; body?: string; mono?: string }
}

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const DIMENSIONS = ['color', 'typography', 'spacing'] as const

function feedbackKey(dim: string, label: string) {
  return `${dim}:${label}`
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(value)
}

function countDecisions(skill: SkillState): number {
  return DIMENSIONS.reduce((sum, d) => sum + skill[d].decisions.length, 0)
}

/**
 * Capture the full preview (content + annotation marks) as a PNG data URL.
 * Uses html-to-image (SVG foreignObject) instead of html2canvas because
 * html2canvas can't parse Tailwind v4's OKLCH color functions.
 * foreignObject delegates to the browser's native CSS renderer, which handles OKLCH.
 */
async function capturePreview(container: HTMLElement): Promise<string> {
  const { toPng } = await import('html-to-image')
  return toPng(container, {
    backgroundColor: '#f9fafb',
    pixelRatio: 1,
  })
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
}: {
  decision: SkillDecision
  dimension: string
  feedback: FeedbackItem | undefined
  onFeedback: (item: FeedbackItem | null) => void
}) {
  const [editValue, setEditValue] = useState(feedback?.newValue ?? decision.value)
  const [editReason, setEditReason] = useState(feedback?.reason ?? '')
  const [mode, setMode] = useState<'view' | 'adjust' | 'flag'>(
    feedback?.action === 'adjust' ? 'adjust' : feedback?.action === 'flag' ? 'flag' : 'view'
  )

  const dim = dimension as 'color' | 'typography' | 'spacing'
  const isColor = dim === 'color' && isHexColor(decision.value)

  const handleApprove = () => {
    setMode('view')
    onFeedback({ dimension: dim, label: decision.label, action: 'approve' })
  }

  const handleStartAdjust = () => {
    setMode('adjust')
    setEditValue(decision.value)
  }

  const handleConfirmAdjust = () => {
    if (editValue.trim() && editValue !== decision.value) {
      onFeedback({ dimension: dim, label: decision.label, action: 'adjust', newValue: editValue.trim(), reason: editReason || undefined })
      setMode('view')
    }
  }

  const handleStartFlag = () => {
    setMode('flag')
    setEditReason('')
  }

  const handleConfirmFlag = () => {
    if (editReason.trim()) {
      onFeedback({ dimension: dim, label: decision.label, action: 'flag', reason: editReason.trim() })
      setMode('view')
    }
  }

  const handleClear = () => {
    setMode('view')
    setEditValue(decision.value)
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
          {isColor && <ColorSwatch hex={decision.value} />}
          <code className="text-[11px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate">
            {decision.value}
          </code>
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

function ChangeDiffList({ previous, refined }: { previous: SkillState; refined: SkillState }) {
  const changes: { dim: string; label: string; oldVal: string; newVal: string }[] = []

  for (const dim of DIMENSIONS) {
    for (const rd of refined[dim].decisions) {
      const pd = previous[dim].decisions.find(d => d.label === rd.label)
      if (pd && pd.value !== rd.value) {
        changes.push({ dim, label: rd.label, oldVal: pd.value, newVal: rd.value })
      }
    }
  }

  if (changes.length === 0) {
    return <p className="text-xs text-gray-400 italic">No value changes from previous skill.</p>
  }

  return (
    <div className="space-y-1">
      {changes.map((ch, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="text-amber-500 flex-shrink-0">{'\u0394'}</span>
          <span className="text-gray-500 w-16 capitalize">{ch.dim}</span>
          <span className="font-medium text-gray-600 dark:text-gray-400 w-28">{ch.label}</span>
          <div className="flex items-center gap-1">
            {isHexColor(ch.oldVal) && <ColorSwatch hex={ch.oldVal} />}
            <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">{ch.oldVal}</code>
          </div>
          <span className="text-gray-400">{'\u2192'}</span>
          <div className="flex items-center gap-1">
            {isHexColor(ch.newVal) && <ColorSwatch hex={ch.newVal} />}
            <code className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1 rounded">{ch.newVal}</code>
          </div>
        </div>
      ))}
    </div>
  )
}

function AnnotationQueue({ annotations, onRemove, onUpdateTranscript }: {
  annotations: ArenaAnnotation[]
  onRemove: (id: string) => void
  onUpdateTranscript: (id: string, transcript: string) => void
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
            {ann.screenshot && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={ann.screenshot}
                alt={`Annotation ${ann.id}`}
                className="w-16 h-16 object-cover rounded border border-gray-200 dark:border-gray-700 flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <textarea
                value={ann.transcript}
                onChange={(e) => onUpdateTranscript(ann.id, e.target.value)}
                placeholder={hat?.placeholder ?? 'Describe what you see...'}
                rows={2}
                className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white/80 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 resize-none"
              />
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
// Main SkillGym component
// ---------------------------------------------------------------------------

export function SkillGym({ skill, onSkillUpdate, onBack, fontOverrides }: SkillGymProps) {
  const [phase, setPhase] = useState<GymPhase>('gym')
  const [roundCount, setRoundCount] = useState(0)
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackItem>>({})
  const [notes, setNotes] = useState('')
  const [previousSkill, setPreviousSkill] = useState<SkillState | null>(null)
  const [refinedSkill, setRefinedSkill] = useState<SkillState | null>(null)
  const [refineSummary, setRefineSummary] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Annotation state
  const [activeTab, setActiveTab] = useState<'decisions' | 'annotations'>('decisions')
  const [annotations, setAnnotations] = useState<ArenaAnnotation[]>([])
  const [activeHat, setActiveHat] = useState<DebonoHatKey>('white')
  const [annotationTool, setAnnotationTool] = useState<AnnotationType | null>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // Canvas tab — show one canonical component at a time
  const [activeCanvas, setActiveCanvas] = useState<'card' | 'form' | 'dashboard'>('card')

  // Annotation session state (explicit start → markup → optional record → done)
  const [isAnnotating, setIsAnnotating] = useState(false)
  const [canvasKey, setCanvasKey] = useState(0) // increment to reset canvas between annotations
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const feedbackCount = useMemo(() => Object.keys(feedbackMap).length, [feedbackMap])
  const decisionCount = useMemo(() => countDecisions(skill), [skill])
  const activeHatData = useMemo(() => DEBONO_HATS.find(h => h.key === activeHat)!, [activeHat])

  const handleFeedback = useCallback((dim: string, label: string, item: FeedbackItem | null) => {
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
    setAnnotationTool('rectangle')
    setCurrentTranscript('')
    setCanvasKey(k => k + 1) // fresh canvas
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
        setCurrentTranscript(prev => prev ? `${prev} ${data.transcript}` : data.transcript)
      }
    } catch (err) {
      console.error('Transcription failed:', err)
    } finally {
      setIsTranscribing(false)
    }
  }, [])

  const handleFinishAnnotation = useCallback(async () => {
    // Capture screenshot of the annotated preview
    let screenshot = ''
    const container = previewContainerRef.current
    if (container) {
      // Brief delay so the canvas renders any final marks
      await new Promise(r => setTimeout(r, 100))
      try {
        screenshot = await capturePreview(container)
      } catch (err) {
        console.warn('Screenshot capture failed, continuing without image:', err)
      }
    }

    const newAnnotation: ArenaAnnotation = {
      id: `ann_${Date.now()}`,
      hatKey: activeHat,
      screenshot,
      transcript: currentTranscript,
      timestamp: Date.now(),
    }

    setAnnotations(prev => [...prev, newAnnotation])
    setIsAnnotating(false)
    setAnnotationTool(null)
    setCurrentTranscript('')
  }, [activeHat, currentTranscript])

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
    setAnnotationTool(null)
    setCurrentTranscript('')
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

  const handleUpdateTranscript = useCallback((id: string, transcript: string) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, transcript } : a))
  }, [])

  const handleRefine = useCallback(async () => {
    if (feedbackCount === 0 && annotations.length === 0) return

    setPhase('refining')
    setError(null)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'arena-refine-skill',
          input: {
            currentSkill: skill,
            feedback: Object.values(feedbackMap),
            annotations: annotations.map(a => ({
              hatKey: a.hatKey,
              screenshot: a.screenshot,
              transcript: a.transcript,
            })),
            notes,
            iterationCount: roundCount,
            model: annotations.length > 0 ? 'claude-sonnet' : undefined,
          },
        }),
      })

      const data = await res.json()
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? 'Refinement failed')
      }

      const result = data.data as SkillState & { summary: string }
      setPreviousSkill(skill)
      setRefinedSkill({
        color: result.color,
        typography: result.typography,
        spacing: result.spacing,
      })
      setRefineSummary(result.summary)
      setPhase('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setPhase('gym')
    }
  }, [skill, feedbackMap, annotations, notes, roundCount, feedbackCount])

  const handleAccept = useCallback(() => {
    if (!refinedSkill) return
    onSkillUpdate(refinedSkill)
    setPreviousSkill(null)
    setRefinedSkill(null)
    setRefineSummary('')
    setRoundCount(r => r + 1)
    setFeedbackMap({})
    setNotes('')
    setAnnotations([])
    setActiveTab('decisions')
    setPhase('gym')
  }, [refinedSkill, onSkillUpdate])

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

  // -------------------------------------------------------------------------
  // Refining (loading)
  // -------------------------------------------------------------------------

  if (phase === 'refining') {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Refining skill (round {roundCount + 1})...</p>
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
          <ChangeDiffList previous={previousSkill} refined={refinedSkill} />
        </div>

        {/* Side-by-side canonical components */}
        {[
          { label: 'Card', Component: CanonicalCard },
          { label: 'Form', Component: CanonicalForm },
          { label: 'Dashboard', Component: CanonicalDashboard },
        ].map(({ label, Component }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{label}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Component skill={previousSkill} label="Previous" fontOverrides={fontOverrides} />
              <Component skill={refinedSkill} label="Refined" fontOverrides={fontOverrides} />
            </div>
          </div>
        ))}

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

  const CANVAS_TABS = [
    { key: 'card' as const, label: 'Card', Component: CanonicalCard },
    { key: 'form' as const, label: 'Form', Component: CanonicalForm },
    { key: 'dashboard' as const, label: 'Dashboard', Component: CanonicalDashboard },
  ]

  const activeCanvasTab = CANVAS_TABS.find(t => t.key === activeCanvas)!
  const canonicalPreview = (
    <activeCanvasTab.Component skill={skill} label={activeCanvasTab.label} fontOverrides={fontOverrides} />
  )

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Skill Gym</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Round {roundCount + 1} — Review each decision: approve, adjust, or flag for AI review.
        </p>
      </div>

      {/* Canonical components preview / annotation canvas */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        {/* Canvas component tabs */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Current Skill Preview</h3>
          <div className="flex gap-1">
            {CANVAS_TABS.map(tab => (
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

        {/* When annotating: show hat selector + tools + canvas */}
        {isAnnotating && (
          <>
            {/* Hat selector */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {DEBONO_HATS.map(hat => (
                <button
                  key={hat.key}
                  onClick={() => setActiveHat(hat.key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    activeHat === hat.key
                      ? `${hat.bgColor} ${hat.borderColor} ${hat.color}`
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span>{hat.emoji}</span>
                  <span>{hat.label.replace(' Hat', '')}</span>
                </button>
              ))}
            </div>

            {/* Annotation tools */}
            <div className="flex items-center gap-2 mb-3">
              {([
                { tool: 'rectangle' as AnnotationType, label: 'Rectangle', icon: '\u25A1' },
                { tool: 'freehand' as AnnotationType, label: 'Draw', icon: '\u270E' },
                { tool: 'text' as AnnotationType, label: 'Text', icon: 'T' },
              ]).map(({ tool, label, icon }) => (
                <button
                  key={tool}
                  onClick={() => setAnnotationTool(annotationTool === tool ? null : tool)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                    annotationTool === tool
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                  title={label}
                >
                  {icon}
                </button>
              ))}
            </div>
          </>
        )}

        <div ref={previewContainerRef}>
          {isAnnotating ? (
            <UnifiedAnnotationCanvas
              key={canvasKey}
              tool={annotationTool}
              voiceEnabled={false}
              color={activeHatData.hexColor}
            >
              {canonicalPreview}
            </UnifiedAnnotationCanvas>
          ) : (
            canonicalPreview
          )}
        </div>

        {/* Annotation session controls (below the preview) */}
        {isAnnotating && (
          <div className="mt-4 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
            {/* Voice recording */}
            <div className="flex items-center gap-2">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  disabled={isTranscribing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {'\uD83C\uDFA4'} Record Voice
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
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
            </div>

            {/* Transcript editor */}
            <textarea
              value={currentTranscript}
              onChange={(e) => setCurrentTranscript(e.target.value)}
              placeholder={activeHatData.placeholder}
              rows={2}
              className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 resize-none"
            />

            {/* Done / Cancel */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleFinishAnnotation}
                disabled={isRecording || isTranscribing}
                className="px-4 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
              >
                Done
              </button>
              <button
                onClick={handleCancelAnnotation}
                className="px-4 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('decisions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'decisions'
              ? 'border-purple-600 text-purple-700 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Decisions
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
      </div>

      {/* Tab content */}
      {activeTab === 'decisions' ? (
        <>
          {/* Per-dimension feedback sections */}
          {DIMENSIONS.map(dim => {
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
                  {state.decisions.map(decision => (
                    <DecisionRow
                      key={decision.id}
                      decision={decision}
                      dimension={dim}
                      feedback={feedbackMap[feedbackKey(dim, decision.label)]}
                      onFeedback={(item) => handleFeedback(dim, decision.label, item)}
                    />
                  ))}
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
          <AnnotationQueue annotations={annotations} onRemove={handleRemoveAnnotation} onUpdateTranscript={handleUpdateTranscript} />
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
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
          </span>
          <button
            onClick={() => handleExport(skill)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Export current
          </button>
        </div>
        <button
          onClick={handleRefine}
          disabled={feedbackCount === 0 && annotations.length === 0}
          className="px-8 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-sm"
        >
          Refine Skill (Round {roundCount + 1})
        </button>
      </div>
    </div>
  )
}
