'use client';

import { AdminRoute } from '@/components/auth/protected-route';

export default function DuoLayout({ children }: { children: React.ReactNode }) {
  return <AdminRoute>{children}</AdminRoute>;
}
