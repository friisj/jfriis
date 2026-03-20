'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { IconArrowUp, IconBrain, IconChevronDown, IconChevronRight, IconDots, IconGitBranch, IconLoader2, IconPhotoPlus, IconSparkles, IconTrash, IconX } from '@tabler/icons-react';
import { composeLayers } from '@/lib/luv/soul-composer';
import { LAYER_REGISTRY } from '@/lib/luv/soul-layers';
import { useLuvChatSession, MODEL_OPTIONS, getMessageText, type ContextPressure } from './use-luv-chat-session';
import { useLuvChat } from './luv-chat-context';
import { ToolCallCard } from './tool-call-card';
import { ProposalCard } from './proposal-card';
import { RecentConversations } from './recent-conversations';

export function ChatDrawer() {
  const {
    modelKey,
    setModelKey,
    thinking,
    setThinking,
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
    contextPressure,
    resumedConversationId,
    compactSummary,
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

  const { resumeConversation } = useLuvChat();
  const [compacting, setCompacting] = useState(false);
  const [branching, setBranching] = useState(false);

  const handleCompact = useCallback(async () => {
    if (!resumedConversationId || compacting) return;
    setCompacting(true);
    try {
      const res = await fetch('/api/luv/compact-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: resumedConversationId, modelKey }),
      });
      if (!res.ok) throw new Error(await res.text());
      // Reload the conversation to pick up the new compact_summary
      resumeConversation(resumedConversationId);
    } catch (err) {
      console.error('Compact failed:', err);
    } finally {
      setCompacting(false);
    }
  }, [resumedConversationId, modelKey, compacting, resumeConversation]);

  const handleBranch = useCallback(async () => {
    if (!resumedConversationId || branching) return;
    setBranching(true);
    try {
      const res = await fetch('/api/luv/branch-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: resumedConversationId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { conversationId: newId } = await res.json() as { conversationId: string };
      handleClear();
      resumeConversation(newId);
    } catch (err) {
      console.error('Branch failed:', err);
    } finally {
      setBranching(false);
    }
  }, [resumedConversationId, branching, handleClear, resumeConversation]);

  const isClaudeModel = modelKey.startsWith('claude-');

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
          <EmptyState soulData={soulData} modelKey={modelKey} thinking={thinking} />
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

      {/* Compact summary seed card — shown when this conversation has seed context */}
      {compactSummary && messages.length === 0 && (
        <CompactSeedCard summary={compactSummary} onBranch={handleBranch} branching={branching} />
      )}

      {/* Input */}
      <div className="border-t shrink-0 space-y-1.5">
        <ContextPressureBar pressure={contextPressure} />
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
                  {isClaudeModel && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => setThinking((t) => !t)}
                      >
                        <IconBrain size={14} className={thinking ? 'text-violet-500 mr-2' : 'mr-2'} />
                        Thinking {thinking ? 'on' : 'off'}
                      </DropdownMenuItem>
                    </>
                  )}
                  {messages.length >= 6 && resumedConversationId && (
                    <>
                      <DropdownMenuSeparator />
                      {!compactSummary && (
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={handleCompact}
                          disabled={isActive || compacting}
                        >
                          {compacting ? (
                            <IconLoader2 size={14} className="mr-2 animate-spin" />
                          ) : (
                            <IconSparkles size={14} className="mr-2" />
                          )}
                          {compacting ? 'Analysing…' : 'Compact conversation'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={handleBranch}
                        disabled={isActive || branching}
                      >
                        {branching ? (
                          <IconLoader2 size={14} className="mr-2 animate-spin" />
                        ) : (
                          <IconGitBranch size={14} className="mr-2" />
                        )}
                        {branching ? 'Branching…' : 'Branch conversation'}
                      </DropdownMenuItem>
                    </>
                  )}
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

          if (part.type === 'reasoning' && 'text' in part && part.text) {
            return <ReasoningDisclosure key={i} text={part.text as string} />;
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
                (output as Record<string, unknown>).type === 'new_module_proposal' ||
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

function CompactSeedCard({
  summary,
  onBranch,
  branching,
}: {
  summary: import('@/lib/types/luv').LuvCompactSummary;
  onBranch: () => void;
  branching: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-3 mb-2 rounded-lg border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20 text-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-violet-600 dark:text-violet-400 hover:bg-violet-100/50 transition-colors"
      >
        <IconSparkles size={12} className="shrink-0" />
        {open ? <IconChevronDown size={12} className="shrink-0" /> : <IconChevronRight size={12} className="shrink-0" />}
        <span className="text-[10px] font-medium">Seeded from compacted session</span>
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 space-y-2">
          <p className="text-[10px] text-violet-700 dark:text-violet-300 leading-relaxed">
            {summary.carry_forward_summary}
          </p>
          {summary.goals.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400 mb-0.5">Goals</p>
              <ul className="text-[10px] text-violet-700 dark:text-violet-300 space-y-0.5 list-disc list-inside">
                {summary.goals.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          )}
          {summary.open_threads.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400 mb-0.5">Open threads</p>
              <ul className="text-[10px] text-violet-700 dark:text-violet-300 space-y-0.5 list-disc list-inside">
                {summary.open_threads.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PRESSURE_COLORS: Record<string, string> = {
  medium: 'bg-amber-400',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

function ContextPressureBar({ pressure }: { pressure: ContextPressure }) {
  if (pressure.level === 'low') return null;

  const pct = Math.round(pressure.ratio * 100);
  const label =
    pressure.level === 'critical'
      ? `~${pct}% context used · consider compacting`
      : pressure.level === 'high'
        ? `~${pct}% context used`
        : null;

  return (
    <div className="relative h-0.5 w-full overflow-hidden" title={`~${pct}% context used`}>
      <div
        className={`h-full transition-all duration-500 ${PRESSURE_COLORS[pressure.level] ?? 'bg-muted'}`}
        style={{ width: `${pct}%` }}
      />
      {label && (
        <span className="absolute right-2 -top-4 text-[9px] text-muted-foreground">
          {label}
        </span>
      )}
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

function ReasoningDisclosure({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const lines = text.split('\n').filter(Boolean);
  const preview = lines[0]?.slice(0, 80) ?? 'Thinking...';

  return (
    <div className="rounded-lg border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20 text-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-violet-600 dark:text-violet-400 hover:bg-violet-100/50 dark:hover:bg-violet-900/20 transition-colors"
      >
        <IconBrain size={12} className="shrink-0" />
        {open ? <IconChevronDown size={12} className="shrink-0" /> : <IconChevronRight size={12} className="shrink-0" />}
        <span className="truncate text-[10px]">
          {open ? 'Thinking' : preview}
        </span>
      </button>
      {open && (
        <div className="px-2.5 pb-2 text-[10px] text-violet-700 dark:text-violet-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
          {text}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  soulData,
  modelKey,
  thinking,
}: {
  soulData: import('@/lib/types/luv').LuvSoulData;
  modelKey: string;
  thinking: boolean;
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
          {modelLabel}{thinking ? ' · thinking' : ''} · {layers.length} layers · {tokenEstimate} tokens
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
