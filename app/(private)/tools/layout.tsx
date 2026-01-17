import { AdminRoute } from '@/components/auth/protected-route';

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminRoute>{children}</AdminRoute>;
}
