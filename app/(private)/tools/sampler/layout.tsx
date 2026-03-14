'use client'

import { useEffect } from 'react'
import { AdminRoute } from '@/components/auth/protected-route'
import { usePrivateHeader } from '@/components/layout/private-header-context'

function HideHeader() {
  const { setHidden } = usePrivateHeader()
  useEffect(() => {
    setHidden(true)
    return () => setHidden(false)
  }, [setHidden])
  return null
}

export default function SamplerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminRoute>
      <HideHeader />
      {children}
    </AdminRoute>
  )
}
