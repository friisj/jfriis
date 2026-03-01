'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { composeSoulSystemPrompt } from '@/lib/luv-prompt-composer';
import {
  createLuvConversation,
  createLuvMessage,
  getLuvMessages,
} from '@/lib/luv';
import type { LuvSoulData, LuvConversation } from '@/lib/types/luv';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  soulData: LuvSoulData;
  savedConversations: LuvConversation[];
}

const MODEL_OPTIONS = [
  { key: 'claude-sonnet', label: 'Claude Sonnet' },
  { key: 'claude-haiku', label: 'Claude Haiku' },
  { key: 'claude-opus', label: 'Claude Opus' },
  { key: 'gpt-4o', label: 'GPT-4o' },
  { key: 'gemini-flash', label: 'Gemini Flash' },
];

export function ChatInterface({
  soulData,
  savedConversations,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [modelKey, setModelKey] = useState('claude-sonnet');
  const [showPrompt, setShowPrompt] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const composedPrompt = composeSoulSystemPrompt(soulData);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setStreaming(true);

    try {
      const response = await fetch('/api/luv/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          soulData,
          modelKey,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '' },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: assistantContent,
          };
          return updated;
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Failed to get response'}`,
        },
      ]);
    } finally {
      setStreaming(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveConversation = async () => {
    if (messages.length === 0) return;

    try {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 60) + (firstUserMsg.content.length > 60 ? '...' : '')
        : 'Untitled conversation';

      const conversation = await createLuvConversation({
        title,
        soul_snapshot: soulData,
        model: modelKey,
      });

      for (const msg of messages) {
        await createLuvMessage({
          conversation_id: conversation.id,
          role: msg.role,
          content: msg.content,
        });
      }

      setConversationId(conversation.id);
      alert('Conversation saved');
    } catch (err) {
      console.error('Failed to save conversation:', err);
      alert('Failed to save conversation');
    }
  };

  const handleLoadConversation = async (conv: LuvConversation) => {
    try {
      const msgs = await getLuvMessages(conv.id);
      setMessages(
        msgs.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      );
      setConversationId(conv.id);
      setModelKey(conv.model);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInput('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6">
      {/* Sidebar */}
      <div className="space-y-4">
        <Button onClick={handleNewChat} variant="outline" className="w-full">
          New Chat
        </Button>

        <div>
          <label className="text-sm font-medium">Model</label>
          <select
            value={modelKey}
            onChange={(e) => setModelKey(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowPrompt(!showPrompt)}
        >
          {showPrompt ? 'Hide' : 'Show'} System Prompt
        </Button>

        {showPrompt && (
          <pre className="text-xs bg-muted rounded-md p-3 max-h-60 overflow-y-auto whitespace-pre-wrap font-mono">
            {composedPrompt}
          </pre>
        )}

        {savedConversations.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Saved</h3>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {savedConversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => handleLoadConversation(conv)}
                  className={`w-full text-left text-xs rounded-md px-2 py-1.5 hover:bg-accent transition-colors truncate ${
                    conversationId === conv.id
                      ? 'bg-accent text-accent-foreground'
                      : ''
                  }`}
                >
                  {conv.title || 'Untitled'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex flex-col h-[calc(100vh-16rem)]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">
              Start a conversation with Luv.
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {msg.content}
                {streaming &&
                  i === messages.length - 1 &&
                  msg.role === 'assistant' && (
                    <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5" />
                  )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Luv... (Enter to send, Shift+Enter for newline)"
              rows={2}
              className="resize-none"
              disabled={streaming}
            />
            <div className="flex flex-col gap-1">
              <Button
                onClick={handleSend}
                disabled={streaming || !input.trim()}
                className="h-full"
              >
                Send
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveConversation}
              disabled={messages.length === 0 || streaming}
            >
              Save Conversation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
