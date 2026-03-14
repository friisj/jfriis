'use client'

import { useEffect } from 'react'
import { usePrivateHeader } from '@/components/layout/private-header-context'

function HideHeader() {
  const { setHidden } = usePrivateHeader()
  useEffect(() => {
    setHidden(true)
    return () => setHidden(false)
  }, [setHidden])
  return null
}

export default function DuoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HideHeader />
      {children}
    </>
  )
}
