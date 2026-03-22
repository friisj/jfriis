'use client'

/**
 * E1: Core Parser & Single-Model Resolution
 *
 * Foundational spike: parse [square bracket] expressions from user input,
 * resolve each via a fast model, replace brackets with resolved values,
 * then send the expanded prompt to the parent model.
 */

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseSubPrompts, replaceExpressions, getDepthMap } from '@/lib/studio/sub-prompt/parser'
import { getModelOptions, getModelDisplayName } from '@/lib/studio/sub-prompt/model-options'
import type { SubPromptExpression, Resolution } from '@/lib/studio/sub-prompt/types'

const MODEL_OPTIONS = getModelOptions()

export default function SubPromptPrototype() {
  const [input, setInput] = useState('')
  const [resolverModelKey, setResolverModelKey] = useState('claude-haiku')
  const [parentModelKey, setParentModelKey] = useState('claude-sonnet')
  const [expressions, setExpressions] = useState<SubPromptExpression[]>([])
  const [resolutions, setResolutions] = useState<Resolution[]>([])
  const [expandedPrompt, setExpandedPrompt] = useState('')
  const [parentResponse, setParentResponse] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Live-parse expressions as user types
  const liveExpressions = useMemo(() => parseSubPrompts(input), [input])
  const depthMap = useMemo(() => getDepthMap(input), [input])

  // Syntax-highlighted preview
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

  const handleResolveAndSend = useCallback(async () => {
    setError(null)
    const parsed = parseSubPrompts(input)
    setExpressions(parsed)

    if (parsed.length === 0) {
      // No sub-prompts — send directly to parent model
      setExpandedPrompt(input)
      setIsExecuting(true)
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: input }],
            model: parentModelKey === 'claude-sonnet' ? 'claude-sonnet-4-20250514' : undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Chat failed')
        setParentResponse(data.content)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed')
      } finally {
        setIsExecuting(false)
      }
      return
    }

    // Step 1: Resolve sub-prompts
    setIsResolving(true)
    try {
      const res = await fetch('/api/studio/sub-prompt/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expressions: parsed,
          defaultModelKey: resolverModelKey,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Resolution failed')

      const resolvedList: Resolution[] = data.resolutions
      setResolutions(resolvedList)

      // Step 2: Build expanded prompt
      const resMap = new Map(resolvedList.map(r => [r.expressionId, r.resolvedValue]))
      const expanded = replaceExpressions(input, parsed, resMap)
      setExpandedPrompt(expanded)

      // Step 3: Send expanded prompt to parent model
      setIsResolving(false)
      setIsExecuting(true)

      const chatRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: expanded }],
        }),
      })
      const chatData = await chatRes.json()
      if (!chatRes.ok) throw new Error(chatData.error || 'Chat failed')
      setParentResponse(chatData.content)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setIsResolving(false)
      setIsExecuting(false)
    }
  }, [input, resolverModelKey, parentModelKey])

  const handleClear = useCallback(() => {
    setExpressions([])
    setResolutions([])
    setExpandedPrompt('')
    setParentResponse('')
    setError(null)
  }, [])

  const totalLatency = resolutions.reduce((sum, r) => sum + r.latencyMs, 0)
  const totalTokens = resolutions.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0)

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h1 className="text-lg font-bold">Sub-Prompt: Core Parser & Resolution</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Type a prompt with <code className="bg-muted px-1 rounded">[bracket expressions]</code> to resolve before sending.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Input Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Resolver Model</label>
            <select
              value={resolverModelKey}
              onChange={e => setResolverModelKey(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-background"
            >
              {MODEL_OPTIONS.map(m => (
                <option key={m.key} value={m.key}>{m.name} ({m.costTier})</option>
              ))}
            </select>
            <label className="text-sm font-medium ml-4">Parent Model</label>
            <select
              value={parentModelKey}
              onChange={e => setParentModelKey(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-background"
            >
              {MODEL_OPTIONS.map(m => (
                <option key={m.key} value={m.key}>{m.name} ({m.costTier})</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleResolveAndSend()
                }
              }}
              placeholder="Explain [the term for when neural networks forget old tasks after learning new ones] and how to mitigate it with [the regularization technique that penalizes changes to important weights]."
              className="min-h-[120px] font-mono text-sm"
              disabled={isResolving || isExecuting}
            />
            {/* Live expression count */}
            {liveExpressions.length > 0 && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs">
                  {liveExpressions.length} sub-prompt{liveExpressions.length !== 1 ? 's' : ''} detected
                </Badge>
              </div>
            )}
          </div>

          {/* Syntax preview */}
          {highlightedInput && (
            <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm whitespace-pre-wrap break-words">
              {highlightedInput.map((span, i) => (
                <span
                  key={i}
                  className={span.depth > 0 ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded px-0.5' : ''}
                >
                  {span.text}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleResolveAndSend}
              disabled={!input.trim() || isResolving || isExecuting}
            >
              {isResolving ? 'Resolving...' : isExecuting ? 'Executing...' : 'Resolve & Send'}
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={isResolving || isExecuting}>
              Clear
            </Button>
            <span className="text-xs text-muted-foreground self-center ml-2">
              {'\u2318'}+Enter to send
            </span>
          </div>
        </div>

        {/* Resolution Trace */}
        {resolutions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Resolution Trace</h2>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{resolutions.length} resolved</span>
                <span>{totalLatency}ms total</span>
                <span>{totalTokens} tokens</span>
              </div>
            </div>
            <div className="space-y-2">
              {resolutions.map((r) => (
                <div
                  key={r.expressionId}
                  className={`border rounded-lg p-3 text-sm ${
                    r.status === 'error' ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-muted-foreground mb-1">
                        [{r.query}]
                      </div>
                      <div className="font-medium">
                        {r.status === 'error' ? (
                          <span className="text-red-600">{r.error}</span>
                        ) : (
                          r.resolvedValue
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {r.modelName}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {r.latencyMs}ms &middot; {r.inputTokens + r.outputTokens} tok
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expanded Prompt */}
        {expandedPrompt && expandedPrompt !== input && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold">Expanded Prompt</h2>
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3 font-mono text-sm whitespace-pre-wrap">
              {expandedPrompt}
            </div>
          </div>
        )}

        {/* Parent Response */}
        {parentResponse && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold">Response</h2>
              <Badge variant="outline" className="text-xs">
                {getModelDisplayName(parentModelKey)}
              </Badge>
            </div>
            <div className="border rounded-lg p-4 prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{parentResponse}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
