'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown } from 'lucide-react';
import { createLuvConversation, createLuvMessage } from '@/lib/luv';
import type { LuvSoulData } from '@/lib/types/luv';
import { ToolCallCard } from './tool-call-card';
import { ProposalCard } from './proposal-card';
import { CompositionPreview } from './composition-preview';

const MODEL_OPTIONS = [
  { key: 'claude-sonnet', label: 'Sonnet' },
  { key: 'claude-haiku', label: 'Haiku' },
  { key: 'claude-opus', label: 'Opus' },
  { key: 'gpt-4o', label: 'GPT-4o' },
  { key: 'gemini-flash', label: 'Gemini' },
];

const READ_TOOLS = new Set([
  'read_soul',
  'read_chassis',
  'list_references',
  'list_prompt_templates',
]);

interface ChatDrawerProps {
  soulData: LuvSoulData;
  soulLoaded: boolean;
}

function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

export function ChatDrawer({ soulData, soulLoaded }: ChatDrawerProps) {
  const [modelKey, setModelKey] = useState('claude-sonnet');
  const [input, setInput] = useState('');
  const [promptOpen, setPromptOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/luv/chat',
        body: { modelKey },
      }),
    [modelKey]
  );

  const { messages, sendMessage, setMessages, status } = useChat({
    transport,
  });

  const isActive = status === 'streaming' || status === 'submitted';

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
    if (!trimmed || isActive) return;
    setInput('');
    await sendMessage({ text: trimmed });
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
      const firstText = firstUserMsg ? getMessageText(firstUserMsg) : '';
      const title = firstText
        ? firstText.slice(0, 60) + (firstText.length > 60 ? '...' : '')
        : 'Untitled conversation';

      const conversation = await createLuvConversation({
        title,
        soul_snapshot: soulData,
        model: modelKey,
      });

      for (const msg of messages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          await createLuvMessage({
            conversation_id: conversation.id,
            role: msg.role,
            content: getMessageText(msg),
          });
        }
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

      {/* Composition Preview */}
      <CompositionPreview
        soulData={soulData}
        open={promptOpen}
        onToggle={() => setPromptOpen(!promptOpen)}
      />

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
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={msg.id === messages[messages.length - 1]?.id}
            isActive={isActive}
          />
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
            disabled={isActive || !soulLoaded}
          />
          <Button
            onClick={handleSend}
            disabled={isActive || !input.trim() || !soulLoaded}
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
              disabled={isActive}
            >
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-1.5"
              onClick={handleSaveConversation}
              disabled={isActive}
            >
              Save
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isLast,
  isActive,
}: {
  message: UIMessage;
  isLast: boolean;
  isActive: boolean;
}) {
  if (message.role === 'user') {
    const text = getMessageText(message);
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap bg-primary text-primary-foreground">
          {text}
        </div>
      </div>
    );
  }

  // Assistant message — render parts
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-1">
        {message.parts.map((part, i) => {
          if (part.type === 'text' && part.text) {
            return (
              <div
                key={i}
                className="rounded-lg px-3 py-2 text-xs bg-muted prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-1.5 prose-pre:my-1 max-w-none"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {part.text}
                </ReactMarkdown>
                {isActive && isLast && i === message.parts.length - 1 && (
                  <span className="inline-block w-1 h-3 bg-current animate-pulse ml-0.5" />
                )}
              </div>
            );
          }

          if (part.type === 'dynamic-tool') {
            const toolName = part.toolName;
            const output =
              'output' in part ? part.output : undefined;

            // Check if output is a proposal
            if (
              output &&
              typeof output === 'object' &&
              'type' in (output as Record<string, unknown>) &&
              ((output as Record<string, unknown>).type === 'soul_change_proposal' ||
                (output as Record<string, unknown>).type === 'chassis_change_proposal')
            ) {
              return (
                <ProposalCard
                  key={part.toolCallId}
                  proposal={output as Parameters<typeof ProposalCard>[0]['proposal']}
                />
              );
            }

            // Read tool
            if (READ_TOOLS.has(toolName)) {
              return (
                <ToolCallCard
                  key={part.toolCallId}
                  toolName={toolName}
                  state={part.state}
                  result={output}
                />
              );
            }

            // Fallback
            return (
              <ToolCallCard
                key={part.toolCallId}
                toolName={toolName}
                state={part.state}
                result={output}
              />
            );
          }

          return null;
        })}
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
