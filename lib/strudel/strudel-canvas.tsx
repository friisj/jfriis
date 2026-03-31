'use client'

import { useEffect, useRef } from 'react'
import type { Drawer } from '@strudel/draw'

export type VizMode = 'pianoroll' | 'pitchwheel' | 'painter'

type Scheduler = { now: () => number; pattern?: unknown }

type StrudelCanvasProps = {
  scheduler: Scheduler | null
  isPlaying: boolean
  mode?: VizMode
  height?: number
}

export function StrudelCanvas({
  scheduler,
  isPlaying,
  mode = 'pianoroll',
  height = 120,
}: StrudelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawerRef = useRef<Drawer | null>(null)
  const modeRef = useRef(mode)
  modeRef.current = mode

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let drawer: Drawer | null = null

    async function init() {
      const draw = await import('@strudel/draw')

      const ctx = canvas!.getContext('2d')
      if (!ctx) return

      drawer = new draw.Drawer((haps, time, _drawer, painters) => {
        const rect = canvas!.getBoundingClientRect()
        if (canvas!.width !== rect.width || canvas!.height !== rect.height) {
          canvas!.width = rect.width
          canvas!.height = rect.height
        }

        const currentMode = modeRef.current

        if (currentMode === 'painter' && painters?.length) {
          // Execute painters registered by the pattern (e.g. .spiral(), .pitchwheel())
          for (const painter of painters as Array<(ctx: CanvasRenderingContext2D, time: number, haps: unknown[], drawTime: [number, number]) => void>) {
            painter(ctx, time, haps, [-2, 2])
          }
        } else if (currentMode === 'pitchwheel') {
          draw.pitchwheel({
            haps: haps.filter((h) => (h as { isActive?: (t: number) => boolean }).isActive?.(time)),
            ctx,
            edo: 12,
            hapcircles: 1,
            circle: 1,
            thickness: 2,
            hapRadius: 5,
            mode: 'flake',
            margin: 10,
          })
        } else {
          // Default: pianoroll
          draw.__pianoroll({
            time,
            haps,
            ctx,
            cycles: 8,
            playhead: 0.5,
            active: '#e879f9',
            inactive: '#6b21a8',
            background: 'transparent',
            minMidi: 20,
            maxMidi: 100,
            autorange: 1,
          })
        }
      }, [-2, 2])

      drawerRef.current = drawer
    }

    init()

    return () => {
      drawer?.stop()
      drawerRef.current = null
    }
  }, [])

  useEffect(() => {
    const drawer = drawerRef.current
    if (!drawer || !scheduler) return

    if (isPlaying) {
      drawer.start(scheduler)
    } else {
      drawer.stop()
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }, [isPlaying, scheduler])

  const dynamicHeight = mode === 'pitchwheel' || mode === 'painter' ? Math.max(height, 200) : height

  return (
    <canvas
      ref={canvasRef}
      className="w-full shrink-0 block"
      style={{ height: dynamicHeight }}
    />
  )
}
