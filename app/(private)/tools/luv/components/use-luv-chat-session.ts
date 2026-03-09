'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage, FileUIPart } from 'ai';
import {
  createLuvConversation,
  createLuvMessage,
  getLuvConversation,
  getLuvMessages,
} from '@/lib/luv';
import type { LuvSoulData } from '@/lib/types/luv';
import { useLuvChat } from './luv-chat-context';

export const MODEL_OPTIONS = [
  { key: 'claude-sonnet', label: 'Sonnet', vision: true },
  { key: 'claude-haiku', label: 'Haiku', vision: true },
  { key: 'claude-opus', label: 'Opus', vision: true },
  { key: 'gpt-4o', label: 'GPT-4o', vision: true },
  { key: 'gemini-flash', label: 'Gemini', vision: true },
];

export function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

export function useLuvChatSession() {
  const { activeConversationId, clearActiveConversation, soulData, soulLoaded } =
    useLuvChat();

  const [modelKey, setModelKey] = useState('claude-sonnet');
  const [resumedConversationId, setResumedConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<FileUIPart[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isStuckToBottom = useRef(true);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/luv/chat',
        body: { modelKey },
      }),
    [modelKey]
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
  });

  // Load conversation when activeConversationId changes
  useEffect(() => {
    if (!activeConversationId || activeConversationId === resumedConversationId) return;

    let cancelled = false;
    (async () => {
      try {
        const [conv, msgs] = await Promise.all([
          getLuvConversation(activeConversationId),
          getLuvMessages(activeConversationId),
        ]);
        if (cancelled) return;

        setModelKey(conv.model);
        setResumedConversationId(activeConversationId);

        const uiMessages: UIMessage[] = msgs
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            parts: [{ type: 'text' as const, text: m.content }],
            createdAt: new Date(m.created_at),
          }));
        setMessages(uiMessages);
      } catch (err) {
        console.error('Failed to load conversation:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeConversationId, resumedConversationId, setMessages]);

  const isActive = status === 'streaming' || status === 'submitted';

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

  const handleSaveConversation = useCallback(
    async (soul: LuvSoulData) => {
      if (messages.length === 0) return;
      try {
        if (resumedConversationId) {
          const existingMsgs = await getLuvMessages(resumedConversationId);
          const existingIds = new Set(existingMsgs.map((m) => m.id));
          for (const msg of messages) {
            if ((msg.role === 'user' || msg.role === 'assistant') && !existingIds.has(msg.id)) {
              await createLuvMessage({
                conversation_id: resumedConversationId,
                role: msg.role,
                content: getMessageText(msg),
              });
            }
          }
        } else {
          const firstUserMsg = messages.find((m) => m.role === 'user');
          const firstText = firstUserMsg ? getMessageText(firstUserMsg) : '';
          const title = firstText
            ? firstText.slice(0, 60) + (firstText.length > 60 ? '...' : '')
            : 'Untitled conversation';

          const conversation = await createLuvConversation({
            title,
            soul_snapshot: soul,
            model: modelKey,
          });

          setResumedConversationId(conversation.id);

          for (const msg of messages) {
            if (msg.role === 'user' || msg.role === 'assistant') {
              await createLuvMessage({
                conversation_id: conversation.id,
                role: msg.role,
                content: getMessageText(msg),
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to save conversation:', err);
      }
    },
    [messages, resumedConversationId, modelKey]
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
    clearActiveConversation();
  }, [setMessages, clearActiveConversation]);

  return {
    // State
    modelKey,
    setModelKey,
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
    // Actions
    handleSend,
    handleKeyDown,
    handleSaveConversation,
    handlePaste,
    handleDrop,
    handleClear,
    addFilesFromFileList,
  };
}
