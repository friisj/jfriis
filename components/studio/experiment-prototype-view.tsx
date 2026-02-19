'use client'

import { useCallback, useEffect, useOptimistic, useState, useTransition } from 'react'
import { usePrivateHeader } from '@/components/layout/private-header-context'
import { ExperimentStatusSelect } from '@/components/studio/experiment-status-select'
import {
  updateExperimentOutcome,
  updateExperimentLearnings,
} from '@/app/actions/studio'
import { PanelLeftOpen, Minus, EyeOff, Pencil } from 'lucide-react'

type OverlayState = 'expanded' | 'collapsed' | 'hidden'
type ExperimentStatus = 'planned' | 'in_progress' | 'completed' | 'abandoned'
type ExperimentOutcome = 'success' | 'failure' | 'inconclusive' | null

interface ExperimentPrototypeViewProps {
  experiment: {
    id: string
    slug: string
    name: string
    description: string | null
    status: ExperimentStatus
    outcome: ExperimentOutcome
    learnings: string | null
    type: string
    created_at: string
    updated_at: string
  }
  project: { slug: string; name: string }
  hypothesis: { sequence: number; statement: string; validation_criteria: string | null } | null
  children: React.ReactNode
}

const outcomeOptions: { value: ExperimentOutcome; label: string; color: string }[] = [
  { value: null, label: 'Not set', color: 'text-gray-400' },
  { value: 'success', label: 'Success', color: 'text-green-600' },
  { value: 'failure', label: 'Failure', color: 'text-red-600' },
  { value: 'inconclusive', label: 'Inconclusive', color: 'text-yellow-600' },
]

function OutcomeSelect({ experimentId, outcome }: { experimentId: string; outcome: ExperimentOutcome }) {
  const [optimistic, setOptimistic] = useOptimistic(outcome)
  const [, startTransition] = useTransition()

  const current = outcomeOptions.find((o) => o.value === optimistic) ?? outcomeOptions[0]

  return (
    <select
      value={optimistic ?? ''}
      onChange={(e) => {
        const val = e.target.value === '' ? null : (e.target.value as ExperimentOutcome)
        startTransition(async () => {
          setOptimistic(val)
          await updateExperimentOutcome(experimentId, val)
        })
      }}
      className={`text-sm bg-transparent border border-gray-300 rounded px-2 py-1 cursor-pointer ${current.color}`}
    >
      {outcomeOptions.map((o) => (
        <option key={o.value ?? 'null'} value={o.value ?? ''}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function LearningsEditor({ experimentId, learnings }: { experimentId: string; learnings: string | null }) {
  const [value, setValue] = useState(learnings ?? '')
  const [saved, setSaved] = useState(true)
  const [, startTransition] = useTransition()

  function handleBlur() {
    if (value !== (learnings ?? '') && !saved) {
      startTransition(async () => {
        await updateExperimentLearnings(experimentId, value)
        setSaved(true)
      })
    }
  }

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setSaved(false)
        }}
        onBlur={handleBlur}
        placeholder="Record learnings..."
        rows={4}
        className="w-full text-sm bg-transparent border border-gray-300 rounded p-2 resize-y placeholder:text-gray-400"
      />
      {!saved && <span className="text-xs text-gray-400">Unsaved — click away to save</span>}
    </div>
  )
}

export function ExperimentPrototypeView({
  experiment,
  project,
  hypothesis,
  children,
}: ExperimentPrototypeViewProps) {
  const [overlayState, setOverlayState] = useState<OverlayState>('collapsed')
  const { setActions, setHardNavigation } = usePrivateHeader()

  // Force hard navigation (full page load) when leaving prototype pages
  // to avoid slow synchronous WebGL/Physics unmount blocking client-side transitions
  useEffect(() => {
    setHardNavigation(true)
    return () => setHardNavigation(false)
  }, [setHardNavigation])

  const cycleState = useCallback(() => {
    setOverlayState((s) => {
      if (s === 'expanded') return 'collapsed'
      if (s === 'collapsed') return 'hidden'
      return 'expanded'
    })
  }, [])

  // Inject toggle button into header
  useEffect(() => {
    const icon =
      overlayState === 'expanded' ? <PanelLeftOpen className="size-3.5" /> :
      overlayState === 'collapsed' ? <Minus className="size-3.5" /> :
      <EyeOff className="size-3.5" />

    const label =
      overlayState === 'expanded' ? 'Panel' :
      overlayState === 'collapsed' ? 'Bar' :
      'Hidden'

    setActions(
      <div className="flex items-center h-10 border-l border-border divide-x divide-border">
        <button
          onClick={cycleState}
          className="flex items-center gap-1.5 h-10 px-3 text-xs font-medium hover:bg-accent transition-colors"
          title={`Overlay: ${label} (press i to toggle)`}
        >
          {icon}
          <span>{label}</span>
        </button>
      </div>
    )

    return () => setActions(null)
  }, [overlayState, setActions, cycleState])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      if (e.key === 'Escape') {
        setOverlayState('hidden')
      } else if (e.key === 'i') {
        setOverlayState((s) => (s === 'collapsed' ? 'expanded' : 'collapsed'))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="h-[calc(100dvh-2.5rem)] relative overflow-hidden">
      {/* Prototype fills the entire remaining viewport (100dvh minus PrivateHeader h-10/2.5rem) */}
      <div className="absolute inset-0">{children}</div>

      {/* Collapsed bar */}
      {overlayState === 'collapsed' && (
        <div className="absolute top-0 left-0 right-0 pointer-events-none z-10">
          <div className="pointer-events-auto inline-flex items-center gap-3 m-3 px-4 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm">
            <span className="text-sm font-medium">{experiment.name}</span>
            <ExperimentStatusSelect
              experimentId={experiment.id}
              status={experiment.status}
            />
            {experiment.outcome && (
              <span
                className={`text-xs font-bold ${
                  experiment.outcome === 'success'
                    ? 'text-green-600'
                    : experiment.outcome === 'failure'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                }`}
              >
                {experiment.outcome}
              </span>
            )}
            <a
              href={`/admin/experiments/${experiment.id}/edit`}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Edit in admin"
            >
              <Pencil className="size-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Expanded sidebar — header / scrollable body / footer */}
      {overlayState === 'expanded' && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="pointer-events-auto w-[420px] h-full bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-lg flex flex-col">
            {/* Sidebar header */}
            <div className="shrink-0 px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase text-gray-400 font-medium">
                  {experiment.type === 'prototype'
                    ? 'Prototype'
                    : experiment.type === 'discovery_interviews'
                      ? 'Discovery'
                      : 'Experiment'}
                </span>
                <ExperimentStatusSelect
                  experimentId={experiment.id}
                  status={experiment.status}
                />
                {experiment.outcome && (
                  <span
                    className={`text-xs font-bold ${
                      experiment.outcome === 'success'
                        ? 'text-green-600'
                        : experiment.outcome === 'failure'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                    }`}
                  >
                    {experiment.outcome}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold leading-tight">{experiment.name}</h2>
            </div>

            {/* Sidebar scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {experiment.description && (
                <p className="text-sm text-gray-600">{experiment.description}</p>
              )}

              {/* Outcome */}
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase text-gray-500 font-medium">Outcome</span>
                <OutcomeSelect experimentId={experiment.id} outcome={experiment.outcome} />
              </div>

              {/* Hypothesis */}
              {hypothesis && (
                <div className="p-3 border border-gray-200 rounded-lg">
                  <h3 className="text-xs uppercase text-gray-500 font-medium mb-1">
                    Testing Hypothesis
                  </h3>
                  <p className="text-sm italic">
                    H{hypothesis.sequence}: {hypothesis.statement}
                  </p>
                  {hypothesis.validation_criteria && (
                    <p className="text-xs text-gray-500 mt-1">
                      Validation: {hypothesis.validation_criteria}
                    </p>
                  )}
                </div>
              )}

              {/* Learnings */}
              <div>
                <h3 className="text-xs uppercase text-gray-500 font-medium mb-2">Learnings</h3>
                <LearningsEditor experimentId={experiment.id} learnings={experiment.learnings} />
              </div>
            </div>

            {/* Sidebar footer */}
            <div className="shrink-0 px-5 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400">
              <div className="space-x-3">
                <span>{new Date(experiment.created_at).toLocaleDateString()}</span>
                <span>
                  <a href={`/studio/${project.slug}`} className="text-blue-500 hover:underline">
                    {project.name}
                  </a>
                </span>
              </div>
              <a
                href={`/admin/experiments/${experiment.id}/edit`}
                className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Edit in admin"
              >
                <Pencil className="size-3" />
                Edit
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
