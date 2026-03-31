'use client'

import { Play, Square, FileCode } from 'lucide-react'

type StrudelActionOutput = {
  type: 'strudel_action'
  action: string
  code?: string
  description?: string
}

type Props = {
  output: StrudelActionOutput
}

export function StrudelActionCard({ output }: Props) {
  switch (output.action) {
    case 'edit_pattern':
      return (
        <div className="flex items-start gap-2 px-3 py-2 rounded bg-purple-500/10 border border-purple-500/20 text-xs font-mono">
          <FileCode className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <span className="text-purple-300">Wrote pattern</span>
            {output.description && (
              <p className="text-zinc-400 mt-0.5 truncate">{output.description}</p>
            )}
          </div>
        </div>
      )
    case 'evaluate':
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-green-500/10 border border-green-500/20 text-xs font-mono">
          <Play className="w-3.5 h-3.5 text-green-400" />
          <span className="text-green-300">Playing</span>
        </div>
      )
    case 'hush':
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-zinc-500/10 border border-zinc-500/20 text-xs font-mono">
          <Square className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-300">Stopped</span>
        </div>
      )
    default:
      return null
  }
}
