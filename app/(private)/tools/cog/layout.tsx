'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { IconPlus } from '@tabler/icons-react';
import { AdminRoute } from '@/components/auth/protected-route';
import { usePrivateHeader } from '@/components/layout/private-header-context';
import { cn } from '@/lib/utils';

function CogHeaderActions() {
  const { setActions } = usePrivateHeader();
  const pathname = usePathname();

  const isSeriesRoot = pathname === '/tools/cog';
  const isPrompts = pathname.startsWith('/tools/cog/prompts');

  useEffect(() => {
    setActions(
      <>
        <Link
          href="/tools/cog/new"
          className="flex items-center justify-center h-10 w-10 text-muted-foreground hover:text-foreground transition-colors"
          title="New series"
        >
          <IconPlus size={16} stroke={1.5} />
        </Link>
        <Link
          href="/tools/cog"
          className={cn(
            'flex items-center h-full px-3 text-xs transition-colors',
            isSeriesRoot
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Series
        </Link>
        <Link
          href="/tools/cog/prompts"
          className={cn(
            'flex items-center h-full px-3 text-xs transition-colors',
            isPrompts
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Prompts
        </Link>
      </>,
    );

    return () => setActions(null);
  }, [setActions, isSeriesRoot, isPrompts]);

  return null;
}

export default function CogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRoute>
      <CogHeaderActions />
      {children}
    </AdminRoute>
  );
}
