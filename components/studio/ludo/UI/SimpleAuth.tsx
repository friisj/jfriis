// @ts-nocheck
/**
 * Simple Authentication Component
 *
 * Basic login/logout for audit features
 */

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/studio/ludo/supabase/client';
// TODO: adapt to jfriis auth
// import { useUser } from '@/lib/hooks/useUser';
const useUser = () => ({ user: null, isAuthenticated: false });
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';

export function SimpleAuth() {
  const { user, isAuthenticated } = useUser();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !email) return;

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Check your email for the login link!');
        setEmail('');
      }
    } catch (err) {
      setMessage('Failed to send login link');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;

    setLoading(true);
    try {
      await supabase.auth.signOut();
      setMessage('Signed out successfully');
    } catch (err) {
      setMessage('Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  if (!supabase) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-gray-400">
            Supabase not configured - audit features unavailable
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isAuthenticated && user) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Logged in</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle className="text-sm">Login for Audit Features</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleMagicLinkLogin} className="space-y-3">
          <div>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-800 text-white text-sm"
              disabled={loading}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            size="sm"
            disabled={loading || !email}
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </Button>
        </form>

        {message && (
          <p className={`text-xs ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}

        <p className="text-xs text-gray-500">
          We'll send you a passwordless login link via email
        </p>
      </CardContent>
    </Card>
  );
}
