'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type Space = 'identity' | 'stage' | 'library';

const spaceLinks: Record<Space, { href: string; label: string }[]> = {
  identity: [
    { href: '/tools/luv/soul', label: 'Soul' },
    { href: '/tools/luv/chassis', label: 'Chassis' },
  ],
  stage: [],
  library: [
    { href: '/tools/luv/conversations', label: 'Conversations' },
    { href: '/tools/luv/media', label: 'Media' },
    { href: '/tools/luv/prompts', label: 'Prompts' },
    { href: '/tools/luv/training', label: 'Training' },
  ],
};

const pathToSpace: Record<string, Space> = {
  '/tools/luv/soul': 'identity',
  '/tools/luv/chassis': 'identity',
  '/tools/luv/stage': 'stage',
  '/tools/luv/conversations': 'library',
  '/tools/luv/media': 'library',
  '/tools/luv/prompts': 'library',
  '/tools/luv/training': 'library',
};

export function LuvContextNav() {
  const pathname = usePathname();
  const activeSpace = pathToSpace[pathname] ?? 'identity';
  const links = spaceLinks[activeSpace];

  return (
    <nav className="flex flex-col py-2">
      {links.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">Coming soon</p>
      ) : (
        links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'px-3 py-1.5 text-xs transition-colors',
              pathname === link.href
                ? 'text-foreground font-medium bg-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
            )}
          >
            {link.label}
          </Link>
        ))
      )}
    </nav>
  );
}
