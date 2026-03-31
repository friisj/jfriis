'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Plus, Loader2 } from 'lucide-react'
import type { UIMessage } from 'ai'
import { useStrudelChat } from './strudel-chat-context'
import { useStrudelChatSession } from './use-strudel-chat-session'
import { useStrudelActionDispatch } from './use-strudel-action-dispatch'
import { StrudelActionCard } from './strudel-action-card'

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      {message.parts.map((part, i) => {
        const p = part as Record<string, unknown>

        // Text part
        if (p.type === 'text' && p.text) {
          return (
            <div
              key={i}
              className={`px-3 py-2 rounded-lg text-xs max-w-[90%] whitespace-pre-wrap ${
                isUser
                  ? 'bg-purple-600/30 text-purple-100'
                  : 'bg-white/5 text-zinc-200'
              }`}
            >
              {p.text as string}
            </div>
          )
        }

        // Tool result with strudel_action
        if (typeof p.type === 'string' && p.type.startsWith('tool-')) {
          const output = (p.result ?? p.output) as Record<string, unknown> | undefined
          if (output?.type === 'strudel_action') {
            return (
              <StrudelActionCard
                key={i}
                output={output as { type: 'strudel_action'; action: string; code?: string; description?: string }}
              />
            )
          }
          // Track saved
          if (output?.type === 'track_saved') {
            return (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded bg-blue-500/10 border border-blue-500/20 text-xs font-mono"
              >
                <span className="text-blue-300">Saved track: {output.title as string}</span>
              </div>
            )
          }
        }

        return null
      })}
    </div>
  )
}

export function StrudelChatSidebar() {
  const { replControls, currentCode } = useStrudelChat()
  const {
    messages,
    handleSend,
    clearConversation,
    isActive,
  } = useStrudelChatSession()

  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Get code ref for action dispatch
  const codeRef = useRef(currentCode)
  useEffect(() => { codeRef.current = currentCode }, [currentCode])
  const getCurrentCode = useCallback(() => codeRef.current, [])

  // Dispatch strudel actions from tool results to the REPL
  useStrudelActionDispatch(messages, replControls, getCurrentCode)

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isActive) return
      handleSend(input.trim())
      setInput('')
    },
    [input, isActive, handleSend]
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onSubmit(e)
      }
    },
    [onSubmit]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-xs font-mono text-zinc-400">producer</span>
        <button
          onClick={clearConversation}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          title="New conversation"
        >
          <Plus className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-zinc-500 text-xs font-mono text-center mt-8">
            <p>describe what you want to hear</p>
            <p className="mt-1 text-zinc-600">
              &ldquo;dark minimal techno&rdquo;
            </p>
            <p className="text-zinc-600">
              &ldquo;ambient pad with slow filter&rdquo;
            </p>
            <p className="text-zinc-600">
              &ldquo;make it groovier&rdquo;
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isActive && (
          <div className="flex items-center gap-2 text-zinc-500 text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="border-t border-white/10 p-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="describe the vibe..."
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-purple-500/50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isActive}
            className="p-2 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 disabled:opacity-30 transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-purple-300" />
          </button>
        </div>
      </form>
    </div>
  )
}
