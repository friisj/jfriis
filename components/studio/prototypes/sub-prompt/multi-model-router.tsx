'use client'

/**
 * E2: Multi-Model Router & Agent Dispatch
 *
 * Extends E1 with @-notation for routing sub-prompts to specific models
 * or specialist agents. Shows per-expression routing, agent registry,
 * and aggregated metrics by model.
 */

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseSubPrompts, replaceExpressions } from '@/lib/studio/sub-prompt/parser'
import { BUILT_IN_AGENTS } from '@/lib/studio/sub-prompt/agents'
import { getModelOptions, getModelDisplayName } from '@/lib/studio/sub-prompt/model-options'
import type { Resolution } from '@/lib/studio/sub-prompt/types'

const MODEL_OPTIONS = getModelOptions()

const AGENT_COLORS: Record<string, string> = {
  terminology: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'fact-checker': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'code-expert': 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  summarizer: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
}

export default function MultiModelRouter() {
  const [input, setInput] = useState('')
  const [parentModelKey, setParentModelKey] = useState('claude-sonnet')
  const [defaultResolverKey, setDefaultResolverKey] = useState('claude-haiku')
  const [resolutions, setResolutions] = useState<Resolution[]>([])
  const [expandedPrompt, setExpandedPrompt] = useState('')
  const [parentResponse, setParentResponse] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAgentPanel, setShowAgentPanel] = useState(true)

  const liveExpressions = useMemo(() => parseSubPrompts(input), [input])

  // Aggregate metrics by model
  const modelMetrics = useMemo(() => {
    const byModel = new Map<string, { count: number; totalLatency: number; totalTokens: number }>()
    for (const r of resolutions) {
      const existing = byModel.get(r.modelName) ?? { count: 0, totalLatency: 0, totalTokens: 0 }
      existing.count++
      existing.totalLatency += r.latencyMs
      existing.totalTokens += r.inputTokens + r.outputTokens
      byModel.set(r.modelName, existing)
    }
    return Array.from(byModel.entries()).map(([model, stats]) => ({ model, ...stats }))
  }, [resolutions])

  const handleResolveAndSend = useCallback(async () => {
    setError(null)
    const parsed = parseSubPrompts(input)

    if (parsed.length === 0) {
      setExpandedPrompt(input)
      setIsExecuting(true)
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: input }], modelKey: parentModelKey }),
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

    setIsResolving(true)
    try {
      const res = await fetch('/api/studio/sub-prompt/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expressions: parsed, defaultModelKey: defaultResolverKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Resolution failed')

      const resolvedList: Resolution[] = data.resolutions
      setResolutions(resolvedList)

      const resMap = new Map(resolvedList.map(r => [r.expressionId, r.resolvedValue]))
      const expanded = replaceExpressions(input, parsed, resMap)
      setExpandedPrompt(expanded)

      setIsResolving(false)
      setIsExecuting(true)

      const chatRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: expanded }], modelKey: parentModelKey }),
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
  }, [input, defaultResolverKey, parentModelKey])

  return (
    <div className="h-full flex bg-background text-foreground">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">Multi-Model Router & Agent Dispatch</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Use <code className="bg-muted px-1 rounded">[@agent: query]</code> or <code className="bg-muted px-1 rounded">[@model-key: query]</code> to route sub-prompts.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAgentPanel(!showAgentPanel)}
            >
              {showAgentPanel ? 'Hide' : 'Show'} Agents
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium">Default Resolver</label>
              <select
                value={defaultResolverKey}
                onChange={e => setDefaultResolverKey(e.target.value)}
                className="text-sm border rounded px-2 py-1 bg-background"
              >
                {MODEL_OPTIONS.map(m => (
                  <option key={m.key} value={m.key}>{m.name}</option>
                ))}
              </select>
              <label className="text-sm font-medium ml-4">Parent Model</label>
              <select
                value={parentModelKey}
                onChange={e => setParentModelKey(e.target.value)}
                className="text-sm border rounded px-2 py-1 bg-background"
              >
                {MODEL_OPTIONS.map(m => (
                  <option key={m.key} value={m.key}>{m.name}</option>
                ))}
              </select>
            </div>

            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleResolveAndSend()
                }
              }}
              placeholder="Explain [@terminology: the phenomenon where neural networks forget old tasks] and how to mitigate it with [@code-expert: the best regularization technique for continual learning]. Is it true that [@fact-checker: EWC was introduced by Kirkpatrick et al. in 2017]?"
              className="min-h-[120px] font-mono text-sm"
              disabled={isResolving || isExecuting}
            />

            {liveExpressions.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {liveExpressions.map(expr => (
                  <Badge
                    key={expr.id}
                    className={`text-xs ${expr.modelRoute ? AGENT_COLORS[expr.modelRoute] ?? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                    variant={expr.modelRoute ? 'secondary' : 'outline'}
                  >
                    {expr.modelRoute ? `@${expr.modelRoute}` : 'default'}: {expr.query.slice(0, 40)}{expr.query.length > 40 ? '...' : ''}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleResolveAndSend} disabled={!input.trim() || isResolving || isExecuting}>
                {isResolving ? 'Resolving...' : isExecuting ? 'Executing...' : 'Resolve & Send'}
              </Button>
              <Button variant="outline" onClick={() => { setResolutions([]); setExpandedPrompt(''); setParentResponse(''); setError(null) }}>
                Clear
              </Button>
            </div>
          </div>

          {/* Resolution cards */}
          {resolutions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold">Resolutions</h2>
              <div className="space-y-2">
                {resolutions.map(r => {
                  const expr = liveExpressions.find(e => e.id === r.expressionId) ?? parseSubPrompts(input).find(e => e.id === r.expressionId)
                  const route = expr?.modelRoute
                  return (
                    <div key={r.expressionId} className={`border rounded-lg p-3 text-sm ${r.status === 'error' ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : 'bg-muted/30'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {route && (
                              <Badge className={`text-xs ${AGENT_COLORS[route] ?? ''}`} variant="secondary">
                                @{route}
                              </Badge>
                            )}
                            <span className="font-mono text-xs text-muted-foreground truncate">{r.query}</span>
                          </div>
                          <div className="font-medium">
                            {r.status === 'error' ? <span className="text-red-600">{r.error}</span> : r.resolvedValue}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="outline" className="text-xs">{r.modelName}</Badge>
                          <span className="text-xs text-muted-foreground">{r.latencyMs}ms &middot; {r.inputTokens + r.outputTokens} tok</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Model metrics */}
              {modelMetrics.length > 0 && (
                <div className="border rounded-lg p-3">
                  <h3 className="text-xs font-bold mb-2">By Model</h3>
                  <div className="flex gap-4 flex-wrap">
                    {modelMetrics.map(m => (
                      <div key={m.model} className="text-xs">
                        <span className="font-medium">{m.model}</span>
                        <span className="text-muted-foreground ml-1">
                          {m.count} call{m.count !== 1 ? 's' : ''} &middot; {m.totalLatency}ms &middot; {m.totalTokens} tok
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Expanded prompt */}
          {expandedPrompt && expandedPrompt !== input && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold">Expanded Prompt</h2>
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3 font-mono text-sm whitespace-pre-wrap">
                {expandedPrompt}
              </div>
            </div>
          )}

          {/* Response */}
          {parentResponse && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold">Response</h2>
                <Badge variant="outline" className="text-xs">{getModelDisplayName(parentModelKey)}</Badge>
              </div>
              <div className="border rounded-lg p-4 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{parentResponse}</ReactMarkdown>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 text-sm text-red-600">{error}</div>
          )}
        </div>
      </div>

      {/* Agent registry sidebar */}
      {showAgentPanel && (
        <div className="w-72 border-l overflow-auto p-4 space-y-3">
          <h2 className="text-sm font-bold">Agent Registry</h2>
          <p className="text-xs text-muted-foreground">
            Use <code>@slug</code> in brackets to route to these agents.
          </p>
          {BUILT_IN_AGENTS.map(agent => (
            <div key={agent.slug} className={`rounded-lg p-3 text-sm ${AGENT_COLORS[agent.slug] ?? 'bg-muted/30'}`}>
              <div className="font-bold text-xs">@{agent.slug}</div>
              <div className="font-medium mt-1">{agent.name}</div>
              <div className="text-xs mt-1 opacity-80">{agent.description}</div>
              <div className="text-xs mt-2 opacity-60">Default: {getModelDisplayName(agent.defaultModelKey)}</div>
            </div>
          ))}
          <div className="border-t pt-3">
            <h3 className="text-xs font-bold mb-2">Direct Model Routing</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Use any model key as a route:
            </p>
            <div className="space-y-1">
              {MODEL_OPTIONS.slice(0, 5).map(m => (
                <div key={m.key} className="text-xs font-mono">
                  @{m.key} <span className="text-muted-foreground">→ {m.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
