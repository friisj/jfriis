'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ArenaSessionWithSkills } from '@/lib/studio/arena/db-types'
import type { SkillState } from '@/lib/studio/arena/types'
import { SkillGym } from '@/components/studio/prototypes/arena/shared/skill-gym'
import { completeGymRound, acceptRefinement, abandonSession } from '@/lib/studio/arena/actions'

interface SessionActiveClientProps {
  session: ArenaSessionWithSkills
}

export function SessionActiveClient({ session }: SessionActiveClientProps) {
  const router = useRouter()
  const [currentSkill, setCurrentSkill] = useState<SkillState>(
    session.input_skill?.state ?? { color: { decisions: [], rules: [] }, typography: { decisions: [], rules: [] }, spacing: { decisions: [], rules: [] } }
  )
  const [round, setRound] = useState(session.round_count + 1)
  const [finishing, setFinishing] = useState(false)
  const [abandoning, setAbandoning] = useState(false)

  const handleSkillUpdate = useCallback(async (refined: SkillState) => {
    // Persist the round
    try {
      await completeGymRound({
        session_id: session.id,
        round,
        feedback: [], // Feedback is captured internally by SkillGym — we persist the snapshot
        annotations: [],
        skill_state: refined,
      })
      setCurrentSkill(refined)
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

  return (
    <div className="space-y-4">
      {/* Session header */}
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/apps/arena/sessions" className="hover:text-slate-700 dark:hover:text-slate-200">Sessions</Link>
            <span>/</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {session.input_skill?.name ?? 'Session'} — Round {round}
          </h1>
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
        onBack={() => router.push('/apps/arena/sessions')}
      />
    </div>
  )
}
