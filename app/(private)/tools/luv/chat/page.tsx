'use client';

import { useEffect } from 'react';
import { isToolUIPart, getToolName } from 'ai';
import type { UIMessage } from 'ai';
import { IconArrowUp, IconDots, IconPhotoPlus, IconTrash, IconX } from '@tabler/icons-react';
import { usePrivateHeader } from '@/components/layout/private-header-context';
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
import { useLuvChatSession, MODEL_OPTIONS, getMessageText } from '../components/use-luv-chat-session';
import { ToolCallCard } from '../components/tool-call-card';
import { ProposalCard } from '../components/proposal-card';
import { RecentConversations } from '../components/recent-conversations';

export default function LuvChatPage() {
  const { setHidden } = usePrivateHeader();

  useEffect(() => {
    setHidden(true);
    return () => setHidden(false);
  }, [setHidden]);

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
    soulLoaded,
    scrollContainerRef,
    messagesEndRef,
    textareaRef,
    fileInputRef,
    handleSend,
    handleKeyDown,
    handlePaste,
    handleDrop,
    handleClear,
    addFilesFromFileList,
  } = useLuvChatSession();

  return (
    <div className="h-dvh flex flex-col bg-background">

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {!soulLoaded && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Loading...
            </p>
          )}
          {soulLoaded && messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Start a conversation with Luv.
              </p>
              <RecentConversations />
            </div>
          )}
          {messages.map((msg) => (
            <FullscreenMessageBubble
              key={msg.id}
              message={msg}
              isLast={msg.id === messages[messages.length - 1]?.id}
              isActive={isActive}
            />
          ))}
          {status === 'error' && error && (
            <div className="rounded-lg px-4 py-3 text-sm bg-destructive/10 text-destructive border border-destructive/20">
              <p className="font-medium">Error</p>
              <p className="mt-1 opacity-80">{error.message}</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t shrink-0">
        <div className="max-w-3xl mx-auto">
          {pendingFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap px-4 pt-3">
              {pendingFiles.map((f, i) => (
                <div key={i} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.url}
                    alt={f.filename ?? 'Attached image'}
                    className="h-16 w-16 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <IconX size={12}  />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Message Luv..."
              rows={3}
              className="resize-none text-sm border-none rounded-none px-4 py-3 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent shadow-none"
              disabled={isActive || !soulLoaded}
            />
            <div className="flex justify-between items-end px-4 pb-3">
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="shrink-0 p-0 hover:bg-transparent active:bg-transparent"
                      title="Chat menu"
                    >
                      <IconDots size={20}  />
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
                          onClick={handleClear}
                          disabled={isActive}
                        >
                          <IconTrash size={14} className="mr-2" />
                          New conversation
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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
                  <IconPhotoPlus size={20}  />
                </Button>
              </div>
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

function FullscreenMessageBubble({
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
        <div className="max-w-[85%] sm:max-w-[75%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap bg-primary text-primary-foreground break-words">
          {fileParts.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              {fileParts.map((f, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={f.url}
                  alt={f.filename ?? 'User image'}
                  className="max-h-64 rounded-lg object-contain"
                />
              ))}
            </div>
          )}
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] sm:max-w-[75%] space-y-2">
        {message.parts.map((part, i) => {
          if (part.type === 'text' && part.text) {
            return (
              <div
                key={i}
                className="rounded-lg px-4 py-3 text-sm bg-muted prose prose-sm dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-1.5 max-w-none break-words [&_pre]:overflow-x-auto [&_pre]:max-w-[calc(100vw-6rem)]"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {part.text}
                </ReactMarkdown>
                {isActive && isLast && i === message.parts.length - 1 && (
                  <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5" />
                )}
              </div>
            );
          }

          if (isToolUIPart(part)) {
            const toolName = getToolName(part);
            const toolCallId = part.toolCallId;
            const output = 'output' in part ? part.output : undefined;
            const state = part.state;

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
