'use client'

import dynamic from 'next/dynamic'

const TrainwreckGame = dynamic(
  () => import('@/components/studio/trainwreck/TrainwreckGame'),
  { ssr: false }
)

export default function TrainwreckPage() {
  return <TrainwreckGame />
}
