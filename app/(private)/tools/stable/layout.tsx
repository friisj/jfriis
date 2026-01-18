import { AdminRoute } from '@/components/auth/protected-route';
import Link from 'next/link';

export default function StableLayout({
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
            ← Tools
          </Link>
          <span className="font-semibold">Stable</span>
          <nav className="flex gap-4 ml-auto">
            <Link
              href="/tools/stable"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Characters
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </AdminRoute>
  );
}
