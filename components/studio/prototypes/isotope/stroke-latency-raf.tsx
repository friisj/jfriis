'use client'

/**
 * Stroke Latency rAF Spike — H3 (alternate)
 *
 * Tests whether Canvas 2D stroke rendering stays below the 16ms frame budget
 * that separates "sketch feel" from "CAD feel".
 *
 * Unlike the original stroke-latency spike (which measures inline in
 * onPointerMove), this version uses a rAF loop with a pending-points queue,
 * separating frame timing from draw call timing.
 *
 * Measures:
 * - rAF frame interval (are we hitting 60fps?)
 * - Draw call time per frame (JS path-building + command submission)
 * - P50/P95/P99 draw latency over a rolling 300-frame window
 */

import { useRef, useEffect, useState, useCallback } from 'react'

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function colorForMs(value: number, warn: number, fail: number): string {
  if (value <= warn) return '#22c55e'
  if (value <= fail) return '#f59e0b'
  return '#ef4444'
}

const STROKE_COLORS = [
  '#1a1a1a',
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#9333ea',
  '#ea580c',
]

const SAMPLE_WINDOW = 300
const FRAME_BUDGET = 16.67

export default function StrokeLatencyRaf() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  // Refs that the RAF loop reads — avoids closure stale values
  const strokeWidthRef = useRef(3)
  const strokeColorRef = useRef('#1a1a1a')

  // Drawing state
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const pendingPointsRef = useRef<Array<{ x: number; y: number }>>([])

  // Measurement state
  const lastFrameTimeRef = useRef<number>(0)
  const frameTimingsRef = useRef<number[]>([])
  const drawTimingsRef = useRef<number[]>([])
  const totalPointsRef = useRef(0)
  const strokeCountRef = useRef(0)

  // Overlay ref for direct DOM updates (no React re-render in the loop)
  const overlayRef = useRef<HTMLDivElement>(null)

  // React state — only for controls
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [strokeColor, setStrokeColor] = useState('#1a1a1a')
  const [cleared, setCleared] = useState(0)

  // Sync control state → refs
  useEffect(() => { strokeWidthRef.current = strokeWidth }, [strokeWidth])
  useEffect(() => { strokeColorRef.current = strokeColor }, [strokeColor])

  const updateOverlay = useCallback(() => {
    const el = overlayRef.current
    if (!el) return

    const frames = frameTimingsRef.current
    const draws = drawTimingsRef.current
    if (frames.length < 2) return

    const avgFrame = frames.reduce((a, b) => a + b, 0) / frames.length
    const fps = avgFrame > 0 ? Math.round(1000 / avgFrame) : 0
    const avgDraw = draws.length > 0
      ? draws.reduce((a, b) => a + b, 0) / draws.length
      : 0
    const p50 = percentile(draws.length > 0 ? draws : [0], 50)
    const p95 = percentile(draws.length > 0 ? draws : [0], 95)
    const p99 = percentile(draws.length > 0 ? draws : [0], 99)
    const overBudget = (frames.filter((f) => f > FRAME_BUDGET).length / Math.max(frames.length, 1)) * 100

    const fpsColor = colorForMs(avgFrame, FRAME_BUDGET, 20)
    const drawColor = colorForMs(avgDraw, 8, 14)

    el.innerHTML = `
      <div style="font-size:11px;line-height:1.9;color:#e5e7eb;font-family:monospace">
        <div style="font-size:12px;font-weight:700;margin-bottom:6px;color:#f9fafb;letter-spacing:0.05em">LATENCY MONITOR</div>
        <div style="display:flex;justify-content:space-between;gap:16px">
          <span style="color:#9ca3af">FPS</span>
          <span style="color:${fpsColor};font-weight:600">${fps}</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:16px">
          <span style="color:#9ca3af">Frame</span>
          <span style="color:${fpsColor};font-weight:600">${avgFrame.toFixed(1)}ms</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:16px">
          <span style="color:#9ca3af">Draw</span>
          <span style="color:${drawColor};font-weight:600">${avgDraw.toFixed(2)}ms</span>
        </div>
        <div style="margin-top:6px;border-top:1px solid #374151;padding-top:6px">
          <div style="display:flex;justify-content:space-between;gap:16px">
            <span style="color:#9ca3af">P50</span>
            <span style="color:${colorForMs(p50, 8, 14)}">${p50.toFixed(2)}ms</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:16px">
            <span style="color:#9ca3af">P95</span>
            <span style="color:${colorForMs(p95, 12, 16)}">${p95.toFixed(2)}ms</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:16px">
            <span style="color:#9ca3af">P99</span>
            <span style="color:${colorForMs(p99, 14, 20)}">${p99.toFixed(2)}ms</span>
          </div>
        </div>
        <div style="margin-top:6px;border-top:1px solid #374151;padding-top:6px">
          <div style="display:flex;justify-content:space-between;gap:16px">
            <span style="color:#9ca3af">&gt;16.67ms</span>
            <span style="color:${overBudget > 5 ? '#ef4444' : '#22c55e'}">${overBudget.toFixed(1)}%</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:16px">
            <span style="color:#9ca3af">Strokes</span>
            <span style="color:#9ca3af">${strokeCountRef.current}</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:16px">
            <span style="color:#9ca3af">Points</span>
            <span style="color:#9ca3af">${totalPointsRef.current}</span>
          </div>
          <div style="margin-top:4px;font-size:10px;color:#6b7280">n=${frames.length} frames</div>
        </div>
      </div>
    `
  }, [])

  // Main RAF loop — re-inits on clear
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Scale canvas backing store by devicePixelRatio so the browser doesn't
    // upscale on retina displays. Without this, HiDPI rendering doubles GPU
    // work and inflates frame timings, distorting the measurement.
    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)

    const ctx = canvas.getContext('2d')!
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // Scale all draw calls by DPR so coordinates remain in CSS pixels
    const dpr = window.devicePixelRatio || 1
    ctx.scale(dpr, dpr)

    // Reset metrics on each init (triggered by clear)
    frameTimingsRef.current = []
    drawTimingsRef.current = []
    totalPointsRef.current = 0
    strokeCountRef.current = 0
    lastFrameTimeRef.current = 0
    lastPointRef.current = null

    let overlayTick = 0

    const loop = (timestamp: number) => {
      // Frame timing
      if (lastFrameTimeRef.current > 0) {
        const ft = timestamp - lastFrameTimeRef.current
        frameTimingsRef.current.push(ft)
        if (frameTimingsRef.current.length > SAMPLE_WINDOW)
          frameTimingsRef.current.shift()
      }
      lastFrameTimeRef.current = timestamp

      // Drain pending points
      const pending = pendingPointsRef.current.splice(0)
      if (pending.length > 0) {
        // NOTE: ctx.stroke() dispatches work to the GPU asynchronously —
        // this measures JS path-building + command submission only, not actual
        // rasterization. The rAF frame interval is the better proxy for
        // perceived latency; draw time isolates the JS cost specifically.
        const drawStart = performance.now()

        ctx.strokeStyle = strokeColorRef.current
        ctx.lineWidth = strokeWidthRef.current
        ctx.beginPath()

        for (let i = 0; i < pending.length; i++) {
          const pt = pending[i]
          if (i === 0 && lastPointRef.current) {
            ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
            ctx.lineTo(pt.x, pt.y)
          } else if (i === 0) {
            ctx.moveTo(pt.x, pt.y)
          } else {
            ctx.lineTo(pt.x, pt.y)
          }
        }
        ctx.stroke()
        lastPointRef.current = pending[pending.length - 1]

        const drawTime = performance.now() - drawStart
        drawTimingsRef.current.push(drawTime)
        if (drawTimingsRef.current.length > SAMPLE_WINDOW)
          drawTimingsRef.current.shift()
        totalPointsRef.current += pending.length
      }

      // Update overlay every 10 frames (direct DOM, no React)
      overlayTick++
      if (overlayTick % 10 === 0) updateOverlay()

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [cleared, updateOverlay])

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true
    lastPointRef.current = null
    strokeCountRef.current++
    const rect = canvasRef.current!.getBoundingClientRect()
    pendingPointsRef.current.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    canvasRef.current!.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const rect = canvasRef.current!.getBoundingClientRect()
    // Include coalesced events for smoother stroke at high input rates
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]
    for (const ev of events) {
      pendingPointsRef.current.push({
        x: ev.clientX - rect.left,
        y: ev.clientY - rect.top,
      })
    }
  }

  const handlePointerUp = () => {
    isDrawingRef.current = false
    lastPointRef.current = null
  }

  const clearCanvas = () => {
    isDrawingRef.current = false
    pendingPointsRef.current = []
    setCleared((c) => c + 1)
  }

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      {/* Canvas */}
      <div className="flex-1 relative bg-white">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none select-none"
          style={{ cursor: 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label="Drawing canvas"
        />

        {/* Latency overlay — updated imperatively via ref */}
        <div
          ref={overlayRef}
          className="absolute top-3 left-3 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 pointer-events-none min-w-[160px]"
        />

        {/* Budget reference */}
        <div className="absolute bottom-3 left-3 text-xs text-gray-400 pointer-events-none space-y-0.5">
          <div>
            <span className="text-green-500 font-mono">■</span> &lt;8ms draw — comfortable
          </div>
          <div>
            <span className="text-amber-500 font-mono">■</span> 8–14ms — approaching limit
          </div>
          <div>
            <span className="text-red-500 font-mono">■</span> &gt;16.67ms frame — over budget
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-56 border-l bg-card p-4 flex flex-col gap-5 shrink-0 overflow-y-auto">
        {/* Stroke width */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Width
          </h2>
          <input
            type="range"
            min="1"
            max="24"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex gap-1 mt-1">
            {[1, 3, 8, 16].map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={`flex-1 py-1 text-xs rounded transition-colors ${
                  strokeWidth === w
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Color
          </h2>
          <div className="flex flex-wrap gap-2">
            {STROKE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setStrokeColor(c)}
                aria-label={`Stroke color ${c}`}
                aria-pressed={strokeColor === c}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  strokeColor === c
                    ? 'border-primary scale-110'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Clear */}
        <div>
          <button
            onClick={clearCanvas}
            className="w-full px-3 py-2 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors"
          >
            Clear Canvas
          </button>
        </div>

        {/* Hypothesis context */}
        <div className="mt-auto pt-4 border-t">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Hypothesis
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Input-to-render latency below 16ms is the threshold at which
            Isotope feels like sketching rather than CAD. Above it, the
            creative loop breaks.
          </p>
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            <strong className="block mb-1">Pass criteria</strong>
            Stroke rendering consistently hits 60fps. Draw calls stay{' '}
            {'<'}8ms. P99 latency {'<'}16ms.
          </div>
        </div>
      </div>
    </div>
  )
}
