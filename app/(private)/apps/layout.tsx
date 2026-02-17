'use client'

import { usePrivateHeader } from '@/components/layout/private-header-context'
import { useEffect } from 'react'

export default function AppsLayout({ children }: { children: React.ReactNode }) {
  const { setHidden } = usePrivateHeader()

  useEffect(() => {
    setHidden(true)
    return () => setHidden(false)
  }, [setHidden])

  return <>{children}</>
}
