'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown } from 'lucide-react';
import { createLuvConversation, createLuvMessage } from '@/lib/luv';
import type { LuvSoulData } from '@/lib/types/luv';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MODEL_OPTIONS = [
  { key: 'claude-sonnet', label: 'Sonnet' },
  { key: 'claude-haiku', label: 'Haiku' },
  { key: 'claude-opus', label: 'Opus' },
  { key: 'gpt-4o', label: 'GPT-4o' },
  { key: 'gemini-flash', label: 'Gemini' },
];

interface ChatDrawerProps {
  soulData: LuvSoulData;
  soulLoaded: boolean;
}

export function ChatDrawer({ soulData, soulLoaded }: ChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [modelKey, setModelKey] = useState('claude-sonnet');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setStreaming(true);

    try {
      const response = await fetch('/api/luv/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          soulData,
          modelKey,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: assistantContent,
          };
          return updated;
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Failed to get response'}`,
        },
      ]);
    } finally {
      setStreaming(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveConversation = async () => {
    if (messages.length === 0) return;
    try {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 60) +
          (firstUserMsg.content.length > 60 ? '...' : '')
        : 'Untitled conversation';

      const conversation = await createLuvConversation({
        title,
        soul_snapshot: soulData,
        model: modelKey,
      });

      for (const msg of messages) {
        await createLuvMessage({
          conversation_id: conversation.id,
          role: msg.role,
          content: msg.content,
        });
      }
    } catch (err) {
      console.error('Failed to save conversation:', err);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between h-10 px-3 border-b shrink-0">
        <span className="text-xs font-medium">Chat</span>
        <select
          value={modelKey}
          onChange={(e) => setModelKey(e.target.value)}
          className="text-xs rounded border bg-background px-1.5 py-0.5"
        >
          {MODEL_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {!soulLoaded && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Loading...
          </p>
        )}
        {soulLoaded && messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Chat with Luv while you work.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.content}
              {streaming &&
                i === messages.length - 1 &&
                msg.role === 'assistant' && (
                  <span className="inline-block w-1 h-3 bg-current animate-pulse ml-0.5" />
                )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll indicator */}
      <ScrollIndicator containerRef={messagesEndRef} />

      {/* Input */}
      <div className="border-t px-3 py-2 shrink-0 space-y-1.5">
        <div className="flex gap-1.5">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Luv..."
            rows={2}
            className="resize-none text-xs"
            disabled={streaming || !soulLoaded}
          />
          <Button
            onClick={handleSend}
            disabled={streaming || !input.trim() || !soulLoaded}
            size="sm"
            className="h-auto self-end"
          >
            Send
          </Button>
        </div>
        {messages.length > 0 && (
          <div className="flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-1.5"
              onClick={handleClear}
              disabled={streaming}
            >
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-1.5"
              onClick={handleSaveConversation}
              disabled={streaming}
            >
              Save
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ScrollIndicator({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const container = containerRef.current?.parentElement;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScroll(scrollHeight - scrollTop - clientHeight > 40);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef]);

  if (!showScroll) return null;

  return (
    <button
      type="button"
      onClick={() =>
        containerRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
      className="flex items-center justify-center w-6 h-6 rounded-full bg-muted border absolute bottom-20 left-1/2 -translate-x-1/2 shadow-sm hover:bg-accent transition-colors"
    >
      <ChevronDown className="size-3.5" />
    </button>
  );
}
