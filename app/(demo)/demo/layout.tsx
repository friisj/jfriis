import { AdminRoute } from '@/components/auth/protected-route'

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </AdminRoute>
  )
}
