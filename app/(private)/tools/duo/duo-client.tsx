'use client'

import dynamic from 'next/dynamic'

const DuoSynth = dynamic(
  () => import('./components/duo-synth').then(mod => ({ default: mod.DuoSynth })),
  { ssr: false }
)

export function DuoClient() {
  return <DuoSynth />
}
