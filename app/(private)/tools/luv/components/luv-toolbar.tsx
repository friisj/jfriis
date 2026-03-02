'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  '/tools/luv/prompts': 'library',
  '/tools/luv/training': 'library',
};

interface LuvToolbarProps {
  chatOpen: boolean;
  onChatToggle: () => void;
}

export function LuvToolbar({ chatOpen, onChatToggle }: LuvToolbarProps) {
  const pathname = usePathname();
  const activeSpace = pathToSpace[pathname] ?? 'identity';

  return (
    <div className="flex items-center h-10 border-b bg-background shrink-0">
      {/* Left: back + brand */}
      <Link
        href="/tools"
        className="flex items-center gap-1.5 h-10 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        <span className="font-medium text-foreground">Luv</span>
      </Link>

      {/* Center: space tabs */}
      <nav className="flex items-center h-10 border-l">
        {spaces.map((space) => (
          <Link
            key={space.key}
            href={space.href}
            className={cn(
              'flex items-center h-10 px-4 text-xs font-medium transition-colors border-r border-border',
              activeSpace === space.key
                ? 'text-foreground bg-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
            )}
          >
            {space.label}
          </Link>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Right: chat toggle */}
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
        <MessageSquare className="size-4" />
      </button>
    </div>
  );
}
