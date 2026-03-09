'use client';

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { IconMessage } from '@tabler/icons-react';
import { usePrivateHeader } from '@/components/layout/private-header-context';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { LuvContextNav } from './components/luv-context-nav';
import { ChatDrawer } from './components/chat-drawer';
import { LuvChatProvider, useLuvChat } from './components/luv-chat-context';

function LuvHeaderActions() {
  const { setActions } = usePrivateHeader();
  const { chatOpen, setChatOpen } = useLuvChat();

  const onChatToggle = useCallback(() => setChatOpen(!chatOpen), [chatOpen, setChatOpen]);

  useEffect(() => {
    setActions(
      <button
        type="button"
        onClick={onChatToggle}
        className={cn(
          'flex items-center justify-center h-10 w-10 transition-colors',
          chatOpen
            ? 'text-foreground bg-accent'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
        )}
        title={chatOpen ? 'Close chat' : 'Open chat'}
      >
        <IconMessage size={16} />
      </button>,
    );

    return () => setActions(null);
  }, [chatOpen, onChatToggle, setActions]);

  return null;
}

function LuvLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { chatOpen } = useLuvChat();

  // Fullscreen chat route — bypass panels, sidebar, and drawer
  if (pathname.startsWith('/tools/luv/chat')) {
    return <>{children}</>;
  }

  return (
    <>
      <LuvHeaderActions />
      <div className="flex h-full">
        <div className="w-60 shrink-0">
          <LuvContextNav />
        </div>
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel>{children}</ResizablePanel>
          {chatOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={20}>
                <ChatDrawer />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </>
  );
}

export default function LuvLayout({ children }: { children: React.ReactNode }) {
  return (
    <LuvChatProvider>
      <LuvLayoutInner>{children}</LuvLayoutInner>
    </LuvChatProvider>
  );
}
