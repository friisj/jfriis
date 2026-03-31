/**
 * Server-side message windowing for Luv chat.
 * Trims older messages to reduce context sent to the model while preserving
 * recent conversation context and all text content.
 */
import type { ModelMessage } from 'ai';

/**
 * Apply windowing to model messages before sending to the AI provider.
 * - Last `keepRecentTurns` user+assistant pairs: kept verbatim
 * - Older messages: strip tool-result content, image/file data
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

    // For older messages, strip heavy content
    if (typeof msg.content === 'string') return msg;

    const strippedContent = msg.content.map((part) => {
      // Strip tool-result content — output must match OutputSchema (discriminated union),
      // so wrap the cleared marker in a valid { type: 'text', value } object.
      if (part.type === 'tool-result') {
        return {
          ...part,
          output: { type: 'text' as const, value: '[cleared]' },
        };
      }
      // Strip image data (affects extractRecentChatImages — images beyond
      // the window cannot be used as i2i references by tools)
      if (part.type === 'image') {
        return { type: 'text' as const, text: '[image cleared]' };
      }
      // Strip file data (stored URLs are preserved in DB but cleared here;
      // i2i reference extraction only works within the recent turn window)
      if (part.type === 'file') {
        return { type: 'text' as const, text: '[file cleared]' };
      }
      return part;
    });

    return { ...msg, content: strippedContent } as ModelMessage;
  });
}
