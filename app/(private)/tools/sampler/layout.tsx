'use client';

import { useEffect } from 'react';
import { AdminRoute } from '@/components/auth/protected-route';
import { usePrivateHeader } from '@/components/layout/private-header-context';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/tools/sampler', label: 'Collections' },
  { href: '/tools/sampler/sounds', label: 'Sounds' },
];

function SamplerHeaderActions() {
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

export default function SamplerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRoute>
      <SamplerHeaderActions />
      {children}
    </AdminRoute>
  );
}
