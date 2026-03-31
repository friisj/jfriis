'use client'

import dynamic from 'next/dynamic'

const StrudelRepl = dynamic(
  () => import('@/components/studio/prototypes/strudel/custom-repl'),
  { ssr: false }
)

export function StrudelApp() {
  return <StrudelRepl />
}
