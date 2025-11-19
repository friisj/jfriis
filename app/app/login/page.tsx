import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Sign In</h1>
          <p className="text-muted-foreground">
            Access the admin dashboard
          </p>
        </div>

        <div className="border rounded-lg p-8 bg-card">
          <LoginForm />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Jon Friis Portfolio Admin
        </p>
      </div>
    </div>
  )
}
