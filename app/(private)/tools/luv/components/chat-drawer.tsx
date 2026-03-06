'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage, FileUIPart } from 'ai';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, ImagePlus, X } from 'lucide-react';
import { createLuvConversation, createLuvMessage } from '@/lib/luv';
import type { LuvSoulData } from '@/lib/types/luv';
import { ToolCallCard } from './tool-call-card';
import { ProposalCard } from './proposal-card';
import { CompositionPreview } from './composition-preview';

const MODEL_OPTIONS = [
  { key: 'claude-sonnet', label: 'Sonnet', vision: true },
  { key: 'claude-haiku', label: 'Haiku', vision: true },
  { key: 'claude-opus', label: 'Opus', vision: true },
  { key: 'gpt-4o', label: 'GPT-4o', vision: true },
  { key: 'gemini-flash', label: 'Gemini', vision: true },
];

const READ_TOOLS = new Set([
  'read_soul',
  'read_chassis',
  'list_references',
  'list_prompt_templates',
  'list_chassis_modules',
  'read_chassis_module',
  'view_reference_image',
  'view_module_media',
  'review_chassis_module',
  'compose_context_pack',
  'evaluate_generation',
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
  const [pendingFiles, setPendingFiles] = useState<FileUIPart[]>([]);
  const [promptOpen, setPromptOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/luv/chat',
        body: { modelKey },
      }),
    [modelKey]
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({
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

  const addFilesFromFileList = useCallback((files: File[]) => {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPendingFiles((prev) => [
          ...prev,
          { type: 'file', mediaType: file.type, url: dataUrl, filename: file.name },
        ]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && pendingFiles.length === 0) || isActive) return;
    const files = pendingFiles.length > 0 ? [...pendingFiles] : undefined;
    setInput('');
    setPendingFiles([]);
    await sendMessage({ text: trimmed || ' ', files });
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

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter((item) => item.type.startsWith('image/'));
      if (imageItems.length === 0) return;
      e.preventDefault();
      const files = imageItems
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);
      addFilesFromFileList(files);
    },
    [addFilesFromFileList]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      addFilesFromFileList(files);
    },
    [addFilesFromFileList]
  );

  const handleClear = () => {
    setMessages([]);
    setInput('');
    setPendingFiles([]);
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
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
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
        {status === 'error' && error && (
          <div className="rounded-lg px-3 py-2 text-xs bg-destructive/10 text-destructive border border-destructive/20">
            <p className="font-medium">Error</p>
            <p className="mt-0.5 opacity-80">{error.message}</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll indicator */}
      <ScrollIndicator containerRef={messagesEndRef} />

      {/* Input */}
      <div className="border-t px-3 py-2 shrink-0 space-y-1.5">
        {/* Pending image thumbnails */}
        {pendingFiles.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {pendingFiles.map((f, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.url}
                  alt={f.filename ?? 'Attached image'}
                  className="h-12 w-12 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFilesFromFileList(Array.from(e.target.files));
              e.target.value = '';
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-auto self-end px-1.5 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isActive || !soulLoaded}
            title="Attach image"
          >
            <ImagePlus className="size-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Message Luv..."
            rows={2}
            className="resize-none text-xs"
            disabled={isActive || !soulLoaded}
          />
          <Button
            onClick={handleSend}
            disabled={isActive || (!input.trim() && pendingFiles.length === 0) || !soulLoaded}
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
    const fileParts = message.parts.filter(
      (p): p is { type: 'file'; mediaType: string; url: string; filename?: string } =>
        p.type === 'file'
    );
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap bg-primary text-primary-foreground">
          {fileParts.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-1.5">
              {fileParts.map((f, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={f.url}
                  alt={f.filename ?? 'User image'}
                  className="max-h-48 rounded-lg object-contain"
                />
              ))}
            </div>
          )}
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
                (output as Record<string, unknown>).type === 'chassis_change_proposal' ||
                (output as Record<string, unknown>).type === 'module_change_proposal' ||
                (output as Record<string, unknown>).type === 'batch_module_change_proposal')
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
