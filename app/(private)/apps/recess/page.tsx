'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { HighScore } from '@/lib/recess/types'
import { loadHighScores } from '@/lib/recess/scores'

const MODES = [
  {
    href: '/apps/recess/play',
    title: 'Play',
    description: 'Navigate the school, find demon teachers, escape to recess.',
    color: 'border-green-800 hover:border-green-600',
    textColor: 'text-green-400',
  },
  {
    href: '/apps/recess/play3d',
    title: 'Play 3D',
    description: 'First-person view. WASD + mouse look. Same game, new perspective.',
    color: 'border-cyan-800 hover:border-cyan-600',
    textColor: 'text-cyan-400',
  },
  {
    href: '/apps/recess/textures',
    title: 'Texture Lab',
    description: 'Prototype surface materials — procedural textures, matcaps, and SD-generated assets.',
    color: 'border-orange-800 hover:border-orange-600',
    textColor: 'text-orange-400',
  },
  {
    href: '/apps/recess/manage',
    title: 'Manage',
    description: 'Tune level generation, gameplay params, and preview mazes.',
    color: 'border-purple-800 hover:border-purple-600',
    textColor: 'text-purple-400',
  },
  {
    href: '/apps/recess/sandbox',
    title: 'Sandbox',
    description: 'Test encounters, battles, and character states in isolation.',
    color: 'border-yellow-800 hover:border-yellow-600',
    textColor: 'text-yellow-400',
  },
]

export default function RecessPage() {
  const [scores, setScores] = useState<HighScore[]>([])

  useEffect(() => {
    setScores(loadHighScores())
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-5xl font-bold tracking-tight mb-2">Recess</h1>
      <p className="text-zinc-400 text-lg mb-12">Escape the school. Save the kids.</p>

      <div className="grid gap-4 w-full max-w-md">
        {MODES.map((mode) => (
          <Link
            key={mode.href}
            href={mode.href}
            className={`p-5 bg-zinc-900 border rounded-xl transition-colors ${mode.color}`}
          >
            <h2 className={`text-lg font-semibold ${mode.textColor}`}>{mode.title}</h2>
            <p className="text-sm text-zinc-500 mt-1">{mode.description}</p>
          </Link>
        ))}
      </div>

      {scores.length > 0 && (
        <div className="mt-10 w-full max-w-md">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">High Scores</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs">
                  <th className="text-left px-4 py-2 font-medium">#</th>
                  <th className="text-left px-4 py-2 font-medium">Kids Saved</th>
                  <th className="text-left px-4 py-2 font-medium">Floors</th>
                  <th className="text-right px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {scores.slice(0, 5).map((s, i) => (
                  <tr key={i} className="border-t border-zinc-800/50">
                    <td className="px-4 py-2 text-zinc-600">{i + 1}</td>
                    <td className="px-4 py-2 text-yellow-400 font-mono font-bold">{s.score}</td>
                    <td className="px-4 py-2 text-zinc-400 font-mono">{s.floors}</td>
                    <td className="px-4 py-2 text-zinc-600 text-right font-mono">{s.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Link
        href="/apps"
        className="mt-12 text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        &larr; Back to apps
      </Link>
    </div>
  )
}
