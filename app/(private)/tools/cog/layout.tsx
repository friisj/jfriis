import { AdminRoute } from '@/components/auth/protected-route';
import Link from 'next/link';

export default function CogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRoute>
      <div className="border-b">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Link
            href="/tools"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Tools
          </Link>
          <span className="font-semibold">Cog</span>
        </div>
      </div>
      {children}
    </AdminRoute>
  );
}
