import { AdminRoute } from '@/components/auth/admin-route';

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminRoute>{children}</AdminRoute>;
}
