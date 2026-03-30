'use client'

import { useEffect, useRef } from 'react'
import type { Drawer } from '@strudel/draw'

type Scheduler = { now: () => number; pattern?: unknown }

type StrudelCanvasProps = {
  scheduler: Scheduler | null
  isPlaying: boolean
  height?: number
}

export function StrudelCanvas({ scheduler, isPlaying, height = 120 }: StrudelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawerRef = useRef<Drawer | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let drawer: Drawer | null = null

    async function init() {
      const { Drawer, __pianoroll } = await import('@strudel/draw')

      const ctx = canvas!.getContext('2d')
      if (!ctx) return

      drawer = new Drawer((haps, time) => {
        // Resize canvas to match CSS size for crisp rendering
        const rect = canvas!.getBoundingClientRect()
        if (canvas!.width !== rect.width || canvas!.height !== rect.height) {
          canvas!.width = rect.width
          canvas!.height = rect.height
        }

        __pianoroll({
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
      }, [-2, 2])

      drawerRef.current = drawer
    }

    init()

    return () => {
      drawer?.stop()
      drawerRef.current = null
    }
  }, [])

  // Start/stop the drawer when playback state or scheduler changes
  useEffect(() => {
    const drawer = drawerRef.current
    if (!drawer || !scheduler) return

    if (isPlaying) {
      drawer.start(scheduler)
    } else {
      drawer.stop()
      // Clear the canvas when stopped
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }, [isPlaying, scheduler])

  return (
    <canvas
      ref={canvasRef}
      className="w-full shrink-0 block"
      style={{ height }}
    />
  )
}
