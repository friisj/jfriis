'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type ReplInstance = {
  evaluate: (code: string, autostart?: boolean) => Promise<{ miniLocations?: number[][] }>
  stop: () => void
  toggle: () => void
  start: () => void
  scheduler: { now: () => number; started: boolean; pattern?: unknown }
  state: { miniLocations: number[][]; widgets: unknown[]; started: boolean }
}

type UseStrudelReplReturn = {
  evaluate: (code: string) => Promise<{ miniLocations?: number[][] } | undefined>
  stop: () => void
  toggle: (code: string) => Promise<void>
  isPlaying: boolean
  isReady: boolean
  error: string | null
  clearError: () => void
  repl: ReplInstance | null
}

export function useStrudelRepl(): UseStrudelReplReturn {
  const replRef = useRef<ReplInstance | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false

    async function init() {
      try {
        const [
          { evalScope, setTime },
          { webaudioRepl, initAudioOnFirstClick, registerSynthSounds },
          { transpiler },
          { miniAllStrings },
        ] = await Promise.all([
          import('@strudel/core'),
          import('@strudel/webaudio'),
          import('@strudel/transpiler'),
          import('@strudel/mini'),
        ])

        if (disposed) return

        initAudioOnFirstClick()
        miniAllStrings()

        const repl = webaudioRepl({
          transpiler,
          onToggle: (started: boolean) => setIsPlaying(started),
        }) as ReplInstance

        setTime(() => repl.scheduler.now())

        // Load all modules into eval scope so patterns can use them
        await evalScope(
          evalScope,
          import('@strudel/core'),
          import('@strudel/mini'),
          import('@strudel/tonal'),
          import('@strudel/webaudio'),
        )

        await registerSynthSounds()

        if (disposed) {
          repl.stop()
          return
        }

        replRef.current = repl
        setIsReady(true)
      } catch (err) {
        console.error('Failed to initialize Strudel:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize')
      }
    }

    init()

    return () => {
      disposed = true
      replRef.current?.stop()
      replRef.current = null
    }
  }, [])

  const evaluate = useCallback(async (code: string) => {
    if (!replRef.current) return
    setError(null)
    try {
      return await replRef.current.evaluate(code)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Evaluation error'
      setError(msg)
      return undefined
    }
  }, [])

  const stop = useCallback(() => {
    replRef.current?.stop()
  }, [])

  const toggle = useCallback(async (code: string) => {
    if (!replRef.current) return
    setError(null)
    try {
      if (replRef.current.scheduler.started) {
        replRef.current.stop()
      } else {
        await replRef.current.evaluate(code)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation error')
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    evaluate,
    stop,
    toggle,
    isPlaying,
    isReady,
    error,
    clearError,
    repl: replRef.current,
  }
}
