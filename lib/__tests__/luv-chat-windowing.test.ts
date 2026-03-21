import { describe, it, expect } from 'vitest';
import { applyMessageWindowing } from '../luv-chat-windowing';
import type { ModelMessage } from 'ai';

function makeUserMessage(text: string): ModelMessage {
  return { role: 'user', content: [{ type: 'text', text }] };
}

function makeAssistantMessage(text: string): ModelMessage {
  return { role: 'assistant', content: [{ type: 'text', text }] };
}

function makeToolResultMessage(): ModelMessage {
  return {
    role: 'tool',
    content: [
      {
        type: 'tool-result',
        toolCallId: 'call_123',
        toolName: 'test_tool',
        output: { bigData: 'x'.repeat(10000) },
      } as ModelMessage['content'] extends Array<infer P> ? P : never,
    ],
  } as ModelMessage;
}

describe('applyMessageWindowing', () => {
  it('returns empty array for empty input', () => {
    expect(applyMessageWindowing([])).toEqual([]);
  });

  it('returns messages unchanged when under the window size', () => {
    const messages = [makeUserMessage('hi'), makeAssistantMessage('hello')];
    expect(applyMessageWindowing(messages, 15)).toEqual(messages);
  });

  it('strips tool-result content from older messages', () => {
    const messages: ModelMessage[] = [];
    // Create 20 turns (40 messages) — beyond default 15 turn window
    for (let i = 0; i < 20; i++) {
      messages.push(makeUserMessage(`turn ${i}`));
      if (i === 2) {
        messages.push(makeToolResultMessage());
      }
      messages.push(makeAssistantMessage(`response ${i}`));
    }

    const windowed = applyMessageWindowing(messages, 15);

    // The tool result in turn 2 should be cleared
    const toolMsg = windowed.find(
      (m) =>
        m.role === 'tool' &&
        Array.isArray(m.content) &&
        (m.content[0] as { type: string }).type === 'tool-result'
    );
    expect(toolMsg).toBeDefined();
    if (toolMsg && Array.isArray(toolMsg.content)) {
      const part = toolMsg.content[0] as { output: unknown };
      expect(part.output).toBe('[cleared]');
    }
  });

  it('preserves recent messages verbatim', () => {
    const messages: ModelMessage[] = [];
    for (let i = 0; i < 20; i++) {
      messages.push(makeUserMessage(`turn ${i}`));
      messages.push(makeAssistantMessage(`response ${i}`));
    }

    const windowed = applyMessageWindowing(messages, 5);

    // Last 5 user turns (and their assistant responses) should be untouched
    const lastUserMsgs = windowed.filter(
      (m) => m.role === 'user' && Array.isArray(m.content)
    );
    const lastFive = lastUserMsgs.slice(-5);
    for (let i = 0; i < 5; i++) {
      const content = lastFive[i].content as Array<{ type: string; text: string }>;
      expect(content[0].text).toBe(`turn ${15 + i}`);
    }
  });

  it('handles string content messages', () => {
    const messages: ModelMessage[] = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ];
    // Even with keepRecentTurns=0, string content should pass through
    const result = applyMessageWindowing(messages, 15);
    expect(result).toEqual(messages);
  });
});
