'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getLuvMessages, deleteLuvConversation } from '@/lib/luv';
import type { LuvConversation, LuvCompactSummary, LuvMessage } from '@/lib/types/luv';
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
  const [branching, setBranching] = useState<string | null>(null);

  const handleBranch = useCallback(async (conversationId: string) => {
    if (branching) return;
    setBranching(conversationId);
    try {
      const res = await fetch('/api/luv/branch-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { conversationId: newId } = await res.json() as { conversationId: string };
      resumeConversation(newId);
    } catch (err) {
      console.error('Branch failed:', err);
    } finally {
      setBranching(null);
    }
  }, [branching, resumeConversation]);

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

function CompactSummaryPreview({ raw }: { raw: string }) {
  const [open, setOpen] = useState(false);
  let summary: LuvCompactSummary | null = null;
  try { summary = JSON.parse(raw) as LuvCompactSummary; } catch { /* skip */ }
  if (!summary) return null;

  return (
    <div className="rounded-md border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-left text-violet-600 dark:text-violet-400 hover:bg-violet-100/50 transition-colors"
      >
        <span className="text-[10px] font-medium flex-1">Compact summary</span>
        <span className="text-[10px] text-muted-foreground">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-[10px] text-violet-700 dark:text-violet-300 leading-relaxed">
            {summary.carry_forward_summary}
          </p>
          {summary.goals.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-violet-500 mb-0.5">Goals</p>
              <ul className="text-[10px] text-violet-700 dark:text-violet-300 list-disc list-inside space-y-0.5">
                {summary.goals.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          )}
          {summary.open_threads.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-violet-500 mb-0.5">Open threads</p>
              <ul className="text-[10px] text-violet-700 dark:text-violet-300 list-disc list-inside space-y-0.5">
                {summary.open_threads.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge variant="outline" className="text-[10px]">
                  {conv.model}
                </Badge>
                {conv.is_compacted && (
                  <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600 dark:text-violet-400">
                    compacted
                  </Badge>
                )}
                {conv.parent_conversation_id && (
                  <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 dark:text-blue-400">
                    branch
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(conv.created_at).toLocaleDateString()}
                </span>
              </div>
            </button>
            <div className="flex gap-1 shrink-0">
              {conv.is_compacted && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-violet-600 dark:text-violet-400"
                  disabled={branching === conv.id}
                  onClick={() => handleBranch(conv.id)}
                >
                  {branching === conv.id ? 'Branching…' : 'Branch'}
                </Button>
              )}
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
              {conv.compact_summary && (
                <CompactSummaryPreview raw={conv.compact_summary} />
              )}
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
