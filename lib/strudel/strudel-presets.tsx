'use client'

import { useState } from 'react'
import { Save, Trash2, BookOpen } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useStrudelPresets } from './use-strudel-presets'

type Props = {
  currentCode: string
  onLoad: (code: string) => void
}

export function StrudelPresets({ currentCode, onLoad }: Props) {
  const { presets, save, remove } = useStrudelPresets()
  const [saveName, setSaveName] = useState('')
  const [showSave, setShowSave] = useState(false)

  const handleSave = () => {
    if (!saveName.trim()) return
    save(saveName.trim(), currentCode)
    setSaveName('')
    setShowSave(false)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
          title="Presets"
        >
          <BookOpen className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-56 bg-zinc-900 border-zinc-700 text-white p-2 space-y-1"
      >
        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-2 py-1">
          Presets
        </div>

        {presets.map((preset) => (
          <div
            key={preset.id}
            className="group flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-white/10 cursor-pointer"
            onClick={() => onLoad(preset.code)}
          >
            <span className="text-xs text-zinc-300 group-hover:text-white truncate flex-1">
              {preset.name}
            </span>
            {preset.builtIn ? (
              <span className="text-[9px] text-zinc-600">built-in</span>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  remove(preset.id)
                }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all"
                title="Delete preset"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        <div className="border-t border-zinc-700 pt-1 mt-1">
          {showSave ? (
            <div className="flex items-center gap-1 px-1">
              <input
                autoFocus
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="Preset name..."
                className="flex-1 text-xs bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-zinc-200 placeholder:text-zinc-600"
              />
              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="p-1 rounded hover:bg-white/10 disabled:opacity-30 text-purple-400"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSave(true)}
              className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded transition-colors"
            >
              <Save className="w-3 h-3" />
              Save current...
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
