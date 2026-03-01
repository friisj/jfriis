'use client'

import dynamic from 'next/dynamic'

const FigmaImportSpike = dynamic(
  () => import('@/components/studio/prototypes/arena/figma-import-spike'),
  { ssr: false }
)

export default function ArenaPage() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center border-b px-4">
        <h1 className="text-sm font-semibold tracking-tight">Arena</h1>
      </header>
      <div className="min-h-0 flex-1">
        <FigmaImportSpike />
      </div>
    </div>
  )
}
