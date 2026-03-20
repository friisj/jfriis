'use client'

/**
 * Snap-2D Spike — H2 (alternate)
 *
 * Tests whether snapping during freehand Canvas 2D drawing feels assistive
 * or frustrating. Builds on the rAF loop pattern from stroke-latency-raf.
 *
 * Features:
 * - Freehand drawing with optional snap-to-grid
 * - Toggle snap on/off, threshold slider, grid size selector
 * - Visual grid overlay when snap is on
 * - Snap indicator (crosshair at nearest grid point) while drawing
 * - HUD: snap state, threshold, snapped-point percentage
 */

import { useRef, useEffect, useState, useCallback } from 'react'

const STROKE_COLORS = [
  '#1a1a1a',
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#9333ea',
  '#ea580c',
]

const GRID_SIZES = [20, 30, 40, 60]

interface StoredStroke {
  points: Array<{ x: number; y: number }>
  color: string
  width: number
}

function nearestGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

export default function Snap2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  // Drawing refs
  const isDrawingRef = useRef(false)
  const pendingPointsRef = useRef<Array<{ x: number; y: number }>>([])
  const currentStrokeRef = useRef<Array<{ x: number; y: number }>>([])
  const completedStrokesRef = useRef<StoredStroke[]>([])
  const cursorPosRef = useRef<{ x: number; y: number } | null>(null)

  // Settings refs (synced from state)
  const snapEnabledRef = useRef(true)
  const thresholdRef = useRef(15)
  const gridSizeRef = useRef(30)
  const strokeWidthRef = useRef(3)
  const strokeColorRef = useRef('#1a1a1a')

  // Stats refs
  const totalPointsRef = useRef(0)
  const snappedPointsRef = useRef(0)

  // Overlay ref for direct DOM updates
  const overlayRef = useRef<HTMLDivElement>(null)

  // React state for controls only
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [threshold, setThreshold] = useState(15)
  const [gridSize, setGridSize] = useState(30)
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [strokeColor, setStrokeColor] = useState('#1a1a1a')
  const [cleared, setCleared] = useState(0)

  // Sync state → refs
  useEffect(() => { snapEnabledRef.current = snapEnabled }, [snapEnabled])
  useEffect(() => { thresholdRef.current = threshold }, [threshold])
  useEffect(() => { gridSizeRef.current = gridSize }, [gridSize])
  useEffect(() => { strokeWidthRef.current = strokeWidth }, [strokeWidth])
  useEffect(() => { strokeColorRef.current = strokeColor }, [strokeColor])

  const updateOverlay = useCallback(() => {
    const el = overlayRef.current
    if (!el) return

    const total = totalPointsRef.current
    const snapped = snappedPointsRef.current
    const pct = total > 0 ? ((snapped / total) * 100).toFixed(1) : '0.0'
    const snapOn = snapEnabledRef.current

    el.innerHTML = `
      <div style="font-size:11px;line-height:1.9;color:#e5e7eb;font-family:monospace">
        <div style="font-size:12px;font-weight:700;margin-bottom:6px;color:#f9fafb;letter-spacing:0.05em">SNAP MONITOR</div>
        <div style="display:flex;justify-content:space-between;gap:16px">
          <span style="color:#9ca3af">Snap</span>
          <span style="color:${snapOn ? '#22c55e' : '#ef4444'};font-weight:600">${snapOn ? 'ON' : 'OFF'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:16px">
          <span style="color:#9ca3af">Grid</span>
          <span style="color:#9ca3af">${gridSizeRef.current}px</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:16px">
          <span style="color:#9ca3af">Threshold</span>
          <span style="color:#9ca3af">${thresholdRef.current}px</span>
        </div>
        <div style="margin-top:6px;border-top:1px solid #374151;padding-top:6px">
          <div style="display:flex;justify-content:space-between;gap:16px">
            <span style="color:#9ca3af">Points</span>
            <span style="color:#9ca3af">${total}</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:16px">
            <span style="color:#9ca3af">Snapped</span>
            <span style="color:${parseFloat(pct) > 50 ? '#22c55e' : '#f59e0b'}">${pct}%</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:16px">
            <span style="color:#9ca3af">Strokes</span>
            <span style="color:#9ca3af">${completedStrokesRef.current.length}</span>
          </div>
        </div>
      </div>
    `
  }, [])

  // Main rAF loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

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
    const dpr = window.devicePixelRatio || 1

    // Reset on clear
    completedStrokesRef.current = []
    currentStrokeRef.current = []
    totalPointsRef.current = 0
    snappedPointsRef.current = 0

    let overlayTick = 0

    const drawGrid = (w: number, h: number) => {
      const gs = gridSizeRef.current
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      for (let x = 0; x <= w; x += gs) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
      }
      for (let y = 0; y <= h; y += gs) {
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
      }
      ctx.stroke()
    }

    const drawStroke = (stroke: StoredStroke | { points: Array<{ x: number; y: number }>; color: string; width: number }) => {
      if (stroke.points.length < 2) return
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.stroke()
    }

    const drawSnapIndicator = (cursor: { x: number; y: number }) => {
      const gs = gridSizeRef.current
      const gx = nearestGrid(cursor.x, gs)
      const gy = nearestGrid(cursor.y, gs)
      const dist = Math.hypot(cursor.x - gx, cursor.y - gy)

      if (dist <= thresholdRef.current) {
        // Crosshair at snap point
        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 1
        const arm = 8
        ctx.beginPath()
        ctx.moveTo(gx - arm, gy)
        ctx.lineTo(gx + arm, gy)
        ctx.moveTo(gx, gy - arm)
        ctx.lineTo(gx, gy + arm)
        ctx.stroke()

        // Circle around snap point
        ctx.beginPath()
        ctx.arc(gx, gy, 4, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    const loop = () => {
      const w = canvas.width / dpr
      const h = canvas.height / dpr

      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.scale(dpr, dpr)

      // Grid
      if (snapEnabledRef.current) {
        drawGrid(w, h)
      }

      // Completed strokes
      for (const stroke of completedStrokesRef.current) {
        drawStroke(stroke)
      }

      // Current stroke in progress
      if (currentStrokeRef.current.length > 0) {
        drawStroke({
          points: currentStrokeRef.current,
          color: strokeColorRef.current,
          width: strokeWidthRef.current,
        })
      }

      // Drain pending points into current stroke
      const pending = pendingPointsRef.current.splice(0)
      for (const pt of pending) {
        let finalPt = pt
        totalPointsRef.current++

        if (snapEnabledRef.current) {
          const gs = gridSizeRef.current
          const gx = nearestGrid(pt.x, gs)
          const gy = nearestGrid(pt.y, gs)
          const dist = Math.hypot(pt.x - gx, pt.y - gy)
          if (dist <= thresholdRef.current) {
            finalPt = { x: gx, y: gy }
            snappedPointsRef.current++
          }
        }

        currentStrokeRef.current.push(finalPt)
      }

      // Snap indicator at cursor position
      if (cursorPosRef.current && snapEnabledRef.current) {
        drawSnapIndicator(cursorPosRef.current)
      }

      ctx.restore()

      // Update overlay every 10 frames
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
    currentStrokeRef.current = []
    const rect = canvasRef.current!.getBoundingClientRect()
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    pendingPointsRef.current.push(pt)
    cursorPosRef.current = pt
    canvasRef.current!.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    cursorPosRef.current = pt

    if (!isDrawingRef.current) return
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]
    for (const ev of events) {
      pendingPointsRef.current.push({
        x: ev.clientX - rect.left,
        y: ev.clientY - rect.top,
      })
    }
  }

  const handlePointerUp = () => {
    if (isDrawingRef.current && currentStrokeRef.current.length > 0) {
      completedStrokesRef.current.push({
        points: [...currentStrokeRef.current],
        color: strokeColorRef.current,
        width: strokeWidthRef.current,
      })
      currentStrokeRef.current = []
    }
    isDrawingRef.current = false
  }

  const handlePointerLeave = () => {
    cursorPosRef.current = null
    handlePointerUp()
  }

  const clearCanvas = () => {
    isDrawingRef.current = false
    pendingPointsRef.current = []
    currentStrokeRef.current = []
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
          onPointerLeave={handlePointerLeave}
          onPointerCancel={handlePointerUp}
          aria-label="Drawing canvas with snap-to-grid"
        />

        {/* HUD overlay */}
        <div
          ref={overlayRef}
          className="absolute top-3 left-3 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 pointer-events-none min-w-[160px]"
        />

        {/* Snap reference */}
        <div className="absolute bottom-3 left-3 text-xs text-gray-400 pointer-events-none space-y-0.5">
          <div>
            <span className="text-indigo-500 font-mono">+</span> Crosshair = within snap threshold
          </div>
          <div>
            Toggle snap to compare freehand vs. assisted drawing
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-56 border-l bg-card p-4 flex flex-col gap-5 shrink-0 overflow-y-auto">
        {/* Snap toggle */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Snap to Grid
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => setSnapEnabled(true)}
              className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${
                snapEnabled
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              On
            </button>
            <button
              onClick={() => setSnapEnabled(false)}
              className={`flex-1 py-2 text-xs rounded transition-colors font-medium ${
                !snapEnabled
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Off
            </button>
          </div>
        </div>

        {/* Grid size */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Grid Size
          </h2>
          <div className="flex gap-1">
            {GRID_SIZES.map((gs) => (
              <button
                key={gs}
                onClick={() => setGridSize(gs)}
                className={`flex-1 py-1 text-xs rounded transition-colors ${
                  gridSize === gs
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {gs}
              </button>
            ))}
          </div>
        </div>

        {/* Snap threshold */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Threshold
          </h2>
          <input
            type="range"
            min="5"
            max="30"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-muted-foreground mt-1">{threshold}px</div>
        </div>

        {/* Stroke width */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Width
          </h2>
          <div className="flex gap-1">
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
            Magnetic snap-to-grid during freehand drawing feels assistive
            rather than restrictive — improving precision without breaking
            creative flow.
          </p>
          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            <strong className="block mb-1">Pass criteria</strong>
            Snap feels like help, not constraint. Snapped-point percentage
            stays above 40% at default settings. No perceptible input lag.
          </div>
        </div>
      </div>
    </div>
  )
}
