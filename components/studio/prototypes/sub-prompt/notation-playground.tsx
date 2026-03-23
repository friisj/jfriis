'use client'

/**
 * E5: Notation Style Playground
 *
 * Side-by-side comparison of 4 notation styles for sub-prompt delimiters.
 * Live parsing, syntax highlighting, and parse tree visualization.
 * Primarily client-side — optional "Resolve" for end-to-end testing.
 */

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { parseSubPrompts, getDepthMap, getDelimiters } from '@/lib/studio/sub-prompt/parser'
import type { NotationStyle, Resolution } from '@/lib/studio/sub-prompt/types'

const NOTATIONS: { style: NotationStyle; label: string; example: string }[] = [
  { style: 'bracket', label: 'Square Brackets', example: '[what is the term for X?]' },
  { style: 'double-curly', label: 'Double Braces', example: '{{what is the term for X?}}' },
  { style: 'at-resolve', label: '@-Function', example: '@resolve(what is the term for X?)' },
  { style: 'xml-sub', label: 'XML Tags', example: '<sub>what is the term for X?</sub>' },
]

const DEPTH_COLORS = [
  '',
  'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  'bg-purple-500/20 text-purple-700 dark:text-purple-300',
  'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
]

const CHALLENGES = [
  {
    name: 'Basic',
    prompts: {
      'bracket': 'Explain [catastrophic forgetting] in neural networks',
      'double-curly': 'Explain {{catastrophic forgetting}} in neural networks',
      'at-resolve': 'Explain @resolve(catastrophic forgetting) in neural networks',
      'xml-sub': 'Explain <sub>catastrophic forgetting</sub> in neural networks',
    },
  },
  {
    name: 'Multiple',
    prompts: {
      'bracket': 'Compare [gradient descent] with [evolutionary strategies] for [hyperparameter optimization]',
      'double-curly': 'Compare {{gradient descent}} with {{evolutionary strategies}} for {{hyperparameter optimization}}',
      'at-resolve': 'Compare @resolve(gradient descent) with @resolve(evolutionary strategies) for @resolve(hyperparameter optimization)',
      'xml-sub': 'Compare <sub>gradient descent</sub> with <sub>evolutionary strategies</sub> for <sub>hyperparameter optimization</sub>',
    },
  },
  {
    name: 'With Routing',
    prompts: {
      'bracket': 'Is it true that [@fact-checker: Einstein failed math]? The [@terminology: study of brain structure] suggests otherwise.',
      'double-curly': 'Is it true that {{@fact-checker: Einstein failed math}}? The {{@terminology: study of brain structure}} suggests otherwise.',
      'at-resolve': '@resolve(@fact-checker: Einstein failed math) — The @resolve(@terminology: study of brain structure) suggests otherwise.',
      'xml-sub': 'Is it true that <sub>@fact-checker: Einstein failed math</sub>? The <sub>@terminology: study of brain structure</sub> suggests otherwise.',
    },
  },
  {
    name: 'Edge Cases',
    prompts: {
      'bracket': 'Use array[0] and check [is this parsed?] while ignoring JSON {"key": "value"}',
      'double-curly': 'Template {{variable}} and resolve {{is this parsed?}} while ignoring {single braces}',
      'at-resolve': 'Email user@example.com and resolve @resolve(is this parsed?) while ignoring @mentions',
      'xml-sub': 'HTML <sub>is this parsed?</sub> with regular <div>not a sub-prompt</div> tags',
    },
  },
]

function NotationPanel({
  notation,
  input,
  onInputChange,
}: {
  notation: typeof NOTATIONS[number]
  input: string
  onInputChange: (value: string) => void
}) {
  const expressions = useMemo(() => parseSubPrompts(input, notation.style), [input, notation.style])
  const depthMap = useMemo(() => getDepthMap(input, notation.style), [input, notation.style])
  const delimiters = getDelimiters(notation.style)

  const highlightedSpans = useMemo(() => {
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
    <div className="border rounded-lg p-4 space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">{notation.label}</h3>
        <Badge variant={expressions.length > 0 ? 'default' : 'secondary'} className="text-xs">
          {expressions.length} found
        </Badge>
      </div>

      <div className="text-xs text-muted-foreground font-mono">
        {delimiters.open}...{delimiters.close}
      </div>

      <Textarea
        value={input}
        onChange={e => onInputChange(e.target.value)}
        className="flex-1 min-h-[80px] font-mono text-xs resize-none"
        placeholder={notation.example}
      />

      {/* Syntax preview */}
      {highlightedSpans && (
        <div className="bg-muted/50 rounded p-2 font-mono text-xs whitespace-pre-wrap break-words min-h-[40px]">
          {highlightedSpans.map((span, i) => (
            <span key={i} className={DEPTH_COLORS[Math.min(span.depth, DEPTH_COLORS.length - 1)] || ''}>
              {span.text}
            </span>
          ))}
        </div>
      )}

      {/* Parse results */}
      {expressions.length > 0 && (
        <div className="space-y-1">
          {expressions.map(expr => (
            <div key={expr.id} className="text-xs bg-muted/30 rounded px-2 py-1 flex items-start gap-2">
              <span className="font-mono text-muted-foreground shrink-0">{expr.id}</span>
              <span className="font-medium break-all">{expr.query}</span>
              {expr.modelRoute && (
                <Badge variant="outline" className="text-[10px] shrink-0">@{expr.modelRoute}</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NotationPlayground() {
  // Independent input per notation panel
  const [inputs, setInputs] = useState<Record<NotationStyle, string>>({
    'bracket': '',
    'double-curly': '',
    'at-resolve': '',
    'xml-sub': '',
  })
  const [activeChallenge, setActiveChallenge] = useState<number | null>(null)
  const [resolving, setResolving] = useState<NotationStyle | null>(null)
  const [resolutions, setResolutions] = useState<Record<string, Resolution[]>>({})

  const updateInput = useCallback((style: NotationStyle, value: string) => {
    setInputs(prev => ({ ...prev, [style]: value }))
    setActiveChallenge(null)
  }, [])

  const loadChallenge = useCallback((index: number) => {
    const challenge = CHALLENGES[index]
    setInputs(challenge.prompts as Record<NotationStyle, string>)
    setActiveChallenge(index)
    setResolutions({})
  }, [])

  const resolvePanel = useCallback(async (style: NotationStyle) => {
    const expressions = parseSubPrompts(inputs[style], style)
    if (expressions.length === 0) return

    setResolving(style)
    try {
      const res = await fetch('/api/studio/sub-prompt/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expressions, defaultModelKey: 'claude-haiku' }),
      })
      if (!res.ok) return
      const data = await res.json()
      setResolutions(prev => ({ ...prev, [style]: data.resolutions }))
    } finally {
      setResolving(null)
    }
  }, [inputs])

  // Summary stats
  const stats = useMemo(() => {
    return NOTATIONS.map(n => ({
      style: n.style,
      label: n.label,
      count: parseSubPrompts(inputs[n.style], n.style).length,
      charCount: inputs[n.style].length,
    }))
  }, [inputs])

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h1 className="text-lg font-bold">Notation Style Playground</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compare how different delimiter styles parse the same intent. Each panel parses independently.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Challenge selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Challenges:</span>
          {CHALLENGES.map((c, i) => (
            <Button
              key={i}
              variant={activeChallenge === i ? 'default' : 'outline'}
              size="sm"
              onClick={() => loadChallenge(i)}
            >
              {c.name}
            </Button>
          ))}
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NOTATIONS.map(n => (
            <div key={n.style} className="space-y-2">
              <NotationPanel
                notation={n}
                input={inputs[n.style]}
                onInputChange={v => updateInput(n.style, v)}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolvePanel(n.style)}
                  disabled={resolving !== null || parseSubPrompts(inputs[n.style], n.style).length === 0}
                >
                  {resolving === n.style ? 'Resolving...' : 'Resolve'}
                </Button>
                {resolutions[n.style] && (
                  <span className="text-xs text-muted-foreground">
                    {resolutions[n.style].length} resolved &middot;{' '}
                    {resolutions[n.style].reduce((s, r) => s + r.latencyMs, 0)}ms
                  </span>
                )}
              </div>

              {/* Resolution results */}
              {resolutions[n.style]?.map(r => (
                <div key={r.expressionId} className="text-xs bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded px-2 py-1">
                  <span className="text-muted-foreground">[{r.query}]</span>{' '}
                  <span className="font-medium">&rarr; {r.resolvedValue}</span>{' '}
                  <span className="text-muted-foreground">({r.modelName}, {r.latencyMs}ms)</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Comparison summary */}
        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-bold mb-3">Comparison</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Notation</th>
                <th className="text-right py-1">Expressions</th>
                <th className="text-right py-1">Prompt Length</th>
                <th className="text-right py-1">Overhead</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(s => {
                const minLen = Math.min(...stats.filter(x => x.charCount > 0).map(x => x.charCount))
                const overhead = s.charCount > 0 && minLen > 0 ? Math.round(((s.charCount - minLen) / minLen) * 100) : 0
                return (
                  <tr key={s.style} className="border-b last:border-0">
                    <td className="py-1">{s.label}</td>
                    <td className="text-right py-1">
                      <Badge variant={s.count > 0 ? 'default' : 'secondary'} className="text-xs">
                        {s.count}
                      </Badge>
                    </td>
                    <td className="text-right py-1 font-mono text-xs">{s.charCount}</td>
                    <td className="text-right py-1 text-xs text-muted-foreground">
                      {overhead > 0 ? `+${overhead}%` : s.charCount > 0 ? 'baseline' : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
