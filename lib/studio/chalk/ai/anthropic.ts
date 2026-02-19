import Anthropic from "@anthropic-ai/sdk";

// Lazy init — avoid throwing at import time during build
let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set in environment variables");
    }
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

/**
 * Claude Sonnet 4.5 - Use for:
 * - Project-level context and strategy
 * - Complex iterations with visual markup
 * - Admin/management tasks
 * - High-quality rationale generation
 */
export const CLAUDE_MODEL = "claude-sonnet-4-5-20250929" as const;

export type ClaudeMessage = {
  role: "user" | "assistant";
  content: string | Array<{
    type: "text" | "image";
    text?: string;
    source?: {
      type: "base64";
      media_type: string;
      data: string;
    };
  }>;
};

/**
 * Send a message to Claude Sonnet 4.5
 */
export async function sendToClaudeSonnet(
  messages: ClaudeMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }
) {
  const response = await getAnthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: options?.maxTokens ?? 4096,
    temperature: options?.temperature ?? 1.0,
    system: options?.systemPrompt,
    messages: messages as any,
  });

  return response;
}
