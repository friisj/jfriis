'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { useStrudelChat } from './strudel-chat-context'
import type { StrudelConversation, StrudelMessage } from './strudel-server'

// Client-side fetchers (bypass server imports)
async function fetchConversation(id: string): Promise<StrudelConversation> {
  const res = await fetch(`/api/strudel/conversations/${id}`)
  if (!res.ok) throw new Error('Failed to load conversation')
  return res.json()
}

async function fetchMessages(convId: string): Promise<StrudelMessage[]> {
  const res = await fetch(`/api/strudel/conversations/${convId}/messages`)
  if (!res.ok) throw new Error('Failed to load messages')
  return res.json()
}

async function createConversation(model: string): Promise<StrudelConversation> {
  const res = await fetch('/api/strudel/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  })
  if (!res.ok) throw new Error('Failed to create conversation')
  return res.json()
}

export function useStrudelChatSession() {
  const {
    activeConversationId,
    setActiveConversationId,
    currentCode,
    lastError,
    replControls,
  } = useStrudelChat()

  const [modelKey, setModelKey] = useState('claude-sonnet')
  const chatIdRef = useRef<string | null>(null)
  const codeRef = useRef(currentCode)
  const errorRef = useRef(lastError)

  // Sync refs via effects to satisfy react-hooks/refs rule
  useEffect(() => { chatIdRef.current = activeConversationId }, [activeConversationId])
  useEffect(() => { codeRef.current = currentCode }, [currentCode])
  useEffect(() => { errorRef.current = lastError }, [lastError])

  // Refs are accessed inside the prepareSendMessagesRequest callback, which runs
  // at send time (not render time). The linter can't distinguish lazy ref reads.
  /* eslint-disable react-hooks/refs */
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/strudel/chat',
        prepareSendMessagesRequest: ({
          messages: msgs,
          body: extraBody,
          headers,
          credentials,
          api,
        }) => ({
          body: {
            ...extraBody,
            latestMessage: msgs[msgs.length - 1],
            chatId: chatIdRef.current,
            currentCode: codeRef.current,
            patternSummary: replControls?.getPatternSummary() || '',
            lastError: errorRef.current,
          },
          headers,
          credentials,
          api,
        }),
        body: { modelKey },
      }),
    [modelKey, replControls]
  )
  /* eslint-enable react-hooks/refs */

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
  })

  const isActive = status === 'streaming' || status === 'submitted'

  // Create conversation on first message if none exists
  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim()) return

      let convId = chatIdRef.current
      if (!convId) {
        const conv = await createConversation(modelKey)
        convId = conv.id
        setActiveConversationId(convId)
        chatIdRef.current = convId
      }

      await sendMessage({
        role: 'user',
        parts: [{ type: 'text', text }],
      })
    },
    [modelKey, sendMessage, setActiveConversationId]
  )

  // Resume existing conversation
  const resumeConversation = useCallback(
    async (id: string) => {
      try {
        const [conv, msgs] = await Promise.all([
          fetchConversation(id),
          fetchMessages(id),
        ])

        setModelKey(conv.model)

        const uiMessages: UIMessage[] = msgs
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            parts: m.parts
              ? (m.parts as Array<{ type: string; text?: string }>)
                  .filter(
                    (p): p is { type: 'text'; text: string } =>
                      p.type === 'text' && !!p.text
                  )
                  .map((p) => ({ type: 'text' as const, text: p.text }))
              : [{ type: 'text' as const, text: m.content }],
            createdAt: new Date(m.created_at),
          }))

        setMessages(uiMessages)
        setActiveConversationId(id)
      } catch (err) {
        console.error('Failed to load conversation:', err)
      }
    },
    [setMessages, setActiveConversationId]
  )

  const clearConversation = useCallback(() => {
    setMessages([])
    setActiveConversationId(null)
    chatIdRef.current = null
  }, [setMessages, setActiveConversationId])

  return {
    messages,
    handleSend,
    resumeConversation,
    clearConversation,
    isActive,
    error,
    modelKey,
    setModelKey,
  }
}
