 'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        {children}
      </div>
    </ProtectedRoute>
  )
}


