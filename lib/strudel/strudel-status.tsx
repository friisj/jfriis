'use client'

import { useEffect, useState } from 'react'

type Scheduler = {
  now: () => number
  started: boolean
  cps?: number
  pattern?: unknown
}

type Props = {
  scheduler: Scheduler | null
  isPlaying: boolean
}

export function StrudelStatus({ scheduler, isPlaying }: Props) {
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    if (!isPlaying || !scheduler) {
      setCycle(0)
      return
    }

    let raf: number
    const tick = () => {
      setCycle(scheduler.now())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(raf)
  }, [isPlaying, scheduler])

  const cps = scheduler?.cps ?? 0.5
  const bpm = Math.round(cps * 60 * 2)

  return (
    <div className="flex items-center gap-4 px-4 py-1 bg-black/40 border-t border-white/10 text-[10px] font-mono text-zinc-500 shrink-0">
      <span>
        cycle{' '}
        <span className={isPlaying ? 'text-zinc-300' : ''}>
          {isPlaying ? cycle.toFixed(2) : '-'}
        </span>
      </span>
      <span>
        bpm <span className="text-zinc-300">{bpm}</span>
      </span>
      {isPlaying && (
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          playing
        </span>
      )}
    </div>
  )
}
