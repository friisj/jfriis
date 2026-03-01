import { AdminRoute } from '@/components/auth/protected-route';
import Link from 'next/link';

const navLinks = [
  { href: '/tools/luv', label: 'Dashboard' },
  { href: '/tools/luv/soul', label: 'Soul' },
  { href: '/tools/luv/chassis', label: 'Chassis' },
  { href: '/tools/luv/chat', label: 'Chat' },
  { href: '/tools/luv/prompt-matrix', label: 'Prompts' },
  { href: '/tools/luv/media-lab', label: 'Media' },
  { href: '/tools/luv/training', label: 'Training' },
];

export default function LuvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRoute>
      <div className="border-b">
        <div className="container flex h-14 items-center gap-6 px-4">
          <Link
            href="/tools"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Tools
          </Link>
          <span className="font-semibold">Luv</span>
          <nav className="flex gap-4 ml-auto">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {children}
    </AdminRoute>
  );
}
