'use client';

import { useState, useRef, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage, FileUIPart } from 'ai';
import {
  createLuvConversation,
  createLuvMessage,
  getLuvConversation,
  getLuvMessages,
} from '@/lib/luv';
import type { LuvCompactSummary } from '@/lib/types/luv';
import { useLuvChat } from './luv-chat-context';

export const MODEL_OPTIONS = [
  { key: 'claude-sonnet', label: 'Sonnet', vision: true },
  { key: 'claude-haiku', label: 'Haiku', vision: true },
  { key: 'claude-opus', label: 'Opus', vision: true },
  { key: 'gpt-4o', label: 'GPT-4o', vision: true },
  { key: 'gemini-flash', label: 'Gemini', vision: true },
];

/** Model context window sizes in tokens */
const MODEL_TOKEN_BUDGETS: Record<string, number> = {
  'claude-sonnet': 200_000,
  'claude-haiku': 200_000,
  'claude-opus': 200_000,
  'gpt-4o': 128_000,
  'gemini-flash': 1_000_000,
};

/** Estimated system prompt overhead in tokens (soul, chassis, memory, research, changelog, tools) */
const SYSTEM_PROMPT_OVERHEAD_TOKENS = 8_000;

export function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

export type ContextPressureLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ContextPressure {
  ratio: number;
  level: ContextPressureLevel;
  charCount: number;
}

/**
 * Trim older messages to keep the request payload under Vercel's 4.5 MB limit.
 * Strips tool-invocation results and file data from all but the most recent messages,
 * preserving the full content for recent context and display.
 */
const KEEP_FULL_COUNT = 10;

function trimMessagesForTransport(messages: UIMessage[]): UIMessage[] {
  if (messages.length <= KEEP_FULL_COUNT) return messages;

  const cutoff = messages.length - KEEP_FULL_COUNT;
  return messages.map((msg, i) => {
    if (i >= cutoff) return msg; // keep recent messages intact

    const trimmedParts = msg.parts.map((part) => {
      // Strip tool-invocation results (can be very large JSON)
      if (part.type === 'tool-invocation') {
        return { ...part, result: '[trimmed]' };
      }
      // Strip file/image data URLs from older messages
      if (part.type === 'file') {
        return { ...part, url: '', data: undefined };
      }
      return part;
    });

    return { ...msg, parts: trimmedParts } as UIMessage;
  });
}

export function computeContextPressure(messages: UIMessage[], modelKey: string): ContextPressure {
  const charCount = messages.reduce((sum, m) => sum + getMessageText(m).length, 0);
  const tokenBudget = MODEL_TOKEN_BUDGETS[modelKey] ?? 200_000;
  // ~4 chars per token; subtract system prompt overhead
  const availableTokens = tokenBudget - SYSTEM_PROMPT_OVERHEAD_TOKENS;
  const charBudget = availableTokens * 4;
  const ratio = Math.min(charCount / charBudget, 1);
  const level: ContextPressureLevel =
    ratio >= 0.85 ? 'critical' : ratio >= 0.65 ? 'high' : ratio >= 0.4 ? 'medium' : 'low';
  return { ratio, level, charCount };
}

/**
 * Serialize UIMessage parts to a JSON-safe array for database storage.
 * Strips non-serializable data (functions, blobs) and keeps text, tool calls, and reasoning.
 */
function serializeParts(msg: UIMessage): object[] | null {
  const hasNonText = msg.parts.some((p) => p.type !== 'text');
  if (!hasNonText) return null; // plain text — content column is sufficient

  return msg.parts.map((p) => {
    if (p.type === 'text') return { type: 'text', text: (p as { text: string }).text };
    // Preserve tool-invocation, reasoning, and other structured parts
    return { ...p };
  });
}

/**
 * Deserialize stored message parts back to UIMessage format.
 * Falls back to plain text if parts is null.
 */
function deserializeMessage(m: { id: string; role: string; content: string; parts?: object[] | null }): UIMessage {
  if (m.parts && Array.isArray(m.parts) && m.parts.length > 0) {
    return {
      id: m.id,
      role: m.role as 'user' | 'assistant',
      parts: m.parts as UIMessage['parts'],
    };
  }
  return {
    id: m.id,
    role: m.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: m.content }],
  };
}

export function useLuvChatSession() {
  const { activeConversationId, clearActiveConversation, soulData, soulLoaded, pageContext } =
    useLuvChat();

  const [modelKey, setModelKey] = useState('claude-sonnet');
  const [thinking, setThinking] = useState(false);
  const [resumedConversationId, setResumedConversationId] = useState<string | null>(null);
  const [seedContext, setSeedContext] = useState<string | null>(null);
  const [compactSummary, setCompactSummary] = useState<LuvCompactSummary | null>(null);
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<FileUIPart[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isStuckToBottom = useRef(true);

  // Serialize pageData to detect changes within the same pathname (e.g. opening a review session)
  const pageDataKey = JSON.stringify(pageContext.pageData ?? null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/luv/chat',
        prepareSendMessagesRequest: ({ messages: msgs, body: extraBody, headers, credentials, api }) => ({
          body: {
            ...extraBody,
            messages: trimMessagesForTransport(msgs),
          },
          headers,
          credentials,
          api,
        }),
        body: {
          modelKey,
          pageContext,
          thinking,
          seedContext,
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modelKey, thinking, pageContext.pathname, pageDataKey, seedContext]
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
  });

  // Load conversation when activeConversationId changes
  useEffect(() => {
    if (!activeConversationId || activeConversationId === resumedConversationId) return;

    // Capture the ID we're loading — used for staleness check
    const targetId = activeConversationId;
    let cancelled = false;

    (async () => {
      try {
        const [conv, msgs] = await Promise.all([
          getLuvConversation(targetId),
          getLuvMessages(targetId),
        ]);
        if (cancelled) return;

        setModelKey(conv.model);

        // Load compact summary as seed context if present
        if (conv.compact_summary) {
          setSeedContext(conv.compact_summary);
          try {
            setCompactSummary(JSON.parse(conv.compact_summary) as LuvCompactSummary);
          } catch {
            setCompactSummary(null);
          }
        } else {
          setSeedContext(null);
          setCompactSummary(null);
        }

        const uiMessages: UIMessage[] = msgs
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => deserializeMessage(m));

        if (cancelled) return;
        setMessages(uiMessages);
        // Set resumedConversationId last — after messages are loaded
        setResumedConversationId(targetId);
      } catch (err) {
        console.error('Failed to load conversation:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeConversationId, resumedConversationId, setMessages]);

  const isActive = status === 'streaming' || status === 'submitted';

  // Deferred so pressure updates don't block streaming renders
  const deferredMessages = useDeferredValue(messages);
  const contextPressure = useMemo(
    () => computeContextPressure(deferredMessages, modelKey),
    [deferredMessages, modelKey]
  );
  const prevStatusRef = useRef(status);
  const savingRef = useRef(false);

  // Auto-save after each completed exchange
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    const justFinished =
      (prev === 'streaming' || prev === 'submitted') && status === 'ready';
    if (!justFinished || messages.length === 0 || savingRef.current) return;

    savingRef.current = true;
    (async () => {
      try {
        let convId = resumedConversationId;

        if (!convId) {
          // Create new conversation
          const firstUserMsg = messages.find((m) => m.role === 'user');
          const firstText = firstUserMsg ? getMessageText(firstUserMsg) : '';
          const title = firstText
            ? firstText.slice(0, 60) + (firstText.length > 60 ? '...' : '')
            : 'Untitled conversation';

          const conversation = await createLuvConversation({
            title,
            soul_snapshot: soulData,
            model: modelKey,
          });
          convId = conversation.id;
        }

        // Fetch existing message IDs to deduplicate
        const existingMsgs = await getLuvMessages(convId);
        const existingIds = new Set(existingMsgs.map((m) => m.id));

        for (const msg of messages) {
          if ((msg.role === 'user' || msg.role === 'assistant') && !existingIds.has(msg.id)) {
            await createLuvMessage({
              conversation_id: convId,
              role: msg.role,
              content: getMessageText(msg),
              parts: serializeParts(msg),
            });
          }
        }

        // Set resumedConversationId AFTER all messages are inserted
        if (!resumedConversationId) {
          setResumedConversationId(convId);
        }
      } catch (err) {
        console.error('Failed to auto-save conversation:', err);
      } finally {
        savingRef.current = false;
      }
    })();
  }, [status, messages, resumedConversationId, modelKey, soulData]);

  // Track whether user has scrolled away from bottom
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      isStuckToBottom.current = distanceFromBottom < 50;
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll on new content only when stuck to bottom
  useEffect(() => {
    if (!isStuckToBottom.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    // Instant during streaming to avoid animation queue-up
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const addFilesFromFileList = useCallback((files: File[]) => {
    const MAX_BASE64_BYTES = 5 * 1024 * 1024;
    const MAX_DIMENSION = 2048;
    const JPEG_QUALITY = 0.85;

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);

        const estimatedBase64 = file.size * 1.37;
        const needsResize =
          estimatedBase64 > MAX_BASE64_BYTES ||
          img.width > MAX_DIMENSION ||
          img.height > MAX_DIMENSION;

        if (!needsResize) {
          const reader = new FileReader();
          reader.onload = () => {
            setPendingFiles((prev) => [
              ...prev,
              {
                type: 'file',
                mediaType: file.type,
                url: reader.result as string,
                filename: file.name,
              },
            ]);
          };
          reader.readAsDataURL(file);
          return;
        }

        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        setPendingFiles((prev) => [
          ...prev,
          { type: 'file', mediaType: 'image/jpeg', url: dataUrl, filename: file.name },
        ]);
      };
      img.src = URL.createObjectURL(file);
    }
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && pendingFiles.length === 0) || isActive) return;
    const files = pendingFiles.length > 0 ? [...pendingFiles] : undefined;
    setInput('');
    setPendingFiles([]);
    isStuckToBottom.current = true;
    await sendMessage({ text: trimmed || ' ', files });
  }, [input, pendingFiles, isActive, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter((item) => item.type.startsWith('image/'));
      if (imageItems.length === 0) return;
      e.preventDefault();
      const files = imageItems
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);
      addFilesFromFileList(files);
    },
    [addFilesFromFileList]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      addFilesFromFileList(files);
    },
    [addFilesFromFileList]
  );

  const handleClear = useCallback(() => {
    setMessages([]);
    setInput('');
    setPendingFiles([]);
    setResumedConversationId(null);
    setSeedContext(null);
    setCompactSummary(null);
    clearActiveConversation();
  }, [setMessages, clearActiveConversation]);

  return {
    // State
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
    // Refs
    scrollContainerRef,
    messagesEndRef,
    textareaRef,
    fileInputRef,
    contextPressure,
    resumedConversationId,
    compactSummary,
    // Actions
    handleSend,
    handleKeyDown,
    handlePaste,
    handleDrop,
    handleClear,
    addFilesFromFileList,
  };
}
