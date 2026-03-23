'use client'

/**
 * E4: Interaction Mode Playground
 *
 * Tabbed comparison of 4 interaction modes for sub-prompt resolution:
 * Eager, Interactive, Streaming, and Ghost Text.
 * Same backend, different UX choreography.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseSubPrompts, replaceExpressions } from '@/lib/studio/sub-prompt/parser'
import type { SubPromptExpression, Resolution } from '@/lib/studio/sub-prompt/types'

type Mode = 'eager' | 'interactive' | 'streaming' | 'ghost'

async function resolveExpressions(expressions: SubPromptExpression[]): Promise<Resolution[]> {
  const res = await fetch('/api/studio/sub-prompt/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expressions, defaultModelKey: 'claude-haiku' }),
  })
  if (!res.ok) throw new Error(await res.text() || `Resolution failed (${res.status})`)
  const data = await res.json()
  return data.resolutions
}

async function sendToParent(prompt: string, modelKey = 'claude-sonnet'): Promise<string> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], modelKey }),
  })
  if (!res.ok) throw new Error(await res.text() || `Chat failed (${res.status})`)
  const data = await res.json()
  return data.content
}

// ── Eager Mode ──────────────────────────────────────────────
function EagerMode({ input }: { input: string }) {
  const [resolutions, setResolutions] = useState<Resolution[]>([])
  const [expanded, setExpanded] = useState('')
  const [response, setResponse] = useState('')
  const [phase, setPhase] = useState<'idle' | 'resolving' | 'executing' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async () => {
    setError(null)
    const parsed = parseSubPrompts(input)
    if (parsed.length === 0) {
      setPhase('executing')
      try { setResponse(await sendToParent(input)); setPhase('done') }
      catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setPhase('idle') }
      return
    }
    setPhase('resolving')
    try {
      const res = await resolveExpressions(parsed)
      setResolutions(res)
      const resMap = new Map(res.map(r => [r.expressionId, r.resolvedValue]))
      const exp = replaceExpressions(input, parsed, resMap)
      setExpanded(exp)
      setPhase('executing')
      setResponse(await sendToParent(exp))
      setPhase('done')
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setPhase('idle') }
  }, [input])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button onClick={run} disabled={!input.trim() || phase === 'resolving' || phase === 'executing'} size="sm">
          {phase === 'resolving' ? 'Resolving all...' : phase === 'executing' ? 'Executing...' : 'Resolve All → Execute'}
        </Button>
        <Badge variant="outline" className="text-xs">Automatic — no intervention</Badge>
      </div>
      {resolutions.length > 0 && (
        <div className="space-y-1">
          {resolutions.map(r => (
            <div key={r.expressionId} className="text-xs bg-muted/30 rounded px-2 py-1 flex justify-between">
              <span><span className="text-muted-foreground">[{r.query}]</span> → {r.resolvedValue}</span>
              <span className="text-muted-foreground">{r.latencyMs}ms</span>
            </div>
          ))}
        </div>
      )}
      {expanded && expanded !== input && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded p-2 font-mono text-xs">{expanded}</div>
      )}
      {response && (
        <div className="border rounded p-3 prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
        </div>
      )}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  )
}

// ── Interactive Mode ────────────────────────────────────────
function InteractiveMode({ input }: { input: string }) {
  const [expressions, setExpressions] = useState<SubPromptExpression[]>([])
  const [resolutions, setResolutions] = useState<Map<string, Resolution>>(new Map())
  const [currentIdx, setCurrentIdx] = useState(0)
  const [resolving, setResolving] = useState(false)
  const [response, setResponse] = useState('')
  const [phase, setPhase] = useState<'idle' | 'stepping' | 'executing' | 'done'>('idle')
  const [editValue, setEditValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async () => {
    const parsed = parseSubPrompts(input)
    if (parsed.length === 0) {
      setPhase('executing')
      try { setResponse(await sendToParent(input)); setPhase('done') }
      catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setPhase('idle') }
      return
    }
    setExpressions(parsed)
    setResolutions(new Map())
    setCurrentIdx(0)
    setPhase('stepping')
    // Resolve first expression
    setResolving(true)
    try {
      const res = await resolveExpressions([parsed[0]])
      setResolutions(new Map([[parsed[0].id, res[0]]]))
      setEditValue(res[0].resolvedValue)
      setResolving(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setPhase('idle'); setResolving(false) }
  }, [input])

  const accept = useCallback(async () => {
    const nextIdx = currentIdx + 1
    if (nextIdx >= expressions.length) {
      // All done, execute
      setPhase('executing')
      const resMap = new Map(Array.from(resolutions.entries()).map(([id, r]) => [id, r.resolvedValue]))
      const expanded = replaceExpressions(input, expressions, resMap)
      try { setResponse(await sendToParent(expanded)); setPhase('done') }
      catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setPhase('idle') }
      return
    }
    setCurrentIdx(nextIdx)
    setResolving(true)
    try {
      const res = await resolveExpressions([expressions[nextIdx]])
      setResolutions(prev => new Map([...prev, [expressions[nextIdx].id, res[0]]]))
      setEditValue(res[0].resolvedValue)
      setResolving(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setResolving(false) }
  }, [currentIdx, expressions, input, resolutions])

  const editAndAccept = useCallback(() => {
    const current = expressions[currentIdx]
    const resolution = resolutions.get(current.id)
    if (resolution) {
      setResolutions(prev => new Map([...prev, [current.id, { ...resolution, resolvedValue: editValue, status: 'manual' as const }]]))
    }
    accept()
  }, [currentIdx, expressions, resolutions, editValue, accept])

  const currentExpr = expressions[currentIdx]
  const currentRes = currentExpr ? resolutions.get(currentExpr.id) : undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button onClick={start} disabled={!input.trim() || phase === 'stepping' || phase === 'executing'} size="sm">
          {phase === 'executing' ? 'Executing...' : 'Start Interactive'}
        </Button>
        <Badge variant="outline" className="text-xs">Confirm each resolution</Badge>
      </div>

      {phase === 'stepping' && currentExpr && (
        <div className="border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge>Resolving {currentIdx + 1} of {expressions.length}</Badge>
            {resolving && <span className="text-xs text-muted-foreground animate-pulse">Resolving...</span>}
          </div>
          <div className="font-mono text-sm bg-muted/50 rounded p-2">[{currentExpr.query}]</div>
          {currentRes && !resolving && (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="flex-1 text-sm border rounded px-2 py-1 bg-background font-medium"
                />
                <Badge variant="outline" className="text-xs shrink-0">{currentRes.modelName} · {currentRes.latencyMs}ms</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={accept}>Accept</Button>
                <Button size="sm" variant="outline" onClick={editAndAccept}>Accept Edit</Button>
                <Button size="sm" variant="ghost" onClick={accept}>Skip</Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Completed resolutions */}
      {Array.from(resolutions.entries()).filter(([id]) => {
        const idx = expressions.findIndex(e => e.id === id)
        return idx < currentIdx || phase === 'done' || phase === 'executing'
      }).map(([id, r]) => (
        <div key={id} className="text-xs bg-muted/30 rounded px-2 py-1 flex justify-between">
          <span><span className="text-muted-foreground">[{r.query}]</span> → {r.resolvedValue}</span>
          <span className="text-muted-foreground">{r.status === 'manual' ? 'edited' : r.latencyMs + 'ms'}</span>
        </div>
      ))}

      {response && (
        <div className="border rounded p-3 prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
        </div>
      )}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  )
}

// ── Streaming Mode ──────────────────────────────────────────
function StreamingMode({ input }: { input: string }) {
  const [visibleResolutions, setVisibleResolutions] = useState<Resolution[]>([])
  const [allResolved, setAllResolved] = useState(false)
  const [response, setResponse] = useState('')
  const [phase, setPhase] = useState<'idle' | 'streaming' | 'executing' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async () => {
    setError(null)
    setVisibleResolutions([])
    setAllResolved(false)
    setResponse('')
    const parsed = parseSubPrompts(input)
    if (parsed.length === 0) {
      setPhase('executing')
      try { setResponse(await sendToParent(input)); setPhase('done') }
      catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setPhase('idle') }
      return
    }
    setPhase('streaming')
    try {
      const resolutions = await resolveExpressions(parsed)
      // Stagger display of resolutions
      for (let i = 0; i < resolutions.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setVisibleResolutions(prev => [...prev, resolutions[i]])
      }
      setAllResolved(true)
      await new Promise(resolve => setTimeout(resolve, 500))

      const resMap = new Map(resolutions.map(r => [r.expressionId, r.resolvedValue]))
      const expanded = replaceExpressions(input, parsed, resMap)
      setPhase('executing')
      setResponse(await sendToParent(expanded))
      setPhase('done')
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setPhase('idle') }
  }, [input])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button onClick={run} disabled={!input.trim() || phase === 'streaming' || phase === 'executing'} size="sm">
          {phase === 'streaming' ? 'Streaming...' : phase === 'executing' ? 'Executing...' : 'Stream Resolve'}
        </Button>
        <Badge variant="outline" className="text-xs">Animated bracket-to-value</Badge>
      </div>

      {/* Animated resolution stream */}
      {visibleResolutions.length > 0 && (
        <div className="space-y-1">
          {visibleResolutions.map((r, i) => (
            <div
              key={r.expressionId}
              className="text-xs rounded px-2 py-1 flex justify-between items-center animate-in fade-in slide-in-from-left-2 duration-300"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground line-through">[{r.query}]</span>
                <span className="text-green-600 dark:text-green-400 font-medium">{r.resolvedValue}</span>
              </span>
              <Badge variant="outline" className="text-[10px]">{r.modelName}</Badge>
            </div>
          ))}
        </div>
      )}

      {allResolved && phase !== 'done' && (
        <div className="text-xs text-muted-foreground animate-pulse">
          All resolved — sending expanded prompt...
        </div>
      )}

      {response && (
        <div className="border rounded p-3 prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
        </div>
      )}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  )
}

// ── Ghost Text Mode ─────────────────────────────────────────
function GhostTextMode({ input: initialInput }: { input: string }) {
  const [localInput, setLocalInput] = useState(initialInput)
  const [ghostResolutions, setGhostResolutions] = useState<Map<string, string>>(new Map())
  const [response, setResponse] = useState('')
  const [phase, setPhase] = useState<'idle' | 'executing' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync with shared input
  useEffect(() => { setLocalInput(initialInput) }, [initialInput])

  // Debounced resolution preview
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const parsed = parseSubPrompts(localInput)
      if (parsed.length === 0) { setGhostResolutions(new Map()); return }
      try {
        const res = await resolveExpressions(parsed)
        const map = new Map(res.map(r => [r.expressionId, r.resolvedValue]))
        setGhostResolutions(map)
      } catch {
        // silent — ghost text is non-blocking
      }
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [localInput])

  const expressions = useMemo(() => parseSubPrompts(localInput), [localInput])

  // Build display with ghost text
  const displayParts = useMemo(() => {
    if (expressions.length === 0 || ghostResolutions.size === 0) return null
    const parts: { text: string; isGhost: boolean }[] = []
    let lastEnd = 0
    for (const expr of expressions) {
      if (expr.startIndex > lastEnd) {
        parts.push({ text: localInput.slice(lastEnd, expr.startIndex), isGhost: false })
      }
      parts.push({ text: expr.raw, isGhost: false })
      const ghost = ghostResolutions.get(expr.id)
      if (ghost) {
        parts.push({ text: ` → ${ghost}`, isGhost: true })
      }
      lastEnd = expr.endIndex
    }
    if (lastEnd < localInput.length) {
      parts.push({ text: localInput.slice(lastEnd), isGhost: false })
    }
    return parts
  }, [localInput, expressions, ghostResolutions])

  const acceptAll = useCallback(() => {
    const expanded = replaceExpressions(localInput, expressions, ghostResolutions)
    setLocalInput(expanded)
    setGhostResolutions(new Map())
  }, [localInput, expressions, ghostResolutions])

  const send = useCallback(async () => {
    setError(null)
    // Accept ghosts first if any
    const expanded = ghostResolutions.size > 0
      ? replaceExpressions(localInput, expressions, ghostResolutions)
      : localInput
    setPhase('executing')
    try { setResponse(await sendToParent(expanded)); setPhase('done') }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setPhase('idle') }
  }, [localInput, expressions, ghostResolutions])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">Live preview — Tab to accept</Badge>
      </div>

      <Textarea
        value={localInput}
        onChange={e => setLocalInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Tab' && ghostResolutions.size > 0) {
            e.preventDefault()
            acceptAll()
          }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            send()
          }
        }}
        placeholder="Type with [brackets] — ghost text appears as resolutions arrive..."
        className="min-h-[80px] font-mono text-sm"
        disabled={phase === 'executing'}
      />

      {/* Ghost text preview */}
      {displayParts && (
        <div className="bg-muted/30 rounded p-2 font-mono text-xs whitespace-pre-wrap">
          {displayParts.map((part, i) => (
            <span key={i} className={part.isGhost ? 'text-green-500/60 italic' : ''}>{part.text}</span>
          ))}
          {ghostResolutions.size > 0 && (
            <span className="text-muted-foreground ml-2">(Tab to accept)</span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {ghostResolutions.size > 0 && (
          <Button size="sm" variant="outline" onClick={acceptAll}>Accept All Ghosts</Button>
        )}
        <Button size="sm" onClick={send} disabled={!localInput.trim() || phase === 'executing'}>
          {phase === 'executing' ? 'Sending...' : 'Send'}
        </Button>
      </div>

      {response && (
        <div className="border rounded p-3 prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
        </div>
      )}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────
export default function InteractionModes() {
  const [input, setInput] = useState('')
  const [activeMode, setActiveMode] = useState<Mode>('eager')

  const modes: { key: Mode; label: string; desc: string }[] = [
    { key: 'eager', label: 'Eager', desc: 'Resolve all → show trace → execute' },
    { key: 'interactive', label: 'Interactive', desc: 'Step through one by one' },
    { key: 'streaming', label: 'Streaming', desc: 'Animated bracket-to-value' },
    { key: 'ghost', label: 'Ghost Text', desc: 'Live preview as you type' },
  ]

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      <div className="border-b px-6 py-4">
        <h1 className="text-lg font-bold">Interaction Mode Playground</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Same sub-prompt mechanic, 4 different UX approaches. Compare how each feels.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Shared input */}
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Explain [the term for when neural networks forget old tasks] and describe [the regularization method that prevents it by penalizing weight changes]."
          className="min-h-[100px] font-mono text-sm"
        />

        {/* Mode tabs */}
        <div className="flex border-b">
          {modes.map(m => (
            <button
              key={m.key}
              onClick={() => setActiveMode(m.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeMode === m.key
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Mode description */}
        <div className="text-xs text-muted-foreground">
          {modes.find(m => m.key === activeMode)?.desc}
        </div>

        {/* Active mode */}
        {activeMode === 'eager' && <EagerMode input={input} />}
        {activeMode === 'interactive' && <InteractiveMode input={input} />}
        {activeMode === 'streaming' && <StreamingMode input={input} />}
        {activeMode === 'ghost' && <GhostTextMode input={input} />}
      </div>
    </div>
  )
}
