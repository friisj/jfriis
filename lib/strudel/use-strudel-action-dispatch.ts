'use client'

import { useEffect, useRef } from 'react'
import type { UIMessage } from 'ai'
import type { StrudelReplControls } from './strudel-chat-context'

type StrudelAction = {
  type: 'strudel_action'
  action: 'edit_pattern' | 'evaluate' | 'hush'
  code?: string
  description?: string
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
 */
export function useStrudelActionDispatch(
  messages: UIMessage[],
  controls: StrudelReplControls | null,
  getCurrentCode: () => string
) {
  const processedRef = useRef(new Set<string>())

  useEffect(() => {
    if (!controls) return

    for (const msg of messages) {
      if (msg.role !== 'assistant') continue
      for (const part of msg.parts) {
        // Tool result parts in AI SDK v6 have type 'tool-{toolName}'
        // and contain a result field when output is available
        const p = part as Record<string, unknown>
        if (typeof p.type !== 'string' || !p.type.startsWith('tool-')) continue
        if (!p.result && !p.output) continue

        const output = (p.result ?? p.output) as Record<string, unknown>
        if (!isStrudelAction(output)) continue

        const key = `${msg.id}-${p.toolCallId ?? p.type}`
        if (processedRef.current.has(key)) continue
        processedRef.current.add(key)

        switch (output.action) {
          case 'edit_pattern':
            if (output.code) {
              controls.replaceAll(output.code as string)
            }
            break
          case 'evaluate':
            controls.evaluate(getCurrentCode())
            break
          case 'hush':
            controls.stop()
            break
        }
      }
    }
  }, [messages, controls, getCurrentCode])
}
