'use client';

import { useEffect, useState } from 'react';
import { AdminRoute } from '@/components/auth/protected-route';
import { usePrivateHeader } from '@/components/layout/private-header-context';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChatSidebar } from './components/chat-sidebar';
import { getLuvCharacter } from '@/lib/luv';
import type { LuvSoulData } from '@/lib/types/luv';

const navLinks = [
  { href: '/tools/luv', label: 'Dashboard' },
  { href: '/tools/luv/soul', label: 'Soul' },
  { href: '/tools/luv/chassis', label: 'Chassis' },
  { href: '/tools/luv/prompt-matrix', label: 'Prompts' },
  { href: '/tools/luv/media-lab', label: 'Media' },
  { href: '/tools/luv/training', label: 'Training' },
];

function LuvHeaderActions() {
  const { setActions } = usePrivateHeader();
  const pathname = usePathname();

  useEffect(() => {
    setActions(
      <nav className="flex items-center h-10">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center h-10 px-3 text-xs font-medium transition-colors border-l border-border ${
              pathname === link.href
                ? 'text-foreground bg-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    );

    return () => setActions(null);
  }, [pathname, setActions]);

  return null;
}

function LuvContent({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [soulData, setSoulData] = useState<LuvSoulData>({});
  const [soulLoaded, setSoulLoaded] = useState(false);

  useEffect(() => {
    getLuvCharacter().then((char) => {
      if (char) setSoulData(char.soul_data);
      setSoulLoaded(true);
    });
  }, []);

  return (
    <>
      <LuvHeaderActions />
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto">{children}</div>
        <ChatSidebar
          open={chatOpen}
          onToggle={() => setChatOpen(!chatOpen)}
          soulData={soulData}
          soulLoaded={soulLoaded}
        />
      </div>
    </>
  );
}

export default function LuvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRoute>
      <LuvContent>{children}</LuvContent>
    </AdminRoute>
  );
}
