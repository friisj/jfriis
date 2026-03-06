'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getLuvMessages, deleteLuvConversation } from '@/lib/luv';
import type { LuvConversation, LuvMessage } from '@/lib/types/luv';
import { useLuvChat } from './luv-chat-context';

interface ConversationHistoryProps {
  conversations: LuvConversation[];
}

export function ConversationHistory({
  conversations: initial,
}: ConversationHistoryProps) {
  const { resumeConversation } = useLuvChat();
  const [conversations, setConversations] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<LuvMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const handleExpand = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      setMessages([]);
      return;
    }

    setLoading(true);
    setExpanded(id);
    try {
      const msgs = await getLuvMessages(id);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this conversation?')) return;
    try {
      await deleteLuvConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (expanded === id) {
        setExpanded(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  if (conversations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No saved conversations yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conv) => (
        <div key={conv.id} className="rounded-lg border">
          <div className="flex items-center gap-3 p-4">
            <button
              type="button"
              onClick={() => handleExpand(conv.id)}
              className="flex-1 text-left min-w-0"
            >
              <span className="font-medium text-sm">
                {conv.title || 'Untitled'}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px]">
                  {conv.model}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(conv.created_at).toLocaleDateString()}
                </span>
              </div>
            </button>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resumeConversation(conv.id)}
              >
                Resume
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => handleDelete(conv.id)}
              >
                Delete
              </Button>
            </div>
          </div>

          {expanded === conv.id && (
            <div className="border-t px-4 py-3 space-y-3 bg-muted/30">
              {loading ? (
                <p className="text-xs text-muted-foreground">Loading...</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
