'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type Space = 'identity' | 'stage' | 'library';

interface NavItem {
  href: string;
  label: string;
}

interface NavSection {
  label: string;
  href: string; // section root
  items?: NavItem[];
}

const spaceConfig: Record<Space, { label: string; sections: NavSection[] }> = {
  identity: {
    label: 'Identity',
    sections: [
      {
        label: 'Soul',
        href: '/tools/luv/soul',
        items: [
          { href: '/tools/luv/soul/personality', label: 'Personality' },
          { href: '/tools/luv/soul/voice', label: 'Voice' },
          { href: '/tools/luv/soul/rules', label: 'Rules' },
          { href: '/tools/luv/soul/facets', label: 'Facets' },
          { href: '/tools/luv/soul/overrides', label: 'Overrides' },
          { href: '/tools/luv/soul/preview', label: 'Preview' },
        ],
      },
      {
        label: 'Chassis',
        href: '/tools/luv/chassis',
      },
      {
        label: 'Studies',
        href: '/tools/luv/studies',
      },
    ],
  },
  stage: {
    label: 'Stage',
    sections: [
      {
        label: 'Scenes',
        href: '/tools/luv/stage',
      },
    ],
  },
  library: {
    label: 'Library',
    sections: [
      { label: 'Conversations', href: '/tools/luv/conversations' },
      { label: 'History', href: '/tools/luv/history' },
      { label: 'Media', href: '/tools/luv/media' },
      { label: 'Memories', href: '/tools/luv/memories' },
      { label: 'Presets', href: '/tools/luv/presets' },
      { label: 'Prompts', href: '/tools/luv/prompts' },
      { label: 'Training', href: '/tools/luv/training' },
    ],
  },
};

const spaceOrder: Space[] = ['identity', 'stage', 'library'];

export function resolveSpace(pathname: string): Space {
  if (pathname.startsWith('/tools/luv/soul')) return 'identity';
  if (pathname.startsWith('/tools/luv/chassis')) return 'identity';
  if (pathname.startsWith('/tools/luv/studies')) return 'identity';
  if (pathname.startsWith('/tools/luv/stage')) return 'stage';
  if (pathname.startsWith('/tools/luv/conversations')) return 'library';
  if (pathname.startsWith('/tools/luv/history')) return 'library';
  if (pathname.startsWith('/tools/luv/media')) return 'library';
  if (pathname.startsWith('/tools/luv/memories')) return 'library';
  if (pathname.startsWith('/tools/luv/presets')) return 'library';
  if (pathname.startsWith('/tools/luv/prompts')) return 'library';
  if (pathname.startsWith('/tools/luv/training')) return 'library';
  return 'identity';
}

export function LuvContextNav() {
  const pathname = usePathname();
  const activeSpace = resolveSpace(pathname);
  const { sections } = spaceConfig[activeSpace];

  return (
    <nav className="flex flex-col h-full border-r border-border">
      {/* Space switcher */}
      <div className="flex border-b border-border">
        {spaceOrder.map((space) => (
          <Link
            key={space}
            href={spaceConfig[space].sections[0].href}
            className={cn(
              'flex-1 text-center py-2 text-[11px] font-medium transition-colors',
              activeSpace === space
                ? 'text-foreground bg-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
            )}
          >
            {spaceConfig[space].label}
          </Link>
        ))}
      </div>

      {/* Section links */}
      <div className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => {
          const sectionActive = pathname.startsWith(section.href);
          const isExactActive = pathname === section.href;

          return (
            <div key={section.href}>
              <Link
                href={section.href}
                className={cn(
                  'block px-3 py-1.5 text-xs font-medium transition-colors',
                  isExactActive
                    ? 'text-foreground bg-accent'
                    : sectionActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                )}
              >
                {section.label}
              </Link>
              {sectionActive && section.items && (
                <div className="mt-0.5">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'block pl-6 pr-3 py-1 text-xs transition-colors',
                        pathname === item.href
                          ? 'text-foreground font-medium bg-accent'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
