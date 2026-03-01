'use client'

import dynamic from 'next/dynamic'

const FigmaImportSpike = dynamic(
  () => import('@/components/studio/prototypes/arena/figma-import-spike'),
  { ssr: false }
)

export default function ArenaPage() {
  return <FigmaImportSpike />
}
