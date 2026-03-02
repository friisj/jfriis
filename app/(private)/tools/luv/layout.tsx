'use client';

import { useEffect, useState } from 'react';
import { AdminRoute } from '@/components/auth/protected-route';
import { usePrivateHeader } from '@/components/layout/private-header-context';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { getLuvCharacter } from '@/lib/luv';
import type { LuvSoulData } from '@/lib/types/luv';
import { LuvToolbar } from './components/luv-toolbar';
import { LuvContextNav } from './components/luv-context-nav';
import { ChatDrawer } from './components/chat-drawer';

function LuvShell({ children }: { children: React.ReactNode }) {
  const { setHidden } = usePrivateHeader();
  const [chatOpen, setChatOpen] = useState(false);
  const [soulData, setSoulData] = useState<LuvSoulData>({});
  const [soulLoaded, setSoulLoaded] = useState(false);

  useEffect(() => {
    setHidden(true);
    return () => setHidden(false);
  }, [setHidden]);

  useEffect(() => {
    getLuvCharacter().then((char) => {
      if (char) setSoulData(char.soul_data);
      setSoulLoaded(true);
    });
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <LuvToolbar chatOpen={chatOpen} onChatToggle={() => setChatOpen((o) => !o)} />
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
              <ChatDrawer soulData={soulData} soulLoaded={soulLoaded} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

export default function LuvLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <LuvShell>{children}</LuvShell>
    </AdminRoute>
  );
}
