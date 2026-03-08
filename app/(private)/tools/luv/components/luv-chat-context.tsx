'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getLuvCharacter } from '@/lib/luv';
import type { LuvSoulData } from '@/lib/types/luv';

interface LuvChatContextValue {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  activeConversationId: string | null;
  resumeConversation: (id: string) => void;
  clearActiveConversation: () => void;
  soulData: LuvSoulData;
  soulLoaded: boolean;
}

const LuvChatContext = createContext<LuvChatContextValue | null>(null);

export function LuvChatProvider({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [soulData, setSoulData] = useState<LuvSoulData>({});
  const [soulLoaded, setSoulLoaded] = useState(false);

  useEffect(() => {
    getLuvCharacter().then((char) => {
      if (char) setSoulData(char.soul_data);
      setSoulLoaded(true);
    });
  }, []);

  const resumeConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setChatOpen(true);
  }, []);

  const clearActiveConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  return (
    <LuvChatContext.Provider
      value={{
        chatOpen,
        setChatOpen,
        activeConversationId,
        resumeConversation,
        clearActiveConversation,
        soulData,
        soulLoaded,
      }}
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
