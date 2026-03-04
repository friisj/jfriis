'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

interface WaveformProps {
  buffer: AudioBuffer | null;
  trimStart?: number; // 0-1 normalized
  trimEnd?: number;   // 0-1 normalized
  onTrimChange?: (start: number, end: number) => void;
  editable?: boolean;
  getPlaybackPosition?: () => number | null;
}

const HANDLE_WIDTH = 1;
const MIN_TRIM_FRACTION = 0.002; // minimum 0.2% of buffer (~10ms on a 5s clip)
const MIN_ZOOM = 1;
const MAX_ZOOM = 32;
const MINIMAP_HEIGHT = 10;

export function Waveform({
  buffer,
  trimStart = 0,
  trimEnd = 1,
  onTrimChange,
  editable = true,
  getPlaybackPosition,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<'start' | 'end' | null>(null);
  const panRef = useRef<{ active: boolean; startX: number; startOffset: number }>({
    active: false,
    startX: 0,
    startOffset: 0,
  });
  const trimRef = useRef({ start: trimStart, end: trimEnd });
  const playbackPosRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const [zoom, setZoom] = useState(1);
  const [viewOffset, setViewOffset] = useState(0);

  // Keep ref in sync with props
  trimRef.current = { start: trimStart, end: trimEnd };

  // Clamp viewOffset when zoom changes
  const clampOffset = useCallback(
    (offset: number, z: number) => Math.max(0, Math.min(offset, 1 - 1 / z)),
    []
  );

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
    const isZoomed = zoom > 1;
    const waveH = isZoomed ? h - MINIMAP_HEIGHT : h;

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

    const { start, end } = trimRef.current;

    // Viewport in buffer-space (0-1)
    const viewStart = viewOffset;
    const viewEnd = viewOffset + 1 / zoom;
    const viewRange = viewEnd - viewStart;

    // Samples per pixel for the zoomed view
    const samplesPerPx = (samples * viewRange) / w;

    // Draw main waveform (zoomed viewport)
    const midY = waveH / 2;
    for (let px = 0; px < w; px++) {
      // Map pixel to buffer position (0-1)
      const bufPos = viewStart + (px / w) * viewRange;
      const sampleStart = Math.floor(bufPos * samples);
      const sampleEnd = Math.floor(sampleStart + samplesPerPx);

      let min = 0;
      let max = 0;
      for (let i = sampleStart; i < sampleEnd && i < samples; i++) {
        if (data[i] < min) min = data[i];
        if (data[i] > max) max = data[i];
      }

      const inTrim = bufPos >= start && bufPos <= end;
      ctx.fillStyle = inTrim
        ? 'rgba(99, 102, 241, 0.85)'
        : 'rgba(99, 102, 241, 0.2)';

      const top = midY + min * midY;
      const bottom = midY + max * midY;
      ctx.fillRect(px, top, 1, Math.max(1, bottom - top));
    }

    // Draw trim handles if editable
    if (editable && onTrimChange) {
      // Convert trim positions from buffer-space to pixel-space
      const startPx = ((start - viewStart) / viewRange) * w;
      const endPx = ((end - viewStart) / viewRange) * w;

      // Dimmed overlay outside trim (clipped to canvas)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      const dimStart = Math.max(0, startPx);
      const dimEnd = Math.min(w, endPx);
      if (dimStart > 0) ctx.fillRect(0, 0, dimStart, waveH);
      if (dimEnd < w) ctx.fillRect(dimEnd, 0, w - dimEnd, waveH);

      // Handle bars (only draw if in viewport)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      if (startPx >= -HANDLE_WIDTH && startPx <= w + HANDLE_WIDTH) {
        ctx.fillRect(startPx - HANDLE_WIDTH / 2, 0, HANDLE_WIDTH, waveH);
      }
      if (endPx >= -HANDLE_WIDTH && endPx <= w + HANDLE_WIDTH) {
        ctx.fillRect(endPx - HANDLE_WIDTH / 2, 0, HANDLE_WIDTH, waveH);
      }
    }

    // Draw playhead
    if (playbackPosRef.current != null) {
      const headPx = ((playbackPosRef.current - viewStart) / viewRange) * w;
      if (headPx >= 0 && headPx <= w) {
        ctx.fillStyle = 'rgba(239, 68, 68, 1)';
        ctx.fillRect(Math.round(headPx), 0, 1, waveH);
      }
    }

    // Draw minimap when zoomed
    if (isZoomed) {
      const mmY = waveH;
      const mmH = MINIMAP_HEIGHT;

      // Background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, mmY, w, mmH);

      // Full waveform overview (simplified)
      const mmSamplesPerPx = samples / w;
      const mmMidY = mmY + mmH / 2;
      for (let px = 0; px < w; px++) {
        const sStart = Math.floor(px * mmSamplesPerPx);
        const sEnd = Math.floor((px + 1) * mmSamplesPerPx);

        let min = 0;
        let max = 0;
        for (let i = sStart; i < sEnd && i < samples; i++) {
          if (data[i] < min) min = data[i];
          if (data[i] > max) max = data[i];
        }

        const bufPos = px / w;
        const inTrim = bufPos >= start && bufPos <= end;
        ctx.fillStyle = inTrim
          ? 'rgba(99, 102, 241, 0.5)'
          : 'rgba(99, 102, 241, 0.15)';

        const top = mmMidY + min * (mmH / 2);
        const bottom = mmMidY + max * (mmH / 2);
        ctx.fillRect(px, top, 1, Math.max(1, bottom - top));
      }

      // Viewport rectangle
      const vpLeft = viewStart * w;
      const vpWidth = (1 / zoom) * w;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(vpLeft + 0.5, mmY + 0.5, vpWidth - 1, mmH - 1);
    }
  }, [buffer, editable, onTrimChange, zoom, viewOffset]);

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

  // Playhead animation loop
  useEffect(() => {
    if (!getPlaybackPosition) {
      // Clear any lingering playhead
      if (playbackPosRef.current != null) {
        playbackPosRef.current = null;
        draw();
      }
      return;
    }

    let running = true;
    function tick() {
      if (!running) return;
      const pos = getPlaybackPosition!();
      const prev = playbackPosRef.current;
      playbackPosRef.current = pos;

      // Redraw when position changes or transitions to/from null
      if (pos !== prev) draw();

      if (pos == null) {
        running = false;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      playbackPosRef.current = null;
    };
  }, [getPlaybackPosition, draw]);

  // Convert pixel position to buffer-space (0-1)
  const pxToBuffer = useCallback(
    (e: React.PointerEvent | React.WheelEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return 0;
      const rect = canvas.getBoundingClientRect();
      const pxFrac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      // Map from viewport fraction to buffer position
      const viewRange = 1 / zoom;
      return viewOffset + pxFrac * viewRange;
    },
    [zoom, viewOffset]
  );

  const getPixelFraction = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!editable || !onTrimChange) return;

      const bufPos = pxToBuffer(e);
      const { start, end } = trimRef.current;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      // Handle zone in buffer-space
      const handleZone = (12 / rect.width) * (1 / zoom);

      // Determine which handle is being grabbed
      if (Math.abs(bufPos - start) < handleZone) {
        dragRef.current = 'start';
        canvas.setPointerCapture(e.pointerId);
      } else if (Math.abs(bufPos - end) < handleZone) {
        dragRef.current = 'end';
        canvas.setPointerCapture(e.pointerId);
      } else if (zoom > 1) {
        // Pan mode when zoomed
        panRef.current = { active: true, startX: e.clientX, startOffset: viewOffset };
        canvas.setPointerCapture(e.pointerId);
      }
    },
    [editable, onTrimChange, pxToBuffer, zoom, viewOffset]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (panRef.current.active) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dx = e.clientX - panRef.current.startX;
        const bufDx = (dx / rect.width) * (1 / zoom);
        const newOffset = clampOffset(panRef.current.startOffset - bufDx, zoom);
        setViewOffset(newOffset);
        return;
      }

      if (!dragRef.current) return;

      const bufPos = pxToBuffer(e);
      const { start, end } = trimRef.current;

      if (dragRef.current === 'start') {
        const newStart = Math.min(bufPos, end - MIN_TRIM_FRACTION);
        trimRef.current.start = Math.max(0, newStart);
      } else {
        const newEnd = Math.max(bufPos, start + MIN_TRIM_FRACTION);
        trimRef.current.end = Math.min(1, newEnd);
      }

      draw();
    },
    [pxToBuffer, draw, zoom, clampOffset]
  );

  const handlePointerUp = useCallback(() => {
    if (panRef.current.active) {
      panRef.current.active = false;
      return;
    }

    if (!dragRef.current || !onTrimChange) return;
    dragRef.current = null;

    const { start, end } = trimRef.current;
    onTrimChange(start, end);
  }, [onTrimChange]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!buffer) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pxFrac = (e.clientX - rect.left) / rect.width;

      // Cursor position in buffer-space before zoom
      const cursorBuf = viewOffset + pxFrac * (1 / zoom);

      // Zoom factor
      const zoomDelta = e.deltaY < 0 ? 1.25 : 0.8;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomDelta));

      // Adjust offset so cursor stays in the same place
      const newOffset = clampOffset(cursorBuf - pxFrac * (1 / newZoom), newZoom);

      setZoom(newZoom);
      setViewOffset(newOffset);
    },
    [buffer, zoom, viewOffset, clampOffset]
  );

  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setViewOffset(0);
  }, []);

  // Determine cursor style
  const isZoomed = zoom > 1;
  const cursorStyle = (() => {
    if (panRef.current.active) return 'grabbing';
    if (isZoomed && !dragRef.current) return 'grab';
    if (editable && onTrimChange) return 'col-resize';
    return 'default';
  })();

  const handleZoomSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newZoom = parseFloat(e.target.value);
      // Keep viewport centered when zooming via slider
      const viewCenter = viewOffset + 0.5 / zoom;
      const newOffset = clampOffset(viewCenter - 0.5 / newZoom, newZoom);
      setZoom(newZoom);
      setViewOffset(newOffset);
    },
    [zoom, viewOffset, clampOffset]
  );

  return (
    <div className="flex flex-col gap-1">
      <canvas
        ref={canvasRef}
        className={`w-full rounded border ${isZoomed ? 'h-24' : 'h-20'}`}
        style={{ cursor: cursorStyle }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />
      {buffer && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-muted-foreground w-8 shrink-0">
            {zoom > 1 ? `${zoom.toFixed(0)}x` : '1x'}
          </span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.25}
            value={zoom}
            onChange={handleZoomSlider}
            className="w-full h-1 accent-indigo-500"
          />
        </div>
      )}
    </div>
  );
}
