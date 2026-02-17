// @ts-nocheck
'use client';

/**
 * Sound Management Layout
 *
 * Wraps all /sound routes with authentication protection.
 * Shows sign-in modal if user is not authenticated.
 */

import { useEffect, useState } from 'react';
// TODO: adapt to jfriis auth
// import { useAuthStore } from '@/lib/auth/store';
const useAuthStore = () => ({ isAuthenticated: false, isLoading: false, initialize: () => {} });
// TODO: adapt to jfriis auth
// import { SignInModal } from '@/components/Auth/SignInModal';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SoundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const [showSignIn, setShowSignIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Initialize auth on mount
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Show sign-in modal if not authenticated after loading
    if (!isLoading && !isAuthenticated) {
      setShowSignIn(true);
    }
  }, [isLoading, isAuthenticated]);

  const handleSignInSuccess = () => {
    setShowSignIn(false);
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔊</div>
          <p className="text-lg font-semibold">Loading Sound Management...</p>
        </div>
      </div>
    );
  }

  // Show sign-in requirement if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-6">🔒</div>
            <h1 className="text-3xl font-bold mb-4">Authentication Required</h1>
            <p className="text-slate-400 mb-6">
              Sign in to access sound management tools and customize your game audio experience.
            </p>
            <button
              onClick={() => setShowSignIn(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              Sign In to Continue
            </button>
            <div className="mt-6">
              <Link
                href="/"
                className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
              >
                ← Back to Game
              </Link>
            </div>
          </div>
        </div>
        {/* TODO: adapt to jfriis auth
        <SignInModal
          isOpen={showSignIn}
          onClose={() => setShowSignIn(false)}
          onSuccess={handleSignInSuccess}
        />
        */}
      </>
    );
  }

  // User is authenticated - show content with navigation
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation Bar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Title */}
            <div className="flex items-center gap-3">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                ← Game
              </Link>
              <div className="h-6 w-px bg-slate-700" />
              <h1 className="text-xl font-bold">🔊 Sound Design</h1>
            </div>

            {/* Main Navigation */}
            <div className="flex items-center gap-1">
              <NavLink href="/sound/effects/library" isActive={pathname === '/sound/effects/library'}>
                Library
              </NavLink>
              <NavLink href="/sound/effects/collections" isActive={pathname === '/sound/effects/collections'}>
                Collections
              </NavLink>
              <NavLink href="/sound/ambient" isActive={pathname === '/sound/ambient'}>
                Ambient
              </NavLink>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">
                {useAuthStore.getState().user?.email}
              </span>
              <button
                onClick={() => useAuthStore.getState().signOut()}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}

// Navigation Link Component
function NavLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      {children}
    </Link>
  );
}
