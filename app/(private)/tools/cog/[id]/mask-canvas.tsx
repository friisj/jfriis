'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface MaskCanvasProps {
  /** URL of the source image to overlay the mask on */
  imageUrl: string;
  /** Width of the source image */
  imageWidth: number;
  /** Height of the source image */
  imageHeight: number;
  /** Callback when mask changes (returns base64 PNG) */
  onMaskChange?: (maskBase64: string | null) => void;
  /** Optional initial mask (base64 PNG) */
  initialMask?: string;
}

type Tool = 'brush' | 'eraser';

/**
 * Canvas component for drawing inpainting masks.
 * - Brush tool paints white (areas to inpaint)
 * - Eraser tool paints black (areas to preserve)
 * - Supports mouse, touch, and stylus input
 * - Exports mask as PNG (white = edit, black = preserve)
 */
export function MaskCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  onMaskChange,
  initialMask,
}: MaskCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [ctxReady, setCtxReady] = useState(false);

  const [tool, setTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(30);
  const [maskOpacity, setMaskOpacity] = useState(0.5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMask, setHasMask] = useState(false);

  // Track last point for smooth line drawing
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Canvas scaling for display
  const [displayScale, setDisplayScale] = useState(1);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = imageWidth;
    canvas.height = imageHeight;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;

    // Store in ref (not state, to avoid React Compiler issues with mutable objects)
    ctxRef.current = context;

    // Fill with black (preserve everything by default)
    context.fillStyle = '#000000';
    context.fillRect(0, 0, imageWidth, imageHeight);

    // Load initial mask if provided
    if (initialMask) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0);
        setHasMask(true);
      };
      img.src = `data:image/png;base64,${initialMask}`;
    }

    setCtxReady(true);
  }, [imageWidth, imageHeight, initialMask]);

  // Calculate display scale when container size changes
  useEffect(() => {
    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const scaleX = containerWidth / imageWidth;
      const scaleY = containerHeight / imageHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Don't scale up

      setDisplayScale(scale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [imageWidth, imageHeight]);

  // Convert screen coordinates to canvas coordinates
  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / displayScale;
      const y = (clientY - rect.top) / displayScale;

      return { x, y };
    },
    [displayScale]
  );

  // Draw a stroke from lastPoint to current point
  const drawStroke = useCallback(
    (x: number, y: number) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.strokeStyle = tool === 'brush' ? '#ffffff' : '#000000';
      ctx.fillStyle = tool === 'brush' ? '#ffffff' : '#000000';
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (lastPointRef.current) {
        // Draw line from last point to current point
        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        // Draw a single dot
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      lastPointRef.current = { x, y };
      setHasMask(true);
    },
    [tool, brushSize]
  );

  // Export mask as base64 PNG
  const exportMask = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    return base64;
  }, []);

  // Notify parent of mask changes
  useEffect(() => {
    if (!onMaskChange) return;

    if (hasMask) {
      onMaskChange(exportMask());
    } else {
      onMaskChange(null);
    }
  }, [hasMask, onMaskChange, exportMask]);

  // Mouse/touch event handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Capture pointer for smooth tracking
      canvas.setPointerCapture(e.pointerId);

      setIsDrawing(true);
      lastPointRef.current = null;

      const point = getCanvasPoint(e.clientX, e.clientY);
      if (point) {
        drawStroke(point.x, point.y);
      }
    },
    [getCanvasPoint, drawStroke]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) return;

      const point = getCanvasPoint(e.clientX, e.clientY);
      if (point) {
        drawStroke(point.x, point.y);
      }
    },
    [isDrawing, getCanvasPoint, drawStroke]
  );

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;

    // Export mask after stroke completes
    if (onMaskChange && hasMask) {
      onMaskChange(exportMask());
    }
  }, [onMaskChange, hasMask, exportMask]);

  // Clear mask
  const handleClear = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, imageWidth, imageHeight);
    setHasMask(false);

    if (onMaskChange) {
      onMaskChange(null);
    }
  }, [imageWidth, imageHeight, onMaskChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'b':
          setTool('brush');
          break;
        case 'x':
        case 'e':
          setTool('eraser');
          break;
        case '[':
          setBrushSize((s) => Math.max(5, s - 5));
          break;
        case ']':
          setBrushSize((s) => Math.min(200, s + 5));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const displayWidth = imageWidth * displayScale;
  const displayHeight = imageHeight * displayScale;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Tool selection */}
        <div className="flex gap-1 bg-white/10 rounded-lg p-1">
          <Button
            variant={tool === 'brush' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTool('brush')}
            className="gap-1.5"
            title="Brush (B)"
          >
            <BrushIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Brush</span>
          </Button>
          <Button
            variant={tool === 'eraser' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTool('eraser')}
            className="gap-1.5"
            title="Eraser (E/X)"
          >
            <EraserIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Eraser</span>
          </Button>
        </div>

        {/* Brush size */}
        <div className="flex items-center gap-2 min-w-[150px]">
          <span className="text-xs text-white/60 whitespace-nowrap">Size</span>
          <Slider
            value={[brushSize]}
            onValueChange={([v]) => setBrushSize(v)}
            min={5}
            max={200}
            step={1}
            className="flex-1"
          />
          <span className="text-xs text-white/60 w-8">{brushSize}</span>
        </div>

        {/* Mask opacity */}
        <div className="flex items-center gap-2 min-w-[150px]">
          <span className="text-xs text-white/60 whitespace-nowrap">Opacity</span>
          <Slider
            value={[maskOpacity * 100]}
            onValueChange={([v]) => setMaskOpacity(v / 100)}
            min={10}
            max={90}
            step={5}
            className="flex-1"
          />
        </div>

        {/* Clear button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={!hasMask}
          className="text-white/70 hover:text-white"
        >
          Clear
        </Button>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="relative w-full flex items-center justify-center bg-black/50 rounded-lg overflow-hidden"
        style={{ minHeight: Math.min(400, imageHeight * displayScale) }}
      >
        {/* Source image as background */}
        <img
          src={imageUrl}
          alt="Source"
          className="absolute pointer-events-none select-none"
          style={{
            width: displayWidth,
            height: displayHeight,
          }}
          draggable={false}
        />

        {/* Mask canvas overlay */}
        <canvas
          ref={canvasRef}
          className="relative touch-none"
          style={{
            width: displayWidth,
            height: displayHeight,
            opacity: maskOpacity,
            cursor: getCursor(tool, brushSize * displayScale),
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      {/* Help text */}
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>
          <kbd className="px-1 py-0.5 bg-white/10 rounded">B</kbd> brush,{' '}
          <kbd className="px-1 py-0.5 bg-white/10 rounded">E</kbd> eraser,{' '}
          <kbd className="px-1 py-0.5 bg-white/10 rounded">[</kbd>
          <kbd className="px-1 py-0.5 bg-white/10 rounded">]</kbd> size
        </span>
        <span className={hasMask ? 'text-green-400' : ''}>
          {hasMask ? 'Mask ready' : 'Draw on the image'}
        </span>
      </div>
    </div>
  );
}

/** Get cursor style for the current tool */
function getCursor(tool: Tool, displaySize: number): string {
  // Use a circle cursor that matches the brush size
  const size = Math.max(4, Math.min(128, displaySize));
  const half = size / 2;
  const color = tool === 'brush' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)';
  const borderColor = tool === 'brush' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';

  // Create an SVG circle cursor
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${half}" cy="${half}" r="${half - 1}" fill="none" stroke="${borderColor}" stroke-width="2"/>
      <circle cx="${half}" cy="${half}" r="${half - 2}" fill="none" stroke="${color}" stroke-width="1"/>
    </svg>
  `;

  const encoded = encodeURIComponent(svg.trim());
  return `url("data:image/svg+xml,${encoded}") ${half} ${half}, crosshair`;
}

function BrushIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z" />
      <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" />
      <path d="M14.5 17.5 4.5 15" />
    </svg>
  );
}

function EraserIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  );
}

/**
 * Export helper to get mask dimensions matching the source image
 */
export function getMaskAsPng(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL('image/png');
  return dataUrl.replace(/^data:image\/png;base64,/, '');
}
