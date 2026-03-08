'use client';

import { useEffect, useState } from 'react';
import { getLuvConversations } from '@/lib/luv';
import type { LuvConversation } from '@/lib/types/luv';
import { useLuvChat } from './luv-chat-context';
import { MODEL_OPTIONS } from './use-luv-chat-session';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function modelLabel(key: string): string {
  return MODEL_OPTIONS.find((o) => o.key === key)?.label ?? key;
}

export function RecentConversations({ compact }: { compact?: boolean }) {
  const { resumeConversation } = useLuvChat();
  const [conversations, setConversations] = useState<LuvConversation[] | null>(null);

  useEffect(() => {
    getLuvConversations()
      .then((all) => setConversations(all.slice(0, 5)))
      .catch(() => setConversations([]));
  }, []);

  if (!conversations || conversations.length === 0) return null;

  return (
    <div className={compact ? 'mt-2 space-y-1' : 'mt-4 space-y-1.5'}>
      <p className={`text-muted-foreground font-medium ${compact ? 'text-[10px]' : 'text-xs'}`}>
        Recent conversations
      </p>
      {conversations.map((conv) => (
        <button
          key={conv.id}
          type="button"
          onClick={() => resumeConversation(conv.id)}
          className={`w-full text-left rounded-md border px-3 py-1.5 hover:bg-accent transition-colors flex items-center justify-between gap-2 ${compact ? 'text-xs' : 'text-sm'}`}
        >
          <span className="truncate min-w-0">
            {conv.title || 'Untitled'}
          </span>
          <span className={`shrink-0 text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {modelLabel(conv.model)} · {timeAgo(conv.created_at)}
          </span>
        </button>
      ))}
    </div>
  );
}
