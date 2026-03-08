'use client';

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
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

type Space = 'identity' | 'stage' | 'library';

const spaces: { key: Space; label: string; href: string }[] = [
  { key: 'identity', label: 'Identity', href: '/tools/luv/soul' },
  { key: 'stage', label: 'Stage', href: '/tools/luv/stage' },
  { key: 'library', label: 'Library', href: '/tools/luv/conversations' },
];

const pathToSpace: Record<string, Space> = {
  '/tools/luv/soul': 'identity',
  '/tools/luv/chassis': 'identity',
  '/tools/luv/stage': 'stage',
  '/tools/luv/conversations': 'library',
  '/tools/luv/media': 'library',
  '/tools/luv/presets': 'library',
  '/tools/luv/prompts': 'library',
  '/tools/luv/training': 'library',
  '/tools/luv/memories': 'library',
};

function LuvHeaderActions() {
  const { setActions } = usePrivateHeader();
  const pathname = usePathname();
  const { chatOpen, setChatOpen } = useLuvChat();
  const activeSpace = pathToSpace[pathname] ?? 'identity';

  const onChatToggle = useCallback(() => setChatOpen(!chatOpen), [chatOpen, setChatOpen]);

  useEffect(() => {
    setActions(
      <nav className="flex items-center h-10">
        {spaces.map((space) => (
          <Link
            key={space.key}
            href={space.href}
            className={cn(
              'flex items-center h-10 px-3 text-xs font-medium transition-colors border-l border-border',
              activeSpace === space.key
                ? 'text-foreground bg-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            {space.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={onChatToggle}
          className={cn(
            'flex items-center justify-center h-10 w-10 border-l border-border transition-colors',
            chatOpen
              ? 'text-foreground bg-accent'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
          )}
          title={chatOpen ? 'Close chat' : 'Open chat'}
        >
          <MessageSquare className="size-4" />
        </button>
      </nav>,
    );

    return () => setActions(null);
  }, [pathname, activeSpace, chatOpen, onChatToggle, setActions]);

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
      <div className="h-full">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={15} minSize={10} collapsible>
            <LuvContextNav />
          </ResizablePanel>
          <ResizableHandle />
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
