'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

// Control surface that CustomRepl registers so the chat can manipulate the DAW
export type StrudelReplControls = {
  evaluate: (code: string) => Promise<unknown>
  stop: () => void
  replaceAll: (code: string) => void
  getPatternSummary: () => string
  getCurrentCode: () => string
}

type StrudelChatContextValue = {
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
  // Bridge to REPL engine
  replControls: StrudelReplControls | null
  registerReplControls: (controls: StrudelReplControls) => void
  // Live state from the REPL
  currentCode: string
  setCurrentCode: (code: string) => void
  lastError: string | null
  setLastError: (error: string | null) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
}

const StrudelChatContext = createContext<StrudelChatContextValue | null>(null)

export function StrudelChatProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [currentCode, setCurrentCode] = useState('')
  const [lastError, setLastError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [replControls, setReplControls] = useState<StrudelReplControls | null>(null)

  const registerReplControls = useCallback((controls: StrudelReplControls) => {
    setReplControls(controls)
  }, [])

  return (
    <StrudelChatContext.Provider
      value={{
        chatOpen,
        setChatOpen,
        activeConversationId,
        setActiveConversationId,
        replControls,
        registerReplControls,
        currentCode,
        setCurrentCode,
        lastError,
        setLastError,
        isPlaying,
        setIsPlaying,
      }}
    >
      {children}
    </StrudelChatContext.Provider>
  )
}

export function useStrudelChat() {
  const ctx = useContext(StrudelChatContext)
  if (!ctx) throw new Error('useStrudelChat must be used within StrudelChatProvider')
  return ctx
}
