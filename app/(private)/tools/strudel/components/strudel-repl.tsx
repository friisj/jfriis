'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Square, Pause } from 'lucide-react'
import type { StrudelMirror } from '@strudel/codemirror'

const DEFAULT_CODE = `// Welcome to Strudel!
// Press Ctrl+Enter to evaluate, Ctrl+. to stop
// docs: https://strudel.cc/workshop/getting-started

note("c3 eb3 g3 bb3")
  .s("sawtooth")
  .cutoff(sine.range(400, 2000).slow(4))
  .decay(.1)
  .sustain(.3)
  .delay(.25)
  .delaytime(.125)
  .room(.5)
`

export default function StrudelRepl() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mirrorRef = useRef<StrudelMirror | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let disposed = false

    async function init() {
      try {
        // Dynamic imports to avoid SSR issues
        const [webMod, cmMod] = await Promise.all([
          import('@strudel/web'),
          import('@strudel/codemirror'),
        ])

        if (disposed) return

        const { initStrudel } = webMod
        const { StrudelMirror } = cmMod

        // Initialize the audio engine
        const prebake = () => initStrudel()

        const drawContext = canvasRef.current?.getContext('2d') || undefined

        const mirror = new StrudelMirror({
          root: containerRef.current!,
          initialCode: DEFAULT_CODE,
          prebake,
          drawContext,
          drawTime: [-2, 2],
          autodraw: true,
          theme: 'strudelTheme',
          onToggle: (started: boolean) => {
            setIsPlaying(started)
          },
          onError: (err: Error) => {
            setError(err.message)
            setTimeout(() => setError(null), 5000)
          },
        })

        mirrorRef.current = mirror
        setIsReady(true)
      } catch (err) {
        console.error('Failed to initialize Strudel:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize')
      }
    }

    init()

    return () => {
      disposed = true
      if (mirrorRef.current) {
        mirrorRef.current.stop()
        mirrorRef.current.clear()
        // StrudelMirror doesn't expose EditorView.destroy(), so we
        // remove the mounted DOM to prevent stale CodeMirror instances
        // on React strict-mode double-mount or fast-refresh.
        const cmEl = containerRef.current?.querySelector('.cm-editor')
        cmEl?.remove()
        mirrorRef.current = null
      }
    }
  }, [])

  const handleStop = useCallback(async () => {
    if (!mirrorRef.current) return
    await mirrorRef.current.stop()
  }, [])

  const handleToggle = useCallback(async () => {
    if (!mirrorRef.current) return
    setError(null)
    try {
      await mirrorRef.current.toggle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation error')
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] text-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-black/30 border-b border-white/10 shrink-0">
        <button
          onClick={handleToggle}
          disabled={!isReady}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors text-sm font-mono"
          title={isPlaying ? 'Stop (Ctrl+.)' : 'Play (Ctrl+Enter)'}
        >
          {isPlaying ? (
            <>
              <Square className="w-3.5 h-3.5" />
              stop
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              play
            </>
          )}
        </button>

        {isPlaying && (
          <button
            onClick={handleStop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors text-sm font-mono"
            title="Hush"
          >
            <Pause className="w-3.5 h-3.5" />
            hush
          </button>
        )}

        <div className="flex-1" />

        {error && (
          <div className="text-red-400 text-xs font-mono truncate max-w-md">
            {error}
          </div>
        )}

        <span className="text-white/30 text-xs font-mono">
          ctrl+enter eval &middot; ctrl+. stop
        </span>
      </div>

      {/* Canvas for pattern visualization */}
      <canvas
        ref={canvasRef}
        className="w-full shrink-0"
        style={{ height: '120px' }}
        width={1200}
        height={120}
      />

      {/* Editor container — StrudelMirror mounts CodeMirror here */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-auto [&_.cm-editor]:h-full [&_.cm-scroller]:!overflow-auto"
      />
    </div>
  )
}
