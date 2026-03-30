'use client'

import dynamic from 'next/dynamic'

const StrudelRepl = dynamic(
  () => import('./components/strudel-repl'),
  { ssr: false }
)

export function StrudelClient() {
  return <StrudelRepl />
}
