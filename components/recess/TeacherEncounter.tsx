'use client'

import { useState } from 'react'
import type { Teacher, Challenge } from '@/lib/recess/types'
import { pickChallenge } from '@/lib/recess/challenges'

interface TeacherEncounterProps {
  teacher: Teacher
  onDecide: (accuse: boolean) => void
}

export default function TeacherEncounter({ teacher, onDecide }: TeacherEncounterProps) {
  const [challenge] = useState<Challenge>(() => pickChallenge())
  const [answered, setAnswered] = useState(false)
  const [teacherResponse, setTeacherResponse] = useState<number | null>(null)

  function handleChallenge() {
    // Teacher responds based on whether they're a demon
    const response = teacher.isDemon ? challenge.demonAnswer : challenge.normalAnswer
    setTeacherResponse(response)
    setAnswered(true)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full space-y-4">
        <h2 className="text-xl font-bold text-white">
          You found {teacher.name}!
        </h2>

        {!answered ? (
          <>
            <p className="text-zinc-400 text-sm">Challenge this teacher to see how they respond.</p>
            <div className="bg-zinc-800 rounded-lg p-4">
              <p className="text-zinc-300 font-medium mb-3">{challenge.question}</p>
              <ul className="space-y-1 text-sm text-zinc-500">
                {challenge.options.map((opt, i) => (
                  <li key={i} className="pl-2">- {opt}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={handleChallenge}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
            >
              Ask the question
            </button>
          </>
        ) : (
          <>
            <div className="bg-zinc-800 rounded-lg p-4">
              <p className="text-zinc-500 text-sm mb-1">{challenge.question}</p>
              <p className="text-white font-medium">
                &ldquo;{challenge.options[teacherResponse!]}&rdquo;
              </p>
            </div>

            <p className="text-zinc-400 text-sm">
              Is {teacher.name} a demon? Wrong accusations cost a strike.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => onDecide(true)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
              >
                ACCUSE
              </button>
              <button
                onClick={() => onDecide(false)}
                className="flex-1 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium transition-colors"
              >
                Walk away
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
