'use client'

import { useEffect, useRef } from 'react'
import type { UIMessage } from 'ai'
import type { StrudelReplControls } from './strudel-chat-context'

type StrudelAction = {
  type: 'strudel_action'
  action: 'edit_pattern' | 'evaluate' | 'hush' | 'load_samples'
  code?: string
  description?: string
  samples?: Record<string, string[]>
}

function isStrudelAction(value: unknown): value is StrudelAction {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).type === 'strudel_action'
  )
}

/**
 * Watches chat messages for strudel_action tool results and dispatches
 * them to the REPL engine. Deduplicates by toolCallId.
 * Actions are dispatched sequentially to ensure async operations
 * (like load_samples) complete before the next action fires.
 */
export function useStrudelActionDispatch(
  messages: UIMessage[],
  controls: StrudelReplControls | null,
  getCurrentCode: () => string
) {
  const processedRef = useRef(new Set<string>())
  const dispatchingRef = useRef(false)
  const queueRef = useRef<Array<{ action: StrudelAction; key: string }>>([])

  useEffect(() => {
    if (!controls) return

    // Collect new actions from messages
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue
      for (const part of msg.parts) {
        const p = part as Record<string, unknown>
        if (typeof p.type !== 'string' || !p.type.startsWith('tool-')) continue
        if (!p.result && !p.output) continue

        const output = (p.result ?? p.output) as Record<string, unknown>
        if (!isStrudelAction(output)) continue

        const key = `${msg.id}-${p.toolCallId ?? p.type}`
        if (processedRef.current.has(key)) continue
        processedRef.current.add(key)

        queueRef.current.push({ action: output, key })
      }
    }

    // Process queue sequentially
    if (dispatchingRef.current || queueRef.current.length === 0) return
    dispatchingRef.current = true

    async function processQueue() {
      while (queueRef.current.length > 0) {
        const { action } = queueRef.current.shift()!
        switch (action.action) {
          case 'edit_pattern':
            if (action.code) {
              controls!.replaceAll(action.code)
            }
            break
          case 'evaluate':
            await controls!.evaluate(getCurrentCode())
            break
          case 'hush':
            controls!.stop()
            break
          case 'load_samples':
            if (action.samples) {
              await controls!.loadSamples(action.samples)
            }
            break
        }
      }
      dispatchingRef.current = false
    }

    processQueue()
  }, [messages, controls, getCurrentCode])
}
