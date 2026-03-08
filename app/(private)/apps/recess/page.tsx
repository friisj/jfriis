'use client'

import Link from 'next/link'

const MODES = [
  {
    href: '/apps/recess/play',
    title: 'Play',
    description: 'Navigate the school, find demon teachers, escape to recess.',
    color: 'border-green-800 hover:border-green-600',
    textColor: 'text-green-400',
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

      <Link
        href="/apps"
        className="mt-12 text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        &larr; Back to apps
      </Link>
    </div>
  )
}
