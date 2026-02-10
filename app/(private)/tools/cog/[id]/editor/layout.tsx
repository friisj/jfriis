import { AdminRoute } from '@/components/auth/protected-route'

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Full-screen layout with auth check but no visual chrome
  // Editor has its own navigation and doesn't need the tools layout
  return (
    <AdminRoute>
      <div className="fixed inset-0">
        {children}
      </div>
    </AdminRoute>
  )
}
