'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface LuvChatContextValue {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  activeConversationId: string | null;
  resumeConversation: (id: string) => void;
  clearActiveConversation: () => void;
}

const LuvChatContext = createContext<LuvChatContextValue | null>(null);

export function LuvChatProvider({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const resumeConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setChatOpen(true);
  }, []);

  const clearActiveConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  return (
    <LuvChatContext.Provider
      value={{ chatOpen, setChatOpen, activeConversationId, resumeConversation, clearActiveConversation }}
    >
      {children}
    </LuvChatContext.Provider>
  );
}

export function useLuvChat() {
  const ctx = useContext(LuvChatContext);
  if (!ctx) throw new Error('useLuvChat must be used within LuvChatProvider');
  return ctx;
}
