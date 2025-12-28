import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Login</h1>
          <p className="text-muted-foreground">
            Enter your email to receive a magic link
          </p>
        </div>

        <div className="border rounded-lg p-8 bg-card">
          <Suspense fallback={<div className="animate-pulse h-32 bg-muted rounded" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Jon Friis Portfolio
        </p>
      </div>
    </div>
  )
}


