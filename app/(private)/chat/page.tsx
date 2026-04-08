'use client';
/* eslint-disable react-hooks/refs */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { usePrivateHeader } from '@/components/layout/private-header-context';
import { IconArrowUp, IconSquare, IconChevronDown } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MODEL_OPTIONS = [
  { value: 'claude-sonnet', label: 'Sonnet' },
  { value: 'claude-opus', label: 'Opus' },
  { value: 'claude-haiku', label: 'Haiku' },
];

export default function ChatPage() {
  const { setHidden } = usePrivateHeader();
  const [modelKey, setModelKey] = useState('claude-sonnet');
  const [input, setInput] = useState('');
  const chatIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setHidden(true);
    return () => setHidden(false);
  }, [setHidden]);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({ chatId: chatIdRef.current, modelKey, agent: 'chief' }),
    }),
    [modelKey]
  );

  const { messages, sendMessage, stop, status } = useChat({ transport });
  const isActive = status === 'streaming' || status === 'submitted';

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create conversation on first send
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isActive) return;

    if (!chatIdRef.current) {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'chief',
          title: trimmed.slice(0, 60),
          model: modelKey,
        }),
      });
      if (!res.ok) {
        console.error('[chat] Failed to create conversation:', res.status);
        return;
      }
      const conv = await res.json();
      chatIdRef.current = conv.id;
    }

    setInput('');
    await sendMessage({ text: trimmed });
  }, [input, isActive, modelKey, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="h-lvh flex flex-col bg-background">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-24">
              <h1 className="text-2xl font-bold mb-2">Chief</h1>
              <p className="text-muted-foreground text-sm">Operations & orchestration agent</p>
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
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Chief..."
            rows={1}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm outline-none placeholder:text-muted-foreground"
            style={{ minHeight: '44px', maxHeight: '200px' }}
          />
          <div className="flex items-center justify-between px-2 pb-2">
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

  // Assistant
  const textParts = message.parts.filter((p) => p.type === 'text') as { text: string }[];
  const combinedText = textParts.map((p) => p.text).join('\n\n');

  // Tool calls
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
  const label = toolName.replace(/_/g, ' ');
  const isComplete = state === 'output-available';

  return (
    <div className="rounded-md border bg-muted/50 text-xs">
      <button
        type="button"
        onClick={() => isComplete && setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-left"
      >
        <IconChevronDown size={12} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />
        <span className="font-medium capitalize">{label}</span>
        {!isComplete && <span className="ml-auto text-muted-foreground animate-pulse">running...</span>}
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
