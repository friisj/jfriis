'use client'

/**
 * E6: Sub-Prompt Chat — Full Integration
 *
 * The definitive Sub-Prompt demonstration: full chat UI with bracket notation,
 * @-model routing, streaming resolution, split-pane trace viewer, and
 * conversation history with resolution traces persisted per message.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseSubPrompts, replaceExpressions, getDepthMap } from '@/lib/studio/sub-prompt/parser'
import { getModelOptions, getModelDisplayName } from '@/lib/studio/sub-prompt/model-options'
import type { SubPromptExpression, Resolution, ResolutionTrace } from '@/lib/studio/sub-prompt/types'

const MODEL_OPTIONS = getModelOptions()

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  originalContent?: string // before expansion
  trace?: ResolutionTrace
  modelKey?: string
  timestamp: number
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
      }`}>
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}
        <div className="flex items-center justify-end gap-2 mt-1">
          {message.trace && (
            <span className="text-[10px] opacity-50">
              {message.trace.resolutions.length} resolved · {message.trace.totalLatencyMs}ms
            </span>
          )}
          {message.modelKey && (
            <span className="text-[10px] opacity-50">{getModelDisplayName(message.modelKey)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function TracePanel({
  traces,
  selectedMessageId,
  onSelectMessage,
}: {
  traces: Map<string, ResolutionTrace>
  selectedMessageId: string | null
  onSelectMessage: (id: string) => void
}) {
  const selectedTrace = selectedMessageId ? traces.get(selectedMessageId) : null

  if (traces.size === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-6">
        Send a message with [bracket expressions] to see resolution traces here.
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Trace selector */}
      <div className="border-b p-3">
        <h3 className="text-xs font-bold mb-2">Message Traces</h3>
        <div className="space-y-1 max-h-32 overflow-auto">
          {Array.from(traces.entries()).reverse().map(([msgId, trace]) => (
            <button
              key={msgId}
              onClick={() => onSelectMessage(msgId)}
              className={`w-full text-left text-xs rounded px-2 py-1 transition-colors ${
                selectedMessageId === msgId ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              }`}
            >
              {trace.resolutions.length} resolutions · {trace.totalLatencyMs}ms ·{' '}
              {new Date(trace.timestamp).toLocaleTimeString()}
            </button>
          ))}
        </div>
      </div>

      {/* Selected trace detail */}
      {selectedTrace ? (
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {/* Diff */}
          {selectedTrace.originalPrompt !== selectedTrace.expandedPrompt && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold">Original</h4>
              <div className="bg-muted/50 rounded p-2 font-mono text-xs whitespace-pre-wrap">
                {selectedTrace.originalPrompt}
              </div>
              <h4 className="text-xs font-bold">Expanded</h4>
              <div className="bg-green-50 dark:bg-green-950/20 rounded p-2 font-mono text-xs whitespace-pre-wrap">
                {selectedTrace.expandedPrompt}
              </div>
            </div>
          )}

          {/* Resolution cards */}
          <div className="space-y-2">
            {selectedTrace.resolutions.map(r => {
              const expr = selectedTrace.expressions.find(e => e.id === r.expressionId)
              return (
                <div key={r.expressionId} className={`border rounded p-2 text-xs ${r.status === 'error' ? 'border-red-300' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-muted-foreground">[{r.query}]</div>
                      <div className="font-medium mt-0.5">
                        {r.status === 'error' ? <span className="text-red-600">{r.error}</span> : r.resolvedValue}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      {expr?.modelRoute && (
                        <Badge variant="secondary" className="text-[10px]">@{expr.modelRoute}</Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">{r.modelName}</Badge>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {r.latencyMs}ms · {r.inputTokens + r.outputTokens}tok
                      </span>
                    </div>
                  </div>
                  {/* Latency bar */}
                  <div className="mt-1 h-0.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.latencyMs > 2000 ? 'bg-red-400' : r.latencyMs > 1000 ? 'bg-amber-400' : 'bg-green-400'}`}
                      style={{ width: `${Math.min(r.latencyMs / 3000, 1) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Aggregate stats */}
          <div className="border-t pt-2 text-xs text-muted-foreground">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="font-bold">{selectedTrace.resolutions.length}</div>
                <div>resolutions</div>
              </div>
              <div>
                <div className="font-bold">{selectedTrace.totalLatencyMs}ms</div>
                <div>total latency</div>
              </div>
              <div>
                <div className="font-bold">
                  {selectedTrace.resolutions.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0)}
                </div>
                <div>tokens</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4">
          Select a message trace above
        </div>
      )}
    </div>
  )
}

export default function SubPromptChat() {
  const [input, setInput] = useState('')
  const [parentModelKey, setParentModelKey] = useState('claude-sonnet')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [traces, setTraces] = useState<Map<string, ResolutionTrace>>(new Map())
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const liveExpressions = useMemo(() => parseSubPrompts(input, 'bracket', true), [input])
  const depthMap = useMemo(() => getDepthMap(input), [input])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isProcessing) return
    setError(null)

    const userMsgId = `msg-${Date.now()}`
    const parsed = parseSubPrompts(input, 'bracket', true)

    // Flatten nested expressions (innermost first)
    const flattenExprs = (exprs: SubPromptExpression[]): SubPromptExpression[] => {
      const result: SubPromptExpression[] = []
      for (const e of exprs) {
        if (e.children) result.push(...flattenExprs(e.children))
        result.push(e)
      }
      return result
    }

    let expandedText = input
    let trace: ResolutionTrace | undefined

    setIsProcessing(true)

    try {
      if (parsed.length > 0) {
        // Resolve sub-prompts
        const startTime = performance.now()
        const flatExprs = flattenExprs(parsed)

        const res = await fetch('/api/studio/sub-prompt/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expressions: flatExprs, defaultModelKey: 'claude-haiku' }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Resolution failed')

        const resolutions: Resolution[] = data.resolutions
        const resMap = new Map(resolutions.map(r => [r.expressionId, r.resolvedValue]))
        expandedText = replaceExpressions(input, flatExprs, resMap)

        trace = {
          id: `trace-${Date.now()}`,
          originalPrompt: input,
          expandedPrompt: expandedText,
          expressions: parsed,
          resolutions,
          parentModelKey,
          totalLatencyMs: Math.round(performance.now() - startTime),
          timestamp: Date.now(),
        }
      }

      // Add user message
      const userMsg: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: expandedText,
        originalContent: parsed.length > 0 ? input : undefined,
        trace,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, userMsg])

      if (trace) {
        const traceToAdd = trace
        setTraces(prev => new Map([...prev, [userMsgId, traceToAdd]]))
        setSelectedTraceId(userMsgId)
      }

      // Send to parent model
      const chatRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: expandedText },
          ],
        }),
      })
      const chatData = await chatRes.json()
      if (!chatRes.ok) throw new Error(chatData.error || 'Chat failed')

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: chatData.content,
        modelKey: parentModelKey,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, assistantMsg])
      setInput('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setIsProcessing(false)
    }
  }, [input, parentModelKey, messages, isProcessing])

  // Syntax highlighting for input
  const highlightedInput = useMemo(() => {
    if (depthMap.every(d => d === 0)) return null
    const spans: { text: string; depth: number }[] = []
    let current = { text: '', depth: depthMap[0] ?? 0 }
    for (let i = 0; i < input.length; i++) {
      if (depthMap[i] !== current.depth) {
        if (current.text) spans.push(current)
        current = { text: input[i], depth: depthMap[i] }
      } else {
        current.text += input[i]
      }
    }
    if (current.text) spans.push(current)
    return spans
  }, [input, depthMap])

  return (
    <div className="h-full bg-background text-foreground">
      <ResizablePanelGroup direction="horizontal">
        {/* Left: Chat */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold">Sub-Prompt Chat</h1>
                <p className="text-xs text-muted-foreground">
                  [brackets] resolve before sending · [@agent: query] for routing
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={parentModelKey}
                  onChange={e => setParentModelKey(e.target.value)}
                  className="text-xs border rounded px-2 py-1 bg-background"
                >
                  {MODEL_OPTIONS.map(m => (
                    <option key={m.key} value={m.key}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-12 space-y-3">
                  <p className="font-medium">Try a prompt with sub-prompts:</p>
                  <div className="space-y-2 text-xs font-mono max-w-md mx-auto text-left">
                    <p className="bg-muted/50 rounded p-2">
                      Explain [the term for when neural networks forget old tasks] in the context of fine-tuning LLMs.
                    </p>
                    <p className="bg-muted/50 rounded p-2">
                      Compare [@code-expert: the fastest sorting algorithm for nearly-sorted data] with [@code-expert: the best general-purpose sorting algorithm] for a [@terminology: the data structure used in database indexing].
                    </p>
                    <p className="bg-muted/50 rounded p-2">
                      Is it true that [@fact-checker: transformer architecture was invented at Google in 2017]? How did it lead to [the breakthrough that made GPT possible]?
                    </p>
                  </div>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id}>
                  {msg.originalContent && (
                    <div className="text-[10px] text-muted-foreground mb-1 font-mono truncate max-w-[80%] ml-auto text-right">
                      Original: {msg.originalContent.slice(0, 80)}{msg.originalContent.length > 80 ? '...' : ''}
                    </div>
                  )}
                  <MessageBubble message={msg} />
                  {msg.trace && (
                    <button
                      onClick={() => setSelectedTraceId(msg.id)}
                      className={`text-[10px] mt-0.5 ml-auto block text-right transition-colors ${
                        selectedTraceId === msg.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      View trace →
                    </button>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t p-3 space-y-2">
              {/* Syntax preview */}
              {highlightedInput && (
                <div className="bg-muted/30 rounded px-2 py-1 font-mono text-xs whitespace-pre-wrap max-h-16 overflow-auto">
                  {highlightedInput.map((span, i) => (
                    <span key={i} className={span.depth > 0 ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded px-0.5' : ''}>
                      {span.text}
                    </span>
                  ))}
                </div>
              )}

              {/* Expression badges */}
              {liveExpressions.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {liveExpressions.map(e => (
                    <Badge key={e.id} variant="secondary" className="text-[10px]">
                      {e.modelRoute ? `@${e.modelRoute}` : 'default'}: {e.query.slice(0, 30)}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Type a message with [sub-prompts]..."
                  className="min-h-[60px] max-h-[120px] font-mono text-sm resize-none"
                  disabled={isProcessing}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isProcessing}
                  className="self-end"
                  size="sm"
                >
                  {isProcessing ? '...' : 'Send'}
                </Button>
              </div>

              {error && <div className="text-xs text-red-600">{error}</div>}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right: Trace */}
        <ResizablePanel defaultSize={40} minSize={25}>
          <TracePanel
            traces={traces}
            selectedMessageId={selectedTraceId}
            onSelectMessage={setSelectedTraceId}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
