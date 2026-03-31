/**
 * Server-side message windowing + tool result summarization for Luv chat.
 *
 * Two passes:
 * 1. applyMessageWindowing — strip image/file data from old turns
 * 2. summarizeToolResults — replace full tool result payloads with
 *    compact one-liners, keeping only the last N with full detail
 */
import type { ModelMessage } from 'ai';
import { summarizeToolResult } from './luv-tool-summaries';

/**
 * Apply windowing to model messages before sending to the AI provider.
 * - Last `keepRecentTurns` user+assistant pairs: kept verbatim
 * - Older messages: strip image/file data (tool results handled separately by summarizeToolResults)
 * - Text content from all messages is preserved
 */
export function applyMessageWindowing(
  messages: ModelMessage[],
  keepRecentTurns = 8
): ModelMessage[] {
  if (messages.length === 0) return messages;

  // Count user+assistant turn pairs from the end
  let turnPairsFound = 0;
  let cutoffIndex = messages.length;

  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      turnPairsFound++;
      if (turnPairsFound > keepRecentTurns) {
        cutoffIndex = i;
        break;
      }
    }
  }

  // If all messages fit within the window, return as-is
  if (cutoffIndex === messages.length || cutoffIndex === 0) return messages;

  return messages.map((msg, i) => {
    if (i >= cutoffIndex) return msg; // recent — keep verbatim

    // For older messages, strip heavy content (except tool results — summarized separately)
    if (typeof msg.content === 'string') return msg;

    const strippedContent = msg.content.map((part) => {
      // Strip image data
      if (part.type === 'image') {
        return { type: 'text' as const, text: '[image cleared]' };
      }
      // Strip file data
      if (part.type === 'file') {
        return { type: 'text' as const, text: '[file cleared]' };
      }
      return part;
    });

    return { ...msg, content: strippedContent } as ModelMessage;
  });
}

/**
 * Replace full tool result payloads with compact summaries.
 * Keeps the last `keepFullCount` tool results with full detail.
 * All older results get one-line summaries with toolCallId for retrieval.
 *
 * Call AFTER applyMessageWindowing, BEFORE sending to streamText.
 */
export function summarizeToolResults(
  messages: ModelMessage[],
  keepFullCount = 2,
): ModelMessage[] {
  // First pass: count total tool-result parts from the end
  let totalToolResults = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (typeof msg.content === 'string') continue;
    for (const part of msg.content) {
      if (part.type === 'tool-result') totalToolResults++;
    }
  }

  // If we have fewer than keepFullCount, nothing to summarize
  if (totalToolResults <= keepFullCount) return messages;

  // Second pass: keep last N full, summarize the rest
  const summarizeThreshold = totalToolResults - keepFullCount;
  let toolResultIndex = 0;

  return messages.map((msg) => {
    if (typeof msg.content === 'string') return msg;

    let changed = false;
    const newContent = msg.content.map((part) => {
      if (part.type !== 'tool-result') return part;

      const currentIndex = toolResultIndex++;

      // Keep the last `keepFullCount` results with full detail
      if (currentIndex >= summarizeThreshold) {
        return part;
      }

      // Summarize this result
      changed = true;
      const toolResult = part as { type: string; toolCallId: string; toolName: string; output: unknown };
      const summary = summarizeToolResult(
        toolResult.toolName ?? 'unknown',
        toolResult.output,
        toolResult.toolCallId ?? 'unknown',
      );

      return {
        ...part,
        output: { type: 'text' as const, value: summary },
      };
    });

    return changed ? { ...msg, content: newContent } as ModelMessage : msg;
  });
}
