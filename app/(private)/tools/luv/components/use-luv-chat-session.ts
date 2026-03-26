'use client';

import { useState, useRef, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage, FileUIPart } from 'ai';
import {
  createLuvConversation,
  getLuvConversation,
  getLuvMessages,
} from '@/lib/luv';
import { deserializeMessage, getMessageText } from '@/lib/luv-message-utils';
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

// Re-export from local binding (not cross-boundary) to avoid
// 'use client' / non-client module boundary hook tracking issues
export { getMessageText };

export type ContextPressureLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ContextPressure {
  ratio: number;
  level: ContextPressureLevel;
  charCount: number;
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

export function useLuvChatSession() {
  const { activeConversationId, clearActiveConversation, resumeConversation, soulData, soulLoaded, pageContext } =
    useLuvChat();

  const [modelKey, setModelKey] = useState('claude-sonnet');
  const [thinking, setThinking] = useState(false);
  const [compacting, setCompacting] = useState(false);
  const [branching, setBranching] = useState(false);
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

  // Ref for chatId so the transport closure always reads the current value
  // Set synchronously at render time to avoid useEffect timing gap
  const chatIdRef = useRef<string | null>(null);
  chatIdRef.current = resumedConversationId;

  // Serialize pageData to detect changes within the same pathname (e.g. opening a review session)
  const pageDataKey = JSON.stringify(pageContext.pageData ?? null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/luv/chat',
        prepareSendMessagesRequest: ({ messages: msgs, body: extraBody, headers, credentials, api }) => ({
          body: {
            ...extraBody,
            latestMessage: msgs[msgs.length - 1],
            chatId: chatIdRef.current,
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

    // Eagerly create conversation before first send so server has a chatId
    if (!chatIdRef.current) {
      const title = trimmed
        ? trimmed.slice(0, 60) + (trimmed.length > 60 ? '...' : '')
        : 'Untitled conversation';
      const conv = await createLuvConversation({
        title,
        soul_snapshot: soulData,
        model: modelKey,
      });
      setResumedConversationId(conv.id);
      chatIdRef.current = conv.id;
    }

    const files = pendingFiles.length > 0 ? [...pendingFiles] : undefined;
    setInput('');
    setPendingFiles([]);
    isStuckToBottom.current = true;
    await sendMessage({ text: trimmed || ' ', files });
  }, [input, pendingFiles, isActive, sendMessage, soulData, modelKey]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Heartbeat: conversation lull detection
  const lastUserMessageTime = useRef(Date.now());
  const lullFired = useRef(false);

  // Reset timer on every send
  useEffect(() => {
    lastUserMessageTime.current = Date.now();
    lullFired.current = false;
  }, [input]); // input cleared after send, so this fires on each message

  useEffect(() => {
    const LULL_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
    const CHECK_INTERVAL_MS = 60 * 1000; // check every minute

    const interval = setInterval(() => {
      const convId = chatIdRef.current;
      if (!convId || lullFired.current || isActive) return;
      if (Date.now() - lastUserMessageTime.current < LULL_THRESHOLD_MS) return;

      lullFired.current = true;
      fetch('/api/luv/heartbeat/lull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId }),
      }).catch(() => {});
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isActive]);

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
      setMessages([]);
      setInput('');
      setPendingFiles([]);
      setResumedConversationId(null);
      chatIdRef.current = null;
      setSeedContext(null);
      setCompactSummary(null);
      clearActiveConversation();
      resumeConversation(newId);
    } catch (err) {
      console.error('Branch failed:', err);
    } finally {
      setBranching(false);
    }
  }, [resumedConversationId, branching, setMessages, clearActiveConversation, resumeConversation]);

  const handleTraitsApplied = useCallback(
    (changes: string) => {
      if (chatIdRef.current) {
        sendMessage({ text: `[Soul traits adjusted: ${changes}]` });
      }
    },
    [sendMessage]
  );

  const handleClear = useCallback(() => {
    setMessages([]);
    setInput('');
    setPendingFiles([]);
    setResumedConversationId(null);
    chatIdRef.current = null;
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
    sendMessage,
    handleKeyDown,
    handlePaste,
    handleDrop,
    handleClear,
    handleCompact,
    handleBranch,
    handleTraitsApplied,
    compacting,
    branching,
    addFilesFromFileList,
  };
}
