'use client'

import { useState, useRef, useCallback, type ReactNode, type PointerEvent } from 'react'

let topZIndex = 20

type Anchor = 'bottom-left' | 'bottom-right' | 'bottom-center'

interface FloatingPaletteProps {
  id: string
  title: string
  children: ReactNode
  anchor?: Anchor
  className?: string
}

export function FloatingPalette({
  id,
  title,
  children,
  anchor = 'bottom-left',
  className,
}: FloatingPaletteProps) {
  const paletteRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [zIndex, setZIndex] = useState(20)

  // Drag state
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const offsetAtDragStart = useRef({ x: 0, y: 0 })
  const rectAtDragStart = useRef<DOMRect | null>(null)

  const bringToFront = useCallback(() => {
    topZIndex += 1
    setZIndex(topZIndex)
  }, [])

  const onPointerDown = useCallback((e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    offsetAtDragStart.current = { ...offset }
    if (paletteRef.current) {
      rectAtDragStart.current = paletteRef.current.getBoundingClientRect()
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    bringToFront()
  }, [offset, bringToFront])

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return
    e.preventDefault()

    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    let newX = offsetAtDragStart.current.x + dx
    let newY = offsetAtDragStart.current.y + dy

    // Viewport bounds clamping
    const r = rectAtDragStart.current
    if (r) {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const pad = 60

      const pLeft = r.left + dx
      const pTop = r.top + dy
      const pRight = r.right + dx

      // Keep at least `pad` px visible horizontally
      if (pRight < pad) newX += pad - pRight
      else if (pLeft > vw - pad) newX -= pLeft - (vw - pad)

      // Keep header within viewport vertically
      if (pTop < 0) newY -= pTop
      else if (pTop > vh - 40) newY -= pTop - (vh - 40)
    }

    setOffset({ x: newX, y: newY })
  }, [])

  const onPointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const style: React.CSSProperties = {
    position: 'absolute',
    bottom: 32,
    zIndex,
    ...(anchor === 'bottom-left' && { left: 32 }),
    ...(anchor === 'bottom-right' && { right: 32 }),
    ...(anchor === 'bottom-center' && { left: '50%' }),
    transform: [
      anchor === 'bottom-center' ? 'translateX(-50%)' : '',
      `translate(${offset.x}px, ${offset.y}px)`,
    ].filter(Boolean).join(' '),
  }

  return (
    <div
      ref={paletteRef}
      style={style}
      className={`bg-black/90 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl ${className ?? ''}`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing select-none border-b border-white/5"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="flex items-center gap-2">
          <svg className="w-3 h-3 text-white/30" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="4" cy="3" r="1.5" />
            <circle cx="12" cy="3" r="1.5" />
            <circle cx="4" cy="8" r="1.5" />
            <circle cx="12" cy="8" r="1.5" />
            <circle cx="4" cy="13" r="1.5" />
            <circle cx="12" cy="13" r="1.5" />
          </svg>
          <span className="text-xs font-medium text-white/60">{title}</span>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            setCollapsed((c) => !c)
          }}
          className="text-white/40 hover:text-white/70 transition-colors p-0.5 rounded"
          aria-label={collapsed ? 'Expand palette' : 'Collapse palette'}
        >
          <svg
            className="w-3 h-3"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {collapsed ? (
              <path d="M3 6h6M6 3v6" />
            ) : (
              <path d="M3 6h6" />
            )}
          </svg>
        </button>
      </div>

      {/* Content */}
      {!collapsed && <div className="p-4">{children}</div>}
    </div>
  )
}
