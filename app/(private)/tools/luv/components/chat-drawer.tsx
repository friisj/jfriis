'use client';

import { useState, useEffect } from 'react';
import { isToolUIPart, getToolName } from 'ai';
import type { UIMessage } from 'ai';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IconArrowUp, IconChevronDown, IconDots, IconPhotoPlus, IconDeviceFloppy, IconTrash, IconX } from '@tabler/icons-react';
import { composeLayers } from '@/lib/luv/soul-composer';
import { LAYER_REGISTRY } from '@/lib/luv/soul-layers';
import { useLuvChatSession, MODEL_OPTIONS, getMessageText } from './use-luv-chat-session';
import { ToolCallCard } from './tool-call-card';
import { ProposalCard } from './proposal-card';
import { RecentConversations } from './recent-conversations';

export function ChatDrawer() {
  const {
    modelKey,
    setModelKey,
    input,
    setInput,
    pendingFiles,
    setPendingFiles,
    messages,
    status,
    error,
    isActive,
    soulData,
    soulLoaded,
    scrollContainerRef,
    messagesEndRef,
    textareaRef,
    fileInputRef,
    handleSend,
    handleKeyDown,
    handleSaveConversation,
    handlePaste,
    handleDrop,
    handleClear,
    addFilesFromFileList,
  } = useLuvChatSession();

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages */}
      <div
        ref={scrollContainerRef}
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
          <EmptyState soulData={soulData} modelKey={modelKey} />
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
      <ScrollIndicator scrollContainerRef={scrollContainerRef} messagesEndRef={messagesEndRef} />

      {/* Input */}
      <div className="border-t shrink-0 space-y-1.5">
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
                  <IconX size={10}  />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col">
          <div className="flex">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Message Luv..."
              rows={2}
              className="resize-none text-xs border-none rounded-none p-4 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent shadow-none"
              disabled={isActive || !soulLoaded}
            />
          </div>
          <div className="flex justify-between items-end">
            <div className="flex gap-2 px-4 pb-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="h-auto self-end shrink-0 p-0 hover:bg-transparent active:bg-transparent"
                    title="Chat menu"
                  >
                    <IconDots size={16}  />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-48">
                  <DropdownMenuLabel className="text-[10px]">Model</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={modelKey} onValueChange={setModelKey}>
                    {MODEL_OPTIONS.map((opt) => (
                      <DropdownMenuRadioItem key={opt.key} value={opt.key} className="text-xs">
                        {opt.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  {messages.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => handleSaveConversation(soulData)}
                        disabled={isActive}
                      >
                        <IconDeviceFloppy size={14} className="mr-2" />
                        IconDeviceFloppy conversation
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={handleClear}
                        disabled={isActive}
                      >
                        <IconTrash size={14} className="mr-2" />
                        Clear conversation
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto self-end px-1.5 shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={isActive || !soulLoaded}
                title="Attach image"
              >
                <IconPhotoPlus size={16}  />
              </Button>
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
            </div>
            <div className="flex-1 flex justify-end px-4 pb-4">
              <Button
                onClick={handleSend}
                disabled={isActive || (!input.trim() && pendingFiles.length === 0) || !soulLoaded}
                size="sm"
                className="h-auto self-end size-8 p-2"
              >
                <IconArrowUp size={16}  />
              </Button>
            </div>
          </div>
        </div>
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

          if (isToolUIPart(part)) {
            const toolName = getToolName(part);
            const toolCallId = part.toolCallId;
            const output =
              'output' in part ? part.output : undefined;
            const state = part.state;

            // Check if output is a proposal
            if (
              output &&
              typeof output === 'object' &&
              'type' in (output as Record<string, unknown>) &&
              ((output as Record<string, unknown>).type === 'soul_change_proposal' ||
                (output as Record<string, unknown>).type === 'chassis_change_proposal' ||
                (output as Record<string, unknown>).type === 'module_change_proposal' ||
                (output as Record<string, unknown>).type === 'batch_module_change_proposal' ||
                (output as Record<string, unknown>).type === 'facet_change_proposal')
            ) {
              return (
                <ProposalCard
                  key={toolCallId}
                  proposal={output as Parameters<typeof ProposalCard>[0]['proposal']}
                />
              );
            }

            return (
              <ToolCallCard
                key={toolCallId}
                toolName={toolName}
                state={state}
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
  scrollContainerRef,
  messagesEndRef,
}: {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScroll(scrollHeight - scrollTop - clientHeight > 40);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  if (!showScroll) return null;

  return (
    <button
      type="button"
      onClick={() =>
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
      className="flex items-center justify-center w-6 h-6 rounded-full bg-muted border absolute bottom-20 left-1/2 -translate-x-1/2 shadow-sm hover:bg-accent transition-colors"
    >
      <IconChevronDown size={14}  />
    </button>
  );
}

function EmptyState({
  soulData,
  modelKey,
}: {
  soulData: import('@/lib/types/luv').LuvSoulData;
  modelKey: string;
}) {
  const { layers, tokenEstimate } = composeLayers(soulData);
  const modelLabel = MODEL_OPTIONS.find((o) => o.key === modelKey)?.label ?? modelKey;

  return (
    <div className="text-center py-4 space-y-3">
      <p className="text-xs text-muted-foreground">
        Chat with Luv while you work.
      </p>
      <div className="text-left rounded-md border bg-muted/30 px-2.5 py-2 space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground">
          {modelLabel} · {layers.length} layers · {tokenEstimate} tokens
        </p>
        <div className="flex flex-wrap gap-1">
          {layers.map((layer) => {
            const meta = LAYER_REGISTRY[layer.type];
            return (
              <span
                key={layer.id}
                className="inline-block text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground"
              >
                {meta?.label ?? layer.type}
              </span>
            );
          })}
        </div>
      </div>
      <RecentConversations compact />
    </div>
  );
}
