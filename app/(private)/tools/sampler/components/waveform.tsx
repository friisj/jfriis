'use client';

import { useRef, useEffect, useCallback } from 'react';

interface WaveformProps {
  buffer: AudioBuffer | null;
  trimStart?: number; // 0-1 normalized
  trimEnd?: number;   // 0-1 normalized
  onTrimChange?: (start: number, end: number) => void;
  editable?: boolean;
}

const HANDLE_WIDTH = 6;
const MIN_TRIM_FRACTION = 0.02; // minimum 2% of buffer

export function Waveform({
  buffer,
  trimStart = 0,
  trimEnd = 1,
  onTrimChange,
  editable = true,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<'start' | 'end' | null>(null);
  const trimRef = useRef({ start: trimStart, end: trimEnd });

  // Keep ref in sync with props
  trimRef.current = { start: trimStart, end: trimEnd };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    if (!buffer) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No audio', w / 2, h / 2 + 4);
      return;
    }

    const data = buffer.getChannelData(0);
    const samples = data.length;
    const samplesPerPx = samples / w;

    const { start, end } = trimRef.current;
    const startPx = start * w;
    const endPx = end * w;

    // Draw waveform
    const midY = h / 2;
    for (let px = 0; px < w; px++) {
      const sampleStart = Math.floor(px * samplesPerPx);
      const sampleEnd = Math.floor((px + 1) * samplesPerPx);

      let min = 0;
      let max = 0;
      for (let i = sampleStart; i < sampleEnd && i < samples; i++) {
        if (data[i] < min) min = data[i];
        if (data[i] > max) max = data[i];
      }

      const inTrim = px >= startPx && px <= endPx;
      ctx.fillStyle = inTrim
        ? 'rgba(99, 102, 241, 0.85)'
        : 'rgba(99, 102, 241, 0.2)';

      const top = midY + min * midY;
      const bottom = midY + max * midY;
      ctx.fillRect(px, top, 1, Math.max(1, bottom - top));
    }

    // Draw trim handles if editable
    if (editable && onTrimChange) {
      // Dimmed overlay outside trim
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      if (startPx > 0) ctx.fillRect(0, 0, startPx, h);
      if (endPx < w) ctx.fillRect(endPx, 0, w - endPx, h);

      // Handle bars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(startPx - HANDLE_WIDTH / 2, 0, HANDLE_WIDTH, h);
      ctx.fillRect(endPx - HANDLE_WIDTH / 2, 0, HANDLE_WIDTH, h);

      // Small grabber indicators
      const handleY = h / 2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      for (const hx of [startPx, endPx]) {
        ctx.fillRect(hx - 1, handleY - 6, 2, 12);
      }
    }
  }, [buffer, editable, onTrimChange]);

  // Redraw on buffer or trim changes
  useEffect(() => {
    draw();
  }, [draw, trimStart, trimEnd]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  const getPosition = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!editable || !onTrimChange) return;

      const pos = getPosition(e);
      const { start, end } = trimRef.current;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const handleZone = HANDLE_WIDTH * 2 / rect.width;

      // Determine which handle is being grabbed
      if (Math.abs(pos - start) < handleZone) {
        dragRef.current = 'start';
      } else if (Math.abs(pos - end) < handleZone) {
        dragRef.current = 'end';
      } else {
        return;
      }

      canvas.setPointerCapture(e.pointerId);
    },
    [editable, onTrimChange, getPosition]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;

      const pos = getPosition(e);
      const { start, end } = trimRef.current;

      if (dragRef.current === 'start') {
        const newStart = Math.min(pos, end - MIN_TRIM_FRACTION);
        trimRef.current.start = Math.max(0, newStart);
      } else {
        const newEnd = Math.max(pos, start + MIN_TRIM_FRACTION);
        trimRef.current.end = Math.min(1, newEnd);
      }

      draw();
    },
    [getPosition, draw]
  );

  const handlePointerUp = useCallback(() => {
    if (!dragRef.current || !onTrimChange) return;
    dragRef.current = null;

    const { start, end } = trimRef.current;
    onTrimChange(start, end);
  }, [onTrimChange]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-20 rounded border border-border bg-muted/30 cursor-default"
      style={{ cursor: editable && onTrimChange ? 'col-resize' : 'default' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
