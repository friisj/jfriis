'use client'

/**
 * Stroke Latency Spike — H3
 *
 * Tests: sub-16ms input-to-render latency is the threshold for sketch feel.
 *
 * Architecture: raw Canvas 2D API on a dedicated overlay canvas. Pointer
 * events → immediate pixel. No React re-renders in the hot path.
 *
 * Measures:
 *   - Per-stroke input-to-render time (pointermove → canvas pixel)
 *   - Rolling 60-sample average
 *   - Frame budget headroom (16.67ms target)
 */

import { useEffect, useRef, useCallback } from 'react'

interface LatencyStats {
  current: number
  avg: number
  max: number
  samples: number[]
}

const SAMPLE_WINDOW = 60
const FRAME_BUDGET = 16.67

export default function StrokeLatency() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const statsRef = useRef<LatencyStats>({ current: 0, avg: 0, max: 0, samples: [] })
  const statsDisplayRef = useRef<HTMLDivElement>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)

  const updateStatsDisplay = useCallback(() => {
    const el = statsDisplayRef.current
    if (!el) return
    const { current, avg, max } = statsRef.current
    const budgetColor = avg <= FRAME_BUDGET ? '#22c55e' : avg <= FRAME_BUDGET * 1.5 ? '#f59e0b' : '#ef4444'
    el.innerHTML = `
      <span style="color:${budgetColor}">now ${current.toFixed(2)}ms</span>
      &nbsp;·&nbsp;avg ${avg.toFixed(2)}ms
      &nbsp;·&nbsp;max ${max.toFixed(2)}ms
      &nbsp;·&nbsp;budget ${FRAME_BUDGET}ms
    `
  }, [])

  const recordLatency = useCallback((ms: number) => {
    const stats = statsRef.current
    stats.current = ms
    stats.samples.push(ms)
    if (stats.samples.length > SAMPLE_WINDOW) stats.samples.shift()
    stats.avg = stats.samples.reduce((a, b) => a + b, 0) / stats.samples.length
    stats.max = Math.max(stats.max, ms)
    updateStatsDisplay()
  }, [updateStatsDisplay])

  const onPointerDown = useCallback((e: PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    isDrawingRef.current = true
    const rect = canvas.getBoundingClientRect()
    lastPointRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isDrawingRef.current || !lastPointRef.current) return
    const t0 = performance.now()

    const ctx = ctxRef.current
    const canvas = canvasRef.current
    if (!ctx || !canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const prev = lastPointRef.current

    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(x, y)
    ctx.stroke()

    lastPointRef.current = { x, y }

    // Force composite to measure true pixel-write time
    ctx.getImageData(0, 0, 1, 1)
    recordLatency(performance.now() - t0)
  }, [recordLatency])

  const onPointerUp = useCallback(() => {
    isDrawingRef.current = false
    lastPointRef.current = null
  }, [])

  const clearCanvas = useCallback(() => {
    const ctx = ctxRef.current
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    statsRef.current = { current: 0, avg: 0, max: 0, samples: [] }
    updateStatsDisplay()
  }, [updateStatsDisplay])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = width * window.devicePixelRatio
      canvas.height = height * window.devicePixelRatio
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctxRef.current = ctx
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerUp)

    return () => {
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerUp)
    }
  }, [onPointerDown, onPointerMove, onPointerUp])

  return (
    <div className="relative w-full h-full flex flex-col bg-white">
      {/* Latency HUD */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs font-mono">
        <span className="text-gray-500 font-semibold">H3 · Stroke Latency</span>
        <div ref={statsDisplayRef} className="text-gray-400">draw to measure</div>
        <button
          onClick={clearCanvas}
          className="text-gray-400 hover:text-gray-700 transition-colors text-xs"
        >
          clear
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 w-full cursor-crosshair touch-none"
        style={{ touchAction: 'none' }}
      />

      {/* Budget legend */}
      <div className="flex gap-4 px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-400 font-mono">
        <span><span className="text-green-500">■</span> ≤16.67ms — sketch feel</span>
        <span><span className="text-amber-500">■</span> ≤25ms — marginal</span>
        <span><span className="text-red-500">■</span> &gt;25ms — CAD feel</span>
      </div>
    </div>
  )
}
