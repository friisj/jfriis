'use client';

import { useState } from 'react';
import { isToolUIPart, getToolName } from 'ai';
import type { UIMessage } from 'ai';
import { IconBrain, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getMessageText } from '../use-luv-chat-session';
import { ToolCallCard } from '../tool-call-card';
import { ProposalCard } from '../proposal-card';

interface MessageBubbleProps {
  message: UIMessage;
  isLast: boolean;
  isActive: boolean;
  /** Compact sizing for panel context (default: false = fullscreen sizing) */
  compact?: boolean;
}

export function MessageBubble({ message, isLast, isActive, compact = false }: MessageBubbleProps) {
  if (message.role === 'user') {
    return <UserBubble message={message} compact={compact} />;
  }
  return <AssistantBubble message={message} isLast={isLast} isActive={isActive} compact={compact} />;
}

function UserBubble({ message, compact }: { message: UIMessage; compact: boolean }) {
  const text = getMessageText(message);
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
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={f.url}
                alt={f.filename ?? 'User image'}
                className={compact ? 'max-h-48 rounded-lg object-contain' : 'max-h-64 rounded-lg object-contain'}
              />
            ))}
          </div>
        )}
        {text}
      </div>
    </div>
  );
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
  return (
    <div className={compact ? 'flex justify-start' : 'flex justify-start min-w-0'}>
      <div className={compact ? 'max-w-[85%] space-y-1' : 'sm:max-w-[75%] space-y-2 min-w-0'}>
        {message.parts.map((part, i) => {
          if (part.type === 'text' && part.text) {
            return (
              <div
                key={i}
                className={
                  compact
                    ? 'rounded-lg px-3 py-2 text-xs bg-muted prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-1.5 prose-pre:my-1 max-w-none'
                    : 'rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-sm bg-muted prose prose-sm dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-1.5 max-w-none break-words [&_pre]:overflow-x-auto [&_pre]:max-w-full'
                }
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {part.text}
                </ReactMarkdown>
                {isActive && isLast && i === message.parts.length - 1 && (
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

          if (part.type === 'reasoning' && 'text' in part && part.text) {
            return <ReasoningDisclosure key={i} text={part.text as string} />;
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
