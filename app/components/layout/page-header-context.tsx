 'use client'

import React, { createContext, useContext, useMemo, useState } from 'react'

type PageHeaderContextType = {
  title: string
  setTitle: (title: string) => void
}

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(undefined)

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState('')

  const value = useMemo(
    () => ({
      title,
      setTitle,
    }),
    [title],
  )

  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext)
  if (!context) {
    throw new Error('usePageHeader must be used within a PageHeaderProvider')
  }
  return context
}


