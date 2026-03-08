'use client'

import Link from 'next/link'

export default function RecessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-5xl font-bold tracking-tight mb-4">Recess</h1>
      <p className="text-zinc-400 text-lg mb-12">Game sandbox</p>

      <div className="grid gap-4 w-full max-w-md">
        <p className="text-zinc-600 text-center text-sm">No games yet. Time to build something.</p>
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
