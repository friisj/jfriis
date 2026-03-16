'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { IconMessage } from '@tabler/icons-react';
import { usePrivateHeader } from '@/components/layout/private-header-context';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { LuvContextNav } from './components/luv-context-nav';
import { ChatDrawer } from './components/chat-drawer';
import { LuvChatProvider, useLuvChat } from './components/luv-chat-context';

function LuvHeaderActions() {
  const { setActions, setMobileNav } = usePrivateHeader();
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

  // Inject sidebar into mobile nav sheet
  useEffect(() => {
    setMobileNav(<LuvContextNav />);
    return () => setMobileNav(null);
  }, [setMobileNav]);

  return null;
}

function LuvLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { chatOpen, setChatOpen } = useLuvChat();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close chat when viewport crosses the breakpoint to prevent
  // desktop ResizablePanel appearing after a mobile Drawer session
  const prevIsMobile = useRef(isMobile);
  useEffect(() => {
    if (prevIsMobile.current !== isMobile) {
      setChatOpen(false);
      prevIsMobile.current = isMobile;
    }
  }, [isMobile, setChatOpen]);

  // Fullscreen chat route — bypass panels, sidebar, and drawer
  if (pathname.startsWith('/tools/luv/chat')) {
    return <>{children}</>;
  }

  // Render a stable shell until useIsMobile resolves to avoid
  // hydration mismatch and child remount flash
  if (!mounted) {
    return (
      <>
        <LuvHeaderActions />
        <div className="flex h-full min-w-0">
          <div className="hidden md:block w-60 shrink-0">
            <LuvContextNav />
          </div>
          <div className="flex-1 min-w-0 overflow-auto">
            {children}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LuvHeaderActions />
      <div className="flex h-full min-w-0">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-60 shrink-0">
          <LuvContextNav />
        </div>

        {isMobile ? (
          <>
            <div className="flex-1 min-w-0 overflow-auto">
              {children}
            </div>
            <Drawer open={chatOpen} onOpenChange={setChatOpen}>
              <DrawerContent className="h-[85dvh]">
                <VisuallyHidden><DrawerTitle>Chat</DrawerTitle></VisuallyHidden>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ChatDrawer />
                </div>
              </DrawerContent>
            </Drawer>
          </>
        ) : (
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
        )}
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
