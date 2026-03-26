'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useLuvChat } from './luv-chat-context';

export interface PresenceSignal {
  type: 'reflecting' | 'analyzing' | 'suggesting' | 'curious';
  context: Record<string, unknown>;
  expiresAt: Date;
}

/**
 * Subscribe to real-time presence signals for the active Luv conversation.
 * Returns the latest non-expired signal, auto-clears on expiry.
 */
export function useLuvPresence(): { signal: PresenceSignal | null } {
  const { activeConversationId } = useLuvChat();
  const [signal, setSignal] = useState<PresenceSignal | null>(null);

  // Clear expired signal
  const clearIfExpired = useCallback(() => {
    setSignal((prev) => {
      if (!prev) return null;
      return prev.expiresAt.getTime() > Date.now() ? prev : null;
    });
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      setSignal(null);
      return;
    }

    // Subscribe to new presence signals for this conversation
    const channel = supabase
      .channel(`presence:${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'luv_presence_signals',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const row = payload.new as {
            signal_type: string;
            context: Record<string, unknown>;
            expires_at: string;
          };
          const expiresAt = new Date(row.expires_at);
          if (expiresAt.getTime() <= Date.now()) return; // already expired

          setSignal({
            type: row.signal_type as PresenceSignal['type'],
            context: row.context,
            expiresAt,
          });
        }
      )
      .subscribe();

    // Expiry check interval
    const interval = setInterval(clearIfExpired, 5000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [activeConversationId, clearIfExpired]);

  return { signal };
}
