'use client';

import { useState, useCallback } from 'react';
import { isToolUIPart, getToolName } from 'ai';
import type { UIMessage } from 'ai';
import { IconBrain, IconChevronDown, IconChevronRight, IconCopy, IconVolume, IconPlayerStop, IconLoader2 } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu';
import { getMessageText } from '../use-luv-chat-session';
import { ToolCallCard } from '../tool-call-card';
import { ProposalCard } from '../proposal-card';
import { ImageLightbox } from './image-lightbox';

interface MessageBubbleProps {
  message: UIMessage;
  isLast: boolean;
  isActive: boolean;
  /** Compact sizing for panel context (default: false = fullscreen sizing) */
  compact?: boolean;
}

export function MessageBubble({ message, isLast, isActive, compact = false }: MessageBubbleProps) {
  const [ttsState, setTtsState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [audioRef] = useState<{ current: HTMLAudioElement | null }>({ current: null });

  const handleCopyId = useCallback(() => {
    navigator.clipboard.writeText(message.id);
  }, [message.id]);

  const handleReadAloud = useCallback(async () => {
    if (ttsState === 'playing') {
      // Stop playback
      audioRef.current?.pause();
      audioRef.current = null;
      setTtsState('idle');
      return;
    }

    // Extract text content from message parts
    const text = message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('\n');

    if (!text.trim()) return;

    setTtsState('loading');
    try {
      const res = await fetch('/api/luv/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setTtsState('idle');
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setTtsState('idle');
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();
      setTtsState('playing');
    } catch {
      setTtsState('idle');
    }
  }, [message.parts, ttsState, audioRef]);

  const inner = message.role === 'user'
    ? <UserBubble message={message} compact={compact} />
    : <AssistantBubble message={message} isLast={isLast} isActive={isActive} compact={compact} />;

  const isAssistant = message.role === 'assistant';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>{inner}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {isAssistant && (
          <ContextMenuItem className="text-xs" onClick={handleReadAloud}>
            {ttsState === 'loading' ? (
              <IconLoader2 size={14} className="mr-2 animate-spin" />
            ) : ttsState === 'playing' ? (
              <IconPlayerStop size={14} className="mr-2" />
            ) : (
              <IconVolume size={14} className="mr-2" />
            )}
            {ttsState === 'loading' ? 'Generating...' : ttsState === 'playing' ? 'Stop' : 'Read aloud'}
          </ContextMenuItem>
        )}
        <ContextMenuItem className="text-xs" onClick={handleCopyId}>
          <IconCopy size={14} className="mr-2" />
          Copy trace ID
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function UserBubble({ message, compact }: { message: UIMessage; compact: boolean }) {
  const text = getMessageText(message);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const fileParts = message.parts.filter(
    (p): p is { type: 'file'; mediaType: string; url: string; filename?: string } =>
      p.type === 'file'
  );

  return (
    <div className="flex justify-end">
      <div
        className={
          compact
            ? 'max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap bg-primary text-primary-foreground'
            : 'max-w-[90%] sm:max-w-[75%] rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-sm whitespace-pre-wrap bg-primary text-primary-foreground break-words'
        }
      >
        {fileParts.length > 0 && (
          <div className={compact ? 'flex gap-1.5 flex-wrap mb-1.5' : 'flex gap-2 flex-wrap mb-2'}>
            {fileParts.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightboxSrc(f.url)}
                className="cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.url}
                  alt={f.filename ?? 'User image'}
                  className={compact ? 'max-h-48 rounded-lg object-contain' : 'max-h-64 rounded-lg object-contain'}
                />
              </button>
            ))}
          </div>
        )}
        {text}
      </div>
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}

type PartGroup =
  | { type: 'text'; texts: string[]; lastIndex: number }
  | { type: 'reasoning'; text: string }
  | { type: 'tool'; toolName: string; toolCallId: string; output: unknown; state: string };

/** Coalesce consecutive text parts into single groups so they render as one bubble. */
function groupParts(parts: UIMessage['parts']): PartGroup[] {
  const groups: PartGroup[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part.type === 'text' && part.text) {
      const last = groups[groups.length - 1];
      if (last && last.type === 'text') {
        last.texts.push(part.text);
        last.lastIndex = i;
      } else {
        groups.push({ type: 'text', texts: [part.text], lastIndex: i });
      }
    } else if (part.type === 'reasoning') {
      // Handle both formats: { text: string } (new) and { reasoning: Array } (legacy)
      let reasoningText = '';
      if ('text' in part && part.text) {
        reasoningText = part.text as string;
      } else if ('reasoning' in part && Array.isArray((part as Record<string, unknown>).reasoning)) {
        reasoningText = ((part as Record<string, unknown>).reasoning as Array<{ text?: string }>)
          .filter((r) => r.text)
          .map((r) => r.text)
          .join('\n');
      }
      if (reasoningText) {
        groups.push({ type: 'reasoning', text: reasoningText });
      }
    } else if (isToolUIPart(part)) {
      groups.push({
        type: 'tool',
        toolName: getToolName(part),
        toolCallId: part.toolCallId,
        output: 'output' in part ? part.output : undefined,
        state: part.state,
      });
    }
  }

  return groups;
}

function AssistantBubble({
  message,
  isLast,
  isActive,
  compact,
}: {
  message: UIMessage;
  isLast: boolean;
  isActive: boolean;
  compact: boolean;
}) {
  // Group consecutive text parts into single bubbles so streaming fragments
  // separated by tool calls don't each get their own card.
  const groups = groupParts(message.parts);
  const lastPartIndex = message.parts.length - 1;

  return (
    <div className={compact ? 'flex justify-start' : 'flex justify-start min-w-0'}>
      <div className={compact ? 'max-w-[85%] space-y-1' : 'sm:max-w-[75%] space-y-2 min-w-0'}>
        {groups.map((group, gi) => {
          if (group.type === 'text') {
            const combinedText = group.texts.join('\n\n');
            const isLastGroup = group.lastIndex === lastPartIndex;
            return (
              <div
                key={`text-${gi}`}
                className={
                  compact
                    ? 'rounded-lg px-3 py-2 text-xs bg-muted prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-1.5 prose-pre:my-1 max-w-none'
                    : 'rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-sm bg-muted prose prose-sm dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-1.5 max-w-none break-words [&_pre]:overflow-x-auto [&_pre]:max-w-full'
                }
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {combinedText}
                </ReactMarkdown>
                {isActive && isLast && isLastGroup && (
                  <span
                    className={
                      compact
                        ? 'inline-block w-1 h-3 bg-current animate-pulse ml-0.5'
                        : 'inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5'
                    }
                  />
                )}
              </div>
            );
          }

          if (group.type === 'reasoning') {
            return <ReasoningDisclosure key={`reason-${gi}`} text={group.text} />;
          }

          if (group.type === 'tool') {
            const { toolName, toolCallId, output, state } = group;

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
