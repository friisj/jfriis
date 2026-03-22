'use client'

/**
 * E3: Resolution Trace Viewer
 *
 * Split-pane interface: chat on the left, resolution trace on the right.
 * Expandable resolution cards with re-resolve and manual edit capabilities.
 * Prompt diff view showing original vs. expanded prompt.
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseSubPrompts, replaceExpressions } from '@/lib/studio/sub-prompt/parser'
import { getModelOptions } from '@/lib/studio/sub-prompt/model-options'
import type { SubPromptExpression, Resolution, ResolutionTrace } from '@/lib/studio/sub-prompt/types'

const MODEL_OPTIONS = getModelOptions()

function TraceCard({
  resolution,
  expression,
  onReResolve,
  onManualEdit,
}: {
  resolution: Resolution
  expression?: SubPromptExpression
  onReResolve: (expressionId: string, modelKey: string) => void
  onManualEdit: (expressionId: string, value: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(resolution.resolvedValue)
  const [reResolveModel, setReResolveModel] = useState('')

  const latencyBar = Math.min(resolution.latencyMs / 3000, 1) * 100

  return (
    <div className={`border rounded-lg text-sm ${resolution.status === 'error' ? 'border-red-300' : resolution.status === 'manual' ? 'border-amber-300' : ''}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-mono text-xs text-muted-foreground truncate">[{resolution.query}]</div>
            <div className="font-medium mt-0.5 truncate">
              {resolution.status === 'error' ? (
                <span className="text-red-600">{resolution.error}</span>
              ) : (
                resolution.resolvedValue
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {expression?.modelRoute && (
              <Badge variant="secondary" className="text-[10px]">@{expression.modelRoute}</Badge>
            )}
            <Badge variant="outline" className="text-[10px]">{resolution.modelName}</Badge>
            <span className="text-[10px] text-muted-foreground tabular-nums">{resolution.latencyMs}ms</span>
          </div>
        </div>
        {/* Latency bar */}
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              resolution.latencyMs > 2000 ? 'bg-red-400' : resolution.latencyMs > 1000 ? 'bg-amber-400' : 'bg-green-400'
            }`}
            style={{ width: `${latencyBar}%` }}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t p-3 space-y-3">
          {/* Metrics */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">Input</div>
              <div className="font-mono">{resolution.inputTokens} tok</div>
            </div>
            <div>
              <div className="text-muted-foreground">Output</div>
              <div className="font-mono">{resolution.outputTokens} tok</div>
            </div>
            <div>
              <div className="text-muted-foreground">Latency</div>
              <div className="font-mono">{resolution.latencyMs}ms</div>
            </div>
            <div>
              <div className="text-muted-foreground">Status</div>
              <div className="font-mono">{resolution.status}</div>
            </div>
          </div>

          {/* Re-resolve */}
          <div className="flex items-center gap-2">
            <select
              value={reResolveModel}
              onChange={e => setReResolveModel(e.target.value)}
              className="text-xs border rounded px-2 py-1 bg-background flex-1"
            >
              <option value="">Re-resolve with...</option>
              {MODEL_OPTIONS.map(m => (
                <option key={m.key} value={m.key}>{m.name}</option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => reResolveModel && onReResolve(resolution.expressionId, reResolveModel)}
              disabled={!reResolveModel}
              className="text-xs"
            >
              Re-resolve
            </Button>
          </div>

          {/* Manual edit */}
          {editing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="flex-1 text-xs border rounded px-2 py-1 bg-background"
              />
              <Button size="sm" className="text-xs" onClick={() => { onManualEdit(resolution.expressionId, editValue); setEditing(false) }}>
                Save
              </Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="text-xs" onClick={() => { setEditValue(resolution.resolvedValue); setEditing(true) }}>
              Edit Manually
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function PromptDiff({ original, expanded }: { original: string; expanded: string }) {
  if (original === expanded) return null

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold">Prompt Diff</h3>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground mb-1">Original</div>
          <div className="bg-red-50 dark:bg-red-950/20 border rounded p-2 font-mono whitespace-pre-wrap break-words">
            {original}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Expanded</div>
          <div className="bg-green-50 dark:bg-green-950/20 border rounded p-2 font-mono whitespace-pre-wrap break-words">
            {expanded}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TraceViewer() {
  const [input, setInput] = useState('')
  const [parentModelKey, setParentModelKey] = useState('claude-sonnet')
  const [traces, setTraces] = useState<ResolutionTrace[]>([])
  const [parentResponse, setParentResponse] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(false)

  const latestTrace = traces[traces.length - 1] ?? null

  const handleResolveAndSend = useCallback(async () => {
    setError(null)
    const parsed = parseSubPrompts(input)

    if (parsed.length === 0) {
      setIsExecuting(true)
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: input }] }),
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
    const startTime = performance.now()
    try {
      const res = await fetch('/api/studio/sub-prompt/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expressions: parsed, defaultModelKey: 'claude-haiku' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Resolution failed')

      const resolutions: Resolution[] = data.resolutions
      const resMap = new Map(resolutions.map(r => [r.expressionId, r.resolvedValue]))
      const expanded = replaceExpressions(input, parsed, resMap)

      const trace: ResolutionTrace = {
        id: `trace-${Date.now()}`,
        originalPrompt: input,
        expandedPrompt: expanded,
        expressions: parsed,
        resolutions,
        parentModelKey,
        totalLatencyMs: Math.round(performance.now() - startTime),
        timestamp: Date.now(),
      }
      setTraces(prev => [...prev, trace])

      setIsResolving(false)
      setIsExecuting(true)

      const chatRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: expanded }] }),
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
  }, [input, parentModelKey])

  const handleReResolve = useCallback(async (expressionId: string, modelKey: string) => {
    if (!latestTrace) return
    const expr = latestTrace.expressions.find(e => e.id === expressionId)
    if (!expr) return

    try {
      const res = await fetch('/api/studio/sub-prompt/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expressions: [expr], defaultModelKey: modelKey }),
      })
      const data = await res.json()
      if (!res.ok) return

      const newResolution: Resolution = data.resolutions[0]
      setTraces(prev => {
        const updated = [...prev]
        const last = { ...updated[updated.length - 1] }
        last.resolutions = last.resolutions.map(r =>
          r.expressionId === expressionId ? newResolution : r,
        )
        const resMap = new Map(last.resolutions.map(r => [r.expressionId, r.resolvedValue]))
        last.expandedPrompt = replaceExpressions(last.originalPrompt, last.expressions, resMap)
        updated[updated.length - 1] = last
        return updated
      })
    } catch {
      // silent
    }
  }, [latestTrace])

  const handleManualEdit = useCallback((expressionId: string, value: string) => {
    setTraces(prev => {
      const updated = [...prev]
      const last = { ...updated[updated.length - 1] }
      last.resolutions = last.resolutions.map(r =>
        r.expressionId === expressionId ? { ...r, resolvedValue: value, status: 'manual' as const } : r,
      )
      const resMap = new Map(last.resolutions.map(r => [r.expressionId, r.resolvedValue]))
      last.expandedPrompt = replaceExpressions(last.originalPrompt, last.expressions, resMap)
      updated[updated.length - 1] = last
      return updated
    })
  }, [])

  return (
    <div className="h-full bg-background text-foreground">
      <ResizablePanelGroup direction="horizontal">
        {/* Left: Chat */}
        <ResizablePanel defaultSize={55} minSize={35}>
          <div className="h-full flex flex-col">
            <div className="border-b px-4 py-3">
              <h1 className="text-lg font-bold">Resolution Trace Viewer</h1>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Input */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Parent</label>
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
                <Textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleResolveAndSend()
                    }
                  }}
                  placeholder="Type a prompt with [bracket expressions] to see the resolution trace..."
                  className="min-h-[100px] font-mono text-sm"
                  disabled={isResolving || isExecuting}
                />
                <Button onClick={handleResolveAndSend} disabled={!input.trim() || isResolving || isExecuting} size="sm">
                  {isResolving ? 'Resolving...' : isExecuting ? 'Executing...' : 'Resolve & Send'}
                </Button>
              </div>

              {/* Expanded prompt */}
              {latestTrace && latestTrace.expandedPrompt !== latestTrace.originalPrompt && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3 font-mono text-sm whitespace-pre-wrap">
                  {latestTrace.expandedPrompt}
                </div>
              )}

              {/* Response */}
              {parentResponse && (
                <div className="border rounded-lg p-4 prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{parentResponse}</ReactMarkdown>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 text-sm text-red-600">{error}</div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right: Trace */}
        <ResizablePanel defaultSize={45} minSize={25}>
          <div className="h-full flex flex-col border-l">
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Trace</h2>
              {latestTrace && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {latestTrace.resolutions.length} resolutions &middot; {latestTrace.totalLatencyMs}ms
                  </span>
                  <Button size="sm" variant="ghost" className="text-xs h-6" onClick={() => setShowDiff(!showDiff)}>
                    {showDiff ? 'Cards' : 'Diff'}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {!latestTrace && (
                <p className="text-sm text-muted-foreground">
                  Submit a prompt with [bracket expressions] to see the resolution trace.
                </p>
              )}

              {latestTrace && showDiff && (
                <PromptDiff original={latestTrace.originalPrompt} expanded={latestTrace.expandedPrompt} />
              )}

              {latestTrace && !showDiff && (
                <div className="space-y-2">
                  {latestTrace.resolutions.map(r => (
                    <TraceCard
                      key={r.expressionId}
                      resolution={r}
                      expression={latestTrace.expressions.find(e => e.id === r.expressionId)}
                      onReResolve={handleReResolve}
                      onManualEdit={handleManualEdit}
                    />
                  ))}
                </div>
              )}

              {/* Trace history */}
              {traces.length > 1 && (
                <div className="border-t pt-3 mt-3">
                  <h3 className="text-xs font-bold text-muted-foreground mb-2">History ({traces.length} traces)</h3>
                  {traces.slice(0, -1).reverse().map(t => (
                    <div key={t.id} className="text-xs text-muted-foreground py-1 border-b last:border-0">
                      {t.resolutions.length} resolutions &middot; {t.totalLatencyMs}ms &middot;{' '}
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
