/**
 * Shared message serialization/deserialization utilities for Luv chat.
 * Used by both client (resume conversation) and server (load history for streamText).
 */
import type { UIMessage } from 'ai';

/**
 * Deserialize a stored database message back to UIMessage format.
 * Falls back to plain text if parts is null.
 * Filters out part types that convertToModelMessages doesn't understand
 * (e.g., 'step-start' and empty reasoning arrays from older stored messages).
 */
const VALID_PART_TYPES = new Set([
  'text', 'tool-invocation', 'tool-call', 'reasoning', 'file', 'source',
]);

/**
 * Transform a legacy `tool-invocation` part (stored by older serializeParts)
 * into the current AI SDK v6 flat format that convertToModelMessages expects.
 */
function migrateToolPart(p: Record<string, unknown>): Record<string, unknown> {
  if (p.type !== 'tool-invocation') return p;
  const inv = p.toolInvocation as Record<string, unknown> | undefined;
  if (!inv) return p;
  return {
    type: `tool-${inv.toolName}` as string, // SDK checks type.startsWith('tool-')
    toolCallId: inv.toolCallId,
    toolName: inv.toolName,
    input: inv.args ?? {},
    output: inv.result ?? null,
    state: inv.state === 'result' ? 'output-available' : (inv.state as string),
  };
}

export function deserializeMessage(m: {
  id: string;
  role: string;
  content: string;
  parts?: object[] | null;
}): UIMessage {
  if (m.parts && Array.isArray(m.parts) && m.parts.length > 0) {
    const validParts = m.parts
      .map((p) => migrateToolPart(p as Record<string, unknown>))
      .filter((p) => {
        const type = p.type as string | undefined;
        if (!type) return false;
        // Accept anything that starts with 'tool-' (SDK v6 convention) or is in our allowlist
        if (!type.startsWith('tool-') && !VALID_PART_TYPES.has(type)) return false;
        // Skip empty reasoning parts (reasoning: [])
        if (type === 'reasoning') {
          const reasoning = p.reasoning;
          if (Array.isArray(reasoning) && reasoning.length === 0) return false;
        }
        return true;
      });

    if (validParts.length > 0) {
      return {
        id: m.id,
        role: m.role as 'user' | 'assistant',
        parts: validParts as UIMessage['parts'],
      };
    }
  }
  return {
    id: m.id,
    role: m.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: m.content }],
  };
}

/**
 * Serialize UIMessage parts to a JSON-safe array for database storage.
 * Strips non-serializable data (functions, blobs) and keeps text, tool calls, and reasoning.
 */
export function serializeParts(msg: UIMessage): object[] | null {
  const hasNonText = msg.parts.some((p) => p.type !== 'text');
  if (!hasNonText) return null; // plain text — content column is sufficient

  return msg.parts.map((p) => {
    if (p.type === 'text') return { type: 'text', text: (p as { text: string }).text };
    // Strip base64 image data from file parts — keep metadata only
    if (p.type === 'file') {
      const fp = p as { type: string; mediaType?: string; filename?: string };
      return { type: 'file', mediaType: fp.mediaType, filename: fp.filename, stored: false };
    }
    // Preserve tool-invocation, reasoning, and other structured parts
    return { ...p };
  });
}

/**
 * Extract text content from a UIMessage.
 */
export function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

/**
 * Serialize parts from streamText onFinish event into JSONB-compatible format.
 * Extracts text, tool-invocation, and reasoning parts from response steps.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeOnFinishParts(event: { text: string; steps: any[] }): object[] | null {
  const parts: object[] = [];

  for (const step of event.steps) {
    // Add reasoning if present
    if (step.reasoning) {
      parts.push({ type: 'reasoning', reasoning: step.reasoning });
    }

    // Add tool calls in SDK v6 flat format (type: 'tool-{name}', flat fields)
    if (Array.isArray(step.toolCalls)) {
      for (const call of step.toolCalls) {
        const matchingResult = Array.isArray(step.toolResults)
          ? step.toolResults.find((r: { toolCallId: string }) => r.toolCallId === call.toolCallId)
          : undefined;
        parts.push({
          type: `tool-${call.toolName}`,
          toolCallId: call.toolCallId,
          toolName: call.toolName,
          input: call.input ?? {},
          output: matchingResult?.output ?? null,
          state: 'output-available',
        });
      }
    }

    // Add text if present
    if (step.text) {
      parts.push({ type: 'text', text: step.text });
    }
  }

  // If only a single text part, return null (content column is sufficient)
  if (parts.length === 1 && (parts[0] as { type: string }).type === 'text') {
    return null;
  }

  return parts.length > 0 ? parts : null;
}
