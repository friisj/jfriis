import { AdminRoute } from '@/components/auth/protected-route';
import Link from 'next/link';

export default function SamplerLayout({
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
          <span className="font-semibold">Sampler</span>
          <nav className="flex gap-4 ml-auto">
            <Link
              href="/tools/sampler"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/tools/sampler/sounds"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sounds
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </AdminRoute>
  );
}
