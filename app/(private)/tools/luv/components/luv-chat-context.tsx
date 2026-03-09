'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getLuvCharacter } from '@/lib/luv';
import { resolveSpace } from './luv-context-nav';
import type { LuvSoulData } from '@/lib/types/luv';
import type { LuvPageContext } from '@/lib/types/luv';

interface LuvChatContextValue {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  activeConversationId: string | null;
  resumeConversation: (id: string) => void;
  clearActiveConversation: () => void;
  soulData: LuvSoulData;
  soulLoaded: boolean;
  /** Current page context snapshot — read by the chat transport */
  pageContext: LuvPageContext;
  /** Merge additional page-specific data into context */
  setPageData: (data: Record<string, unknown> | null) => void;
}

/** Map pathname segments to human-readable labels */
function pathnameToLabel(pathname: string): string {
  const segments = pathname.replace('/tools/luv/', '').split('/').filter(Boolean);
  if (segments.length === 0) return 'Dashboard';
  return segments
    .map((s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(' / ');
}

const LuvChatContext = createContext<LuvChatContextValue | null>(null);

export function LuvChatProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [soulData, setSoulData] = useState<LuvSoulData>({});
  const [soulLoaded, setSoulLoaded] = useState(false);
  const [pageData, setPageDataState] = useState<Record<string, unknown> | null>(null);

  // Track pathname so pageData resets on navigation
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      setPageDataState(null);
    }
  }, [pathname]);

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

  const setPageData = useCallback((data: Record<string, unknown> | null) => {
    setPageDataState(data);
  }, []);

  // Build the page context snapshot — always fresh from current state
  const pageContext: LuvPageContext = {
    timestamp: new Date().toISOString(),
    pathname,
    viewLabel: pathnameToLabel(pathname),
    space: resolveSpace(pathname),
    ...(pageData && { pageData }),
  };

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
        pageContext,
        setPageData,
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
