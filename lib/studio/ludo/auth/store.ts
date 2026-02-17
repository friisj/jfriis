// Stub for jfriis - auth is handled by the route layout
import { create } from 'zustand'

interface AuthState {
  isAuthenticated: boolean
  userId: string | null
  user: { email: string } | null
  initialize: () => void
}

export const useAuthStore = create<AuthState>(() => ({
  isAuthenticated: true,
  userId: null,
  user: null,
  initialize: () => {},
}))
