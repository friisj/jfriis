'use client'

import React, { createContext, useContext, useMemo, useState } from 'react'

type MobileNavRenderer = () => React.ReactNode

type PrivateHeaderContextType = {
  actions: React.ReactNode | null
  setActions: (actions: React.ReactNode | null) => void
  hidden: boolean
  setHidden: (hidden: boolean) => void
  hardNavigation: boolean
  setHardNavigation: (hard: boolean) => void
  renderMobileNav: MobileNavRenderer | null
  setMobileNav: (renderer: MobileNavRenderer | null) => void
}

const PrivateHeaderContext = createContext<PrivateHeaderContextType | undefined>(undefined)

export function PrivateHeaderProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<React.ReactNode | null>(null)
  const [hidden, setHidden] = useState(false)
  const [hardNavigation, setHardNavigation] = useState(false)
  const [renderMobileNav, setRenderMobileNav] = useState<MobileNavRenderer | null>(null)

  // Wrap setter so callers pass a renderer function, not a ReactNode.
  // useState with a function arg would invoke it, so we wrap in an extra arrow.
  const setMobileNav = useMemo(
    () => (renderer: MobileNavRenderer | null) => {
      setRenderMobileNav(() => renderer)
    },
    [],
  )

  const value = useMemo(
    () => ({
      actions,
      setActions,
      hidden,
      setHidden,
      hardNavigation,
      setHardNavigation,
      renderMobileNav,
      setMobileNav,
    }),
    [actions, hidden, hardNavigation, renderMobileNav, setMobileNav],
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
