'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isToolUIPart, getToolName } from 'ai';
import type { UIMessage } from 'ai';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import { usePrivateHeader } from '@/components/layout/private-header-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
    soulData,
    soulLoaded,
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
    <div className="h-dvh flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between h-12 px-4 border-b shrink-0">
        <Link
          href="/tools/luv"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back</span>
        </Link>
        <div className="flex items-center gap-3">
          <select
            value={modelKey}
            onChange={(e) => setModelKey(e.target.value)}
            className="text-sm rounded border bg-background px-2 py-1"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          {messages.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSaveConversation(soulData)}
                disabled={isActive}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={isActive}
              >
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
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
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-2">
          {pendingFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap">
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
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
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
              className="h-auto self-end px-2 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isActive || !soulLoaded}
              title="Attach image"
            >
              <ImagePlus className="size-5" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Message Luv..."
              rows={3}
              className="resize-none text-sm"
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
        <div className="max-w-[75%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap bg-primary text-primary-foreground">
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
      <div className="max-w-[75%] space-y-2">
        {message.parts.map((part, i) => {
          if (part.type === 'text' && part.text) {
            return (
              <div
                key={i}
                className="rounded-lg px-4 py-3 text-sm bg-muted prose prose-sm dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-1.5 max-w-none"
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
