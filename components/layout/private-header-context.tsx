'use client'

import React, { createContext, useContext, useMemo, useState } from 'react'

type PrivateHeaderContextType = {
  actions: React.ReactNode | null
  setActions: (actions: React.ReactNode | null) => void
  hidden: boolean
  setHidden: (hidden: boolean) => void
}

const PrivateHeaderContext = createContext<PrivateHeaderContextType | undefined>(undefined)

export function PrivateHeaderProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<React.ReactNode | null>(null)
  const [hidden, setHidden] = useState(false)

  const value = useMemo(
    () => ({
      actions,
      setActions,
      hidden,
      setHidden,
    }),
    [actions, hidden],
  )

  return <PrivateHeaderContext.Provider value={value}>{children}</PrivateHeaderContext.Provider>
}

export function usePrivateHeader() {
  const ctx = useContext(PrivateHeaderContext)
  if (!ctx) {
    throw new Error('usePrivateHeader must be used within a PrivateHeaderProvider')
  }
  return ctx
}


