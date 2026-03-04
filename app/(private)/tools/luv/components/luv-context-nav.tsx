'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getAllSchemas } from '@/lib/luv/chassis-schemas';

type Space = 'identity' | 'stage' | 'library';

interface NavItem {
  href: string;
  label: string;
}

interface NavGroup {
  header: string;
  href: string; // parent route (for group active state)
  items: NavItem[];
}

const soulGroup: NavGroup = {
  header: 'Soul',
  href: '/tools/luv/soul',
  items: [
    { href: '/tools/luv/soul/personality', label: 'Personality' },
    { href: '/tools/luv/soul/voice', label: 'Voice' },
    { href: '/tools/luv/soul/rules', label: 'Rules' },
    { href: '/tools/luv/soul/overrides', label: 'Overrides' },
    { href: '/tools/luv/soul/preview', label: 'Preview' },
  ],
};

function buildChassisGroup(): NavGroup {
  const schemas = getAllSchemas();
  const moduleItems: NavItem[] = schemas.map((s) => ({
    href: `/tools/luv/chassis/${s.key}`,
    label: s.label,
  }));

  return {
    header: 'Chassis',
    href: '/tools/luv/chassis',
    items: [
      ...moduleItems,
    ],
  };
}

const identityGroups: NavGroup[] = [soulGroup, buildChassisGroup()];

const libraryLinks: NavItem[] = [
  { href: '/tools/luv/conversations', label: 'Conversations' },
  { href: '/tools/luv/history', label: 'History' },
  { href: '/tools/luv/media', label: 'Media' },
  { href: '/tools/luv/presets', label: 'Presets' },
  { href: '/tools/luv/prompts', label: 'Prompts' },
  { href: '/tools/luv/studies', label: 'Studies' },
  { href: '/tools/luv/training', label: 'Training' },
];

const pathToSpace: Record<string, Space> = {
  '/tools/luv/soul': 'identity',
  '/tools/luv/chassis': 'identity',
  '/tools/luv/stage': 'stage',
  '/tools/luv/conversations': 'library',
  '/tools/luv/history': 'library',
  '/tools/luv/media': 'library',
  '/tools/luv/presets': 'library',
  '/tools/luv/prompts': 'library',
  '/tools/luv/studies': 'library',
  '/tools/luv/training': 'library',
};

function resolveSpace(pathname: string): Space {
  // Exact match first
  if (pathToSpace[pathname]) return pathToSpace[pathname];
  // Prefix match for sub-routes
  if (pathname.startsWith('/tools/luv/soul')) return 'identity';
  if (pathname.startsWith('/tools/luv/chassis')) return 'identity';
  return 'identity';
}

export function LuvContextNav() {
  const pathname = usePathname();
  const activeSpace = resolveSpace(pathname);

  if (activeSpace === 'stage') {
    return (
      <nav className="flex flex-col py-2">
        <Link
          href="/tools/luv/stage"
          className={cn(
            'px-3 py-1.5 text-xs transition-colors',
            pathname === '/tools/luv/stage'
              ? 'text-foreground font-medium bg-accent'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
          )}
        >
          Scenes
        </Link>
      </nav>
    );
  }

  if (activeSpace === 'library') {
    return (
      <nav className="flex flex-col py-2">
        {libraryLinks.map((link) => (
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
        ))}
      </nav>
    );
  }

  // Identity space — grouped sub-navigation
  return (
    <nav className="flex flex-col py-2 gap-3">
      {identityGroups.map((group) => {
        const groupActive = pathname.startsWith(group.href);

        return (
          <div key={group.header}>
            <Link
              href={group.href}
              className={cn(
                'block px-3 py-1.5 text-xs font-medium transition-colors',
                pathname === group.href
                  ? 'text-foreground bg-accent'
                  : groupActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
            >
              {group.header}
            </Link>
            {groupActive && (
              <div className="mt-0.5">
                {group.items.map((item) => (
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
    </nav>
  );
}
