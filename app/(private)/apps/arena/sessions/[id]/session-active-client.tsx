'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ArenaSessionWithSkills, ArenaProjectAssemblyWithSkill } from '@/lib/studio/arena/db-types'
import type { SkillState, DimensionState, ProjectTheme } from '@/lib/studio/arena/types'
import { CORE_DIMENSIONS, assembleSkillState, emptySkillState } from '@/lib/studio/arena/types'
import { SkillGym } from '@/components/studio/prototypes/arena/shared/skill-gym'
import type { GymRoundData, CanvasTabDef } from '@/components/studio/prototypes/arena/shared/skill-gym'
import type { ArenaTestComponent } from '@/lib/studio/arena/db-types'
import type { TokenMap } from '@/lib/studio/arena/types'
import { COMPONENT_REGISTRY } from '@/components/studio/prototypes/arena/shared/canonical-components'
import { completeGymRound, acceptRefinement, abandonSession } from '@/lib/studio/arena/actions'
import type { AvailableFonts } from '@/components/studio/arena/font-selector'

interface SessionActiveClientProps {
  session: ArenaSessionWithSkills
  assembly?: ArenaProjectAssemblyWithSkill[]
  sessionComponents?: ArenaTestComponent[]
  theme?: ProjectTheme
}

/** Build the control SkillState from the project assembly */
function buildControlFromAssembly(
  assembly: ArenaProjectAssemblyWithSkill[]
): SkillState {
  const dims: Record<string, DimensionState> = {}
  // Initialize with empty states for core dimensions
  for (const d of CORE_DIMENSIONS) {
    dims[d] = { decisions: [], rules: [] }
  }
  for (const entry of assembly) {
    if (entry.skill?.state && entry.dimension) {
      const state = entry.skill.state
      // Per-dimension skills store DimensionState directly
      if ('decisions' in state) {
        dims[entry.dimension] = state as DimensionState
      } else if (entry.dimension in state) {
        // Legacy monolithic skill — extract the dimension
        dims[entry.dimension] = (state as SkillState)[entry.dimension]
      }
    }
  }
  return assembleSkillState(dims)
}

export function SessionActiveClient({ session, assembly = [], sessionComponents = [], theme }: SessionActiveClientProps) {
  const router = useRouter()
  const targetDimension = session.target_dimension

  // Build control skill from assembly (or fall back to input skill state)
  const controlSkill = useMemo(() => {
    if (assembly.length > 0) {
      return buildControlFromAssembly(assembly)
    }
    return session.input_skill?.state as SkillState | undefined ?? emptySkillState()
  }, [assembly, session.input_skill?.state])

  // The current working skill starts from the input skill's state.
  // For per-dimension sessions, the gym still works with a full SkillState
  // but only the target dimension will be refined.
  const initialSkill = useMemo((): SkillState => {
    if (targetDimension && session.input_skill?.state) {
      const inputState = session.input_skill.state
      // Per-dimension skill: compose it into the control assembly
      const assembled = { ...controlSkill }
      if ('decisions' in inputState) {
        // DimensionState — slot it into the target dimension
        assembled[targetDimension] = inputState as DimensionState
      } else {
        // Full SkillState — take the target dimension
        assembled[targetDimension] = (inputState as SkillState)[targetDimension]
      }
      return assembled
    }
    return (session.input_skill?.state as SkillState | undefined) ?? emptySkillState()
  }, [targetDimension, session.input_skill?.state, controlSkill])

  const [currentSkill, setCurrentSkill] = useState<SkillState>(initialSkill)
  const [currentTheme, setCurrentTheme] = useState<ProjectTheme | undefined>(theme)
  const [round, setRound] = useState(session.round_count + 1)
  const [finishing, setFinishing] = useState(false)
  const [abandoning, setAbandoning] = useState(false)

  // Font loading: match theme typography tokens against available arena fonts
  const [fontOverrides, setFontOverrides] = useState<{ display?: string; body?: string; mono?: string } | undefined>(undefined)

  useEffect(() => {
    if (!currentTheme?.typography?.tokens) return
    const tokens = currentTheme.typography.tokens
    const fontFamilies: { role: 'display' | 'body' | 'mono'; family: string }[] = []
    for (const [label, value] of Object.entries(tokens)) {
      const lower = label.toLowerCase()
      if (lower.includes('display') && lower.includes('font')) fontFamilies.push({ role: 'display', family: value })
      else if (lower.includes('body') && lower.includes('font')) fontFamilies.push({ role: 'body', family: value })
      else if (lower.includes('mono') && lower.includes('font')) fontFamilies.push({ role: 'mono', family: value })
    }
    if (fontFamilies.length === 0) return

    let cancelled = false
    fetch('/api/arena/fonts')
      .then(res => res.json())
      .then((data: AvailableFonts) => {
        if (cancelled) return
        const matched: { scopedName: string; role: string; files: { path: string; weight: number; style: string; format: string }[] }[] = []
        for (const { role, family } of fontFamilies) {
          // Strip scoped prefix if present for matching
          const cleanName = family.replace(/^__fi__/, '')
          const font = data.customFonts.find(f => f.name === cleanName || f.displayName === cleanName || f.name === family || f.displayName === family)
          if (font) {
            matched.push({ scopedName: `__fi__${font.name}`, role, files: font.files })
          }
        }
        if (matched.length === 0) return

        // Inject @font-face rules
        const css = matched.flatMap(f =>
          f.files.map(file =>
            `@font-face { font-family: "${f.scopedName}"; src: url(${file.path}) format("${file.format}"); font-weight: ${file.weight}; font-style: ${file.style}; font-display: swap; }`
          )
        ).join('\n')
        const style = document.createElement('style')
        style.setAttribute('data-arena-session-fonts', '')
        style.textContent = css
        document.head.appendChild(style)

        // Build fontOverrides
        const overrides: { display?: string; body?: string; mono?: string } = {}
        for (const m of matched) {
          if (m.role === 'display') overrides.display = `"${m.scopedName}", system-ui, sans-serif`
          else if (m.role === 'body') overrides.body = `"${m.scopedName}", system-ui, sans-serif`
          else if (m.role === 'mono') overrides.mono = `"${m.scopedName}", ui-monospace, monospace`
        }
        setFontOverrides(Object.keys(overrides).length > 0 ? overrides : undefined)
      })
      .catch(err => console.error('Failed to load arena fonts:', err))

    return () => {
      cancelled = true
      document.querySelectorAll('style[data-arena-session-fonts]').forEach(el => el.remove())
    }
  }, [currentTheme])

  // Build canvas tabs from session test components
  const gymComponents = useMemo((): CanvasTabDef[] | undefined => {
    if (sessionComponents.length === 0) return undefined
    const tabs: CanvasTabDef[] = []
    for (const comp of sessionComponents) {
      const Component = COMPONENT_REGISTRY[comp.component_key]
      if (Component) {
        tabs.push({ key: comp.slug, label: comp.name, Component })
      }
    }
    return tabs.length > 0 ? tabs : undefined
  }, [sessionComponents])

  const handleSkillUpdate = useCallback(async (refined: SkillState, roundData: GymRoundData) => {
    try {
      // Map GymFeedbackItem.label → decision_label for DB shape
      const dbFeedback = roundData.feedback.map((f) => ({
        dimension: f.dimension,
        decision_label: f.label,
        action: f.action,
        new_value: f.newValue,
        reason: f.reason,
      }))
      await completeGymRound({
        session_id: session.id,
        round,
        feedback: dbFeedback,
        annotations: roundData.annotations,
        skill_state: refined,
        theme_updates: roundData.theme_updates,
      })
      setCurrentSkill(refined)
      // Merge theme_updates into currentTheme so the preview reflects token corrections
      if (roundData.theme_updates) {
        setCurrentTheme(prev => {
          if (!prev) return prev
          const updated = { ...prev }
          for (const [dim, tokens] of Object.entries(roundData.theme_updates as Record<string, TokenMap>)) {
            updated[dim] = {
              ...updated[dim],
              tokens: { ...updated[dim]?.tokens, ...tokens },
              source: updated[dim]?.source ?? 'refinement',
            }
          }
          return updated
        })
      }
      setRound((r) => r + 1)
    } catch (err) {
      console.error('Failed to persist round:', err)
    }
  }, [session.id, round])

  const handleFinish = useCallback(async () => {
    setFinishing(true)
    try {
      await acceptRefinement({
        session_id: session.id,
        final_skill_state: currentSkill,
        input_skill_name: session.input_skill?.name ?? 'Skill',
      })
      router.push(`/apps/arena/sessions/${session.id}`)
    } catch (err) {
      console.error('Failed to finish session:', err)
      setFinishing(false)
    }
  }, [session.id, currentSkill, session.input_skill?.name, router])

  const handleAbandon = useCallback(async () => {
    setAbandoning(true)
    try {
      await abandonSession(session.id)
      router.push('/apps/arena/sessions')
    } catch (err) {
      console.error('Failed to abandon session:', err)
      setAbandoning(false)
    }
  }, [session.id, router])

  const dimensionLabel = targetDimension
    ? targetDimension.charAt(0).toUpperCase() + targetDimension.slice(1)
    : null

  return (
    <div className="space-y-4">
      {/* Session header */}
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
            {session.project_id ? (
              <>
                <Link href={`/apps/arena/projects/${session.project_id}`} className="hover:text-slate-700 dark:hover:text-slate-200">
                  {session.project?.name ?? 'Project'}
                </Link>
                <span>/</span>
              </>
            ) : (
              <>
                <Link href="/apps/arena" className="hover:text-slate-700 dark:hover:text-slate-200">
                  Projects
                </Link>
                <span>/</span>
              </>
            )}
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {session.input_skill?.name ?? 'Session'} — Round {round}
          </h1>
          {dimensionLabel && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Targeting: <span className="font-medium">{dimensionLabel}</span>
              {session.project_id && ' (control from project assembly)'}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleFinish}
            disabled={finishing || round <= 1}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors"
          >
            {finishing ? 'Saving...' : 'Finish Session'}
          </button>
          <button
            onClick={handleAbandon}
            disabled={abandoning}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            {abandoning ? 'Abandoning...' : 'Abandon'}
          </button>
        </div>
      </div>

      {/* Gym UI */}
      <SkillGym
        skill={currentSkill}
        onSkillUpdate={handleSkillUpdate}
        onBack={() => router.push(session.project_id ? `/apps/arena/projects/${session.project_id}` : '/apps/arena')}
        targetDimension={targetDimension}
        testComponents={gymComponents}
        theme={currentTheme}
        fontOverrides={fontOverrides}
      />
    </div>
  )
}
