'use client'

import { useCallback, useRef, useState } from 'react'
import { Play, Square, Pause, BarChart3, Circle, Brush } from 'lucide-react'
import { useStrudelRepl } from '@/lib/strudel/use-strudel-repl'
import { StrudelEditor, DEFAULT_EDITOR_SETTINGS } from '@/lib/strudel/strudel-editor'
import type { EditorSettings } from '@/lib/strudel/strudel-editor'
import { StrudelCanvas } from '@/lib/strudel/strudel-canvas'
import type { VizMode } from '@/lib/strudel/strudel-canvas'
import { StrudelSettings } from '@/lib/strudel/strudel-settings'

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

type Widget = {
  type: string
  from: number
  to: number
  value: string
  min?: number
  max?: number
  step?: number
}

export default function CustomRepl() {
  const { evaluate, stop, toggle, isPlaying, isReady, error, repl } = useStrudelRepl()
  const [code, setCode] = useState(DEFAULT_CODE)
  const [miniLocations, setMiniLocations] = useState<number[][]>([])
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS)
  const [vizMode, setVizMode] = useState<VizMode>('pianoroll')
  const codeRef = useRef(code)

  codeRef.current = code

  const handleEvaluate = useCallback(async () => {
    const result = await evaluate(codeRef.current)
    if (result?.miniLocations) {
      setMiniLocations(result.miniLocations)
    }
    if (result?.widgets) {
      setWidgets(result.widgets as Widget[])
    }
  }, [evaluate])

  const handleStop = useCallback(() => {
    stop()
    setMiniLocations([])
    setWidgets([])
  }, [stop])

  const handleToggle = useCallback(async () => {
    await toggle(codeRef.current)
  }, [toggle])

  const scheduler = repl?.scheduler ?? null

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

        <div className="flex items-center rounded bg-white/5 p-0.5">
          {([
            { mode: 'pianoroll' as VizMode, icon: BarChart3, title: 'Piano roll' },
            { mode: 'pitchwheel' as VizMode, icon: Circle, title: 'Pitch wheel' },
            { mode: 'painter' as VizMode, icon: Brush, title: 'Pattern painters (.spiral(), .pitchwheel(), etc.)' },
          ]).map(({ mode: m, icon: Icon, title }) => (
            <button
              key={m}
              onClick={() => setVizMode(m)}
              className={`p-1.5 rounded transition-colors ${vizMode === m ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'}`}
              title={title}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {error && (
          <div className="text-red-400 text-xs font-mono truncate max-w-md">
            {error}
          </div>
        )}

        <span className="text-white/30 text-xs font-mono">
          ctrl+enter eval &middot; ctrl+. stop
        </span>

        <StrudelSettings
          settings={editorSettings}
          onChange={setEditorSettings}
        />
      </div>

      {/* Pattern visualization */}
      <StrudelCanvas
        scheduler={scheduler}
        isPlaying={isPlaying}
        mode={vizMode}
      />

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <StrudelEditor
          code={code}
          onChange={setCode}
          onEvaluate={handleEvaluate}
          onStop={handleStop}
          miniLocations={miniLocations}
          widgets={widgets}
          settings={editorSettings}
        />
      </div>
    </div>
  )
}
