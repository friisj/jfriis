'use client';

import { IconLoader2 } from '@tabler/icons-react';
import type { UIMessage } from 'ai';

/**
 * Pulsing indicator shown when the agent is thinking/processing
 * (between user send and first response, or during tool execution).
 */
export function ThinkingIndicator({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex justify-start">
      <div
        className={
          compact
            ? 'rounded-lg px-3 py-2 bg-muted flex items-center gap-2'
            : 'rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 bg-muted flex items-center gap-2'
        }
      >
        <IconLoader2 size={compact ? 12 : 14} className="animate-spin text-muted-foreground" />
        <span className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
          Thinking...
        </span>
      </div>
    </div>
  );
}

/**
 * Message shown when the agent hit the step limit and stopped mid-response.
 * Prompts the user to send a follow-up to continue.
 */
export function StepLimitMessage({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex justify-start">
      <div
        className={
          compact
            ? 'rounded-lg px-3 py-2 text-xs bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300'
            : 'rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300'
        }
      >
        Reached the tool use limit for this turn. Send a follow-up message to continue.
      </div>
    </div>
  );
}

/**
 * Detect if the last response was truncated by the step limit.
 * Heuristic: status is ready, last message is assistant, and its last
 * part is a tool call (no closing text after final tool use).
 */
export function wasStepLimitHit(status: string, messages: UIMessage[]): boolean {
  if (status !== 'ready' || messages.length === 0) return false;
  const last = messages[messages.length - 1];
  if (last.role !== 'assistant' || last.parts.length === 0) return false;
  const lastPart = last.parts[last.parts.length - 1];
  // If the last part is a tool call (type starts with 'tool-'), the response was cut short
  return typeof lastPart.type === 'string' && lastPart.type.startsWith('tool-');
}
