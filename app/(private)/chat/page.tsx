'use client';
/* eslint-disable react-hooks/refs */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { usePrivateHeader } from '@/components/layout/private-header-context';
import { createAgentConversationClient } from '@/lib/agent-chat-client';
import { IconArrowUp, IconSquare, IconChevronDown, IconPlus, IconAt } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { AGENTS, DEFAULT_AGENT, getAgentConfig } from '@/lib/agents/registry';

const MODEL_OPTIONS = [
  { value: 'claude-sonnet', label: 'Sonnet' },
  { value: 'claude-opus', label: 'Opus' },
  { value: 'claude-haiku', label: 'Haiku' },
];

interface ConversationSummary {
  id: string;
  title: string | null;
  model: string | null;
  turn_count: number;
  updated_at: string;
}

export default function ChatPage() {
  const { setHidden } = usePrivateHeader();
  const [agentId, setAgentId] = useState(DEFAULT_AGENT);
  const agentConfig = getAgentConfig(agentId);
  const agentIdRef = useRef(agentId);
  agentIdRef.current = agentId;
  const [modelKey, setModelKey] = useState('claude-sonnet');
  const [input, setInput] = useState('');
  const chatIdRef = useRef<string | null>(null);
  const [resumedConversationId, setResumedConversationId] = useState<string | null>(null);
  const [recentConversations, setRecentConversations] = useState<ConversationSummary[]>([]);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setHidden(true);
    return () => setHidden(false);
  }, [setHidden]);

  // Load recent conversations on mount
  useEffect(() => {
    fetch(`/api/chat/conversations?agent=${agentId}&limit=10`)
      .then((r) => r.json())
      .then(setRecentConversations)
      .catch(() => {});
  }, [resumedConversationId, agentId]);

  // Check URL for conversation ID and agent on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlAgent = params.get('agent');
    if (urlAgent && AGENTS[urlAgent]) setAgentId(urlAgent);
    const convId = params.get('c');
    if (convId) {
      chatIdRef.current = convId;
      setResumedConversationId(convId);
    }
  }, []);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({ chatId: chatIdRef.current, modelKey, agent: agentIdRef.current }),
    }),
    [modelKey]
  );

  const { messages, sendMessage, setMessages, stop, status } = useChat({ transport });
  const isActive = status === 'streaming' || status === 'submitted';

  // Load conversation metadata + messages when resuming
  useEffect(() => {
    if (!resumedConversationId) return;

    // Fetch conversation to get agent, then messages
    Promise.all([
      fetch(`/api/chat/conversations/${resumedConversationId}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/chat/conversations/${resumedConversationId}/messages`).then((r) => r.ok ? r.json() : []),
    ]).then(([conv, msgs]: [ConversationSummary & { agent?: string } | null, Array<{ id: string; role: string; content: string | null; parts: unknown }>]) => {
      // Set agent from conversation record
      if (conv?.agent && AGENTS[conv.agent]) {
        setAgentId(conv.agent);
      }

      const uiMessages: UIMessage[] = msgs
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          parts: m.parts
            ? (m.parts as UIMessage['parts'])
            : [{ type: 'text' as const, text: m.content ?? '' }],
        }));
      setMessages(uiMessages);
    }).catch(() => {});
  }, [resumedConversationId, setMessages]);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // URL sync
  const syncUrl = useCallback((convId: string, agent?: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('c', convId);
    if (agent) url.searchParams.set('agent', agent);
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Resume a conversation
  const handleResume = useCallback((convId: string) => {
    chatIdRef.current = convId;
    setResumedConversationId(convId);
    syncUrl(convId);
  }, [syncUrl]);

  // New conversation
  const handleNewConversation = useCallback(() => {
    chatIdRef.current = null;
    setResumedConversationId(null);
    setMessages([]);
    setInput('');
    const url = new URL(window.location.href);
    url.search = agentId !== DEFAULT_AGENT ? `?agent=${agentId}` : '';
    window.history.replaceState({}, '', url.toString());
  }, [setMessages, agentId]);

  // Switch agent
  const handleSwitchAgent = useCallback((newAgent: string) => {
    if (newAgent === agentId) return;
    setAgentId(newAgent);
    chatIdRef.current = null;
    setResumedConversationId(null);
    setMessages([]);
    setInput('');
    const url = new URL(window.location.href);
    url.search = newAgent !== DEFAULT_AGENT ? `?agent=${newAgent}` : '';
    window.history.replaceState({}, '', url.toString());
  }, [agentId, setMessages]);

  // Create conversation on first send
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isActive) return;

    if (!chatIdRef.current) {
      try {
        const conv = await createAgentConversationClient({
          agent: agentId,
          title: trimmed.slice(0, 60),
          model: modelKey,
        });
        chatIdRef.current = conv.id;
        setResumedConversationId(conv.id);
        syncUrl(conv.id, agentId);
      } catch (err) {
        console.error('[chat] Failed to create conversation:', err);
        return;
      }
    }

    setInput('');
    await sendMessage({ text: trimmed });
  }, [input, isActive, modelKey, sendMessage, syncUrl]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    // Show mention picker when @ is typed at the end or after whitespace
    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0 && (lastAt === 0 || val[lastAt - 1] === ' ' || val[lastAt - 1] === '\n')) {
      const afterAt = val.slice(lastAt + 1);
      if (!afterAt.includes(' ') && afterAt.length < 20) {
        setShowMentionPicker(true);
        return;
      }
    }
    setShowMentionPicker(false);
  }, []);

  const handleMentionSelect = useCallback((mentionAgentId: string) => {
    const agent = AGENTS[mentionAgentId];
    if (!agent) return;
    // Replace the @partial with @AgentLabel
    const lastAt = input.lastIndexOf('@');
    const before = input.slice(0, lastAt);
    setInput(`${before}@${agent.label} `);
    setShowMentionPicker(false);
    textareaRef.current?.focus();
  }, [input]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && showMentionPicker) {
      setShowMentionPicker(false);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showMentionPicker) {
        setShowMentionPicker(false);
        return;
      }
      handleSend();
    }
  }, [handleSend, showMentionPicker]);

  return (
    <div className="h-lvh flex flex-col bg-background">
      {/* Conversation header — shows active agent when in a conversation */}
      {messages.length > 0 && (
        <div className="border-b px-4 py-2 flex items-center justify-between max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{agentConfig.label}</span>
            <span className="text-[10px] text-muted-foreground">{agentConfig.description}</span>
          </div>
          <button
            onClick={handleNewConversation}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <IconPlus size={12} /> New
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {messages.length === 0 && (
            <div className="py-16">
              <div className="text-center mb-8">
                {/* Agent selector */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  {Object.values(AGENTS).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => handleSwitchAgent(a.id)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        agentId === a.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                <h1 className="text-2xl font-bold mb-1">{agentConfig.label}</h1>
                <p className="text-muted-foreground text-sm">{agentConfig.description}</p>
              </div>

              {/* Recent conversations */}
              {recentConversations.length > 0 && (
                <div className="max-w-md mx-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent</h2>
                    <button
                      onClick={handleNewConversation}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <IconPlus size={12} /> New
                    </button>
                  </div>
                  <div className="divide-y divide-border rounded-lg border">
                    {recentConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleResume(conv.id)}
                        className="w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                      >
                        <div className="text-sm truncate">{conv.title || 'Untitled'}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {conv.turn_count} turns · {timeAgo(conv.updated_at)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isActive && status === 'submitted' && (
            <div className="flex justify-start">
              <div className="text-sm text-muted-foreground animate-pulse">Thinking...</div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <div className="max-w-3xl mx-auto w-full px-4 pb-4">
        <div className="border rounded-2xl bg-card">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${agentConfig.label}... (type @ to mention an agent)`}
              rows={1}
              className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm outline-none placeholder:text-muted-foreground"
              style={{ minHeight: '44px', maxHeight: '200px' }}
            />
            {/* @mention picker */}
            {showMentionPicker && (
              <div className="absolute bottom-full left-2 mb-1 z-10">
                <Command className="border rounded-lg shadow-md bg-popover w-48">
                  <CommandList>
                    {Object.values(AGENTS).map((a) => (
                      <CommandItem
                        key={a.id}
                        onSelect={() => handleMentionSelect(a.id)}
                        className="cursor-pointer"
                      >
                        <IconAt size={14} className="text-muted-foreground" />
                        <span className="font-medium">{a.label}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{a.description}</span>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-1">
              <Select value={modelKey} onValueChange={setModelKey}>
                <SelectTrigger size="sm" className="text-xs w-24 border-none shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {chatIdRef.current && (
                <button
                  onClick={handleNewConversation}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                  title="New conversation"
                >
                  <IconPlus size={14} />
                </button>
              )}
            </div>
            <div className="p-1">
              {isActive ? (
                <button
                  onClick={stop}
                  className="flex items-center justify-center size-8 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors"
                  aria-label="Stop"
                >
                  <IconSquare size={12} stroke={2} className="fill-current text-white" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="flex items-center justify-center size-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full disabled:opacity-30 transition-colors"
                  aria-label="Send"
                >
                  <IconArrowUp size={16} stroke={2} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ---------------------------------------------------------------------------
// Message Bubble
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: UIMessage }) {
  if (message.role === 'user') {
    const text = message.parts.find((p) => p.type === 'text') as { text: string } | undefined;
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap">
          {text?.text}
        </div>
      </div>
    );
  }

  const textParts = message.parts.filter((p) => p.type === 'text') as { text: string }[];
  const combinedText = textParts.map((p) => p.text).join('\n\n');

  const toolParts = message.parts.filter((p) => 'toolName' in p) as Array<{
    toolName: string;
    state: string;
    output?: unknown;
  }>;

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2">
        {toolParts.map((tp, i) => (
          <ToolCallChip key={i} toolName={tp.toolName} state={tp.state} output={tp.output} />
        ))}
        {combinedText && (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{combinedText}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCallChip({ toolName, state, output }: { toolName: string; state: string; output?: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const isComplete = state === 'output-available';

  // Special labeling for delegation
  const isDelegation = toolName === 'delegate_to_agent';
  const delegationTarget = isDelegation && output
    ? (output as Record<string, unknown>).agentLabel as string | undefined
    : undefined;
  const label = isDelegation
    ? delegationTarget ? `Delegated to ${delegationTarget}` : 'Delegating...'
    : toolName.replace(/_/g, ' ');

  return (
    <div className="rounded-md border bg-muted/50 text-xs">
      <button
        type="button"
        onClick={() => isComplete && setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-left"
      >
        <IconChevronDown size={12} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />
        {isDelegation && <IconAt size={12} className="text-muted-foreground" />}
        <span className="font-medium capitalize">{label}</span>
        {!isComplete && <span className="ml-auto text-muted-foreground animate-pulse">
          {isDelegation ? 'delegating...' : 'running...'}
        </span>}
      </button>
      {expanded && output != null && (
        <div className="border-t px-2 py-1.5 max-h-48 overflow-auto">
          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
            {JSON.stringify(output as Record<string, unknown>, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
