"use client";

import { useRef, useState, useEffect } from "react";

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface MarkupCanvasProps {
  children: React.ReactNode;
  onCapture?: (screenshot: string) => void;
  enabled?: boolean;
}

export function MarkupCanvas({
  children,
  onCapture,
  enabled = true,
}: MarkupCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [color, setColor] = useState("#FF0000");
  const [lineWidth, setLineWidth] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    [...strokes, ...(currentStroke ? [currentStroke] : [])].forEach(
      (stroke) => {
        if (stroke.points.length < 2) return;

        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }

        ctx.stroke();
      }
    );
  }, [strokes, currentStroke]);

  const getCanvasPoint = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!enabled) return;
    setIsDrawing(true);
    const point = getCanvasPoint(e);
    setCurrentStroke({
      points: [point],
      color,
      width: lineWidth,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !currentStroke || !enabled) return;
    const point = getCanvasPoint(e);
    setCurrentStroke({
      ...currentStroke,
      points: [...currentStroke.points, point],
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    setStrokes([...strokes, currentStroke]);
    setCurrentStroke(null);
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke(null);
  };

  const handleCapture = async () => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    try {
      // Dynamically import html2canvas
      const html2canvas = (await import("html2canvas")).default;

      // Capture the content div
      const contentCanvas = await html2canvas(container, {
        backgroundColor: "#f9fafb",
        scale: 2,
      });

      // Create a new canvas to combine content + markup
      const combinedCanvas = document.createElement("canvas");
      combinedCanvas.width = contentCanvas.width;
      combinedCanvas.height = contentCanvas.height;

      const ctx = combinedCanvas.getContext("2d");
      if (!ctx) return;

      // Draw content
      ctx.drawImage(contentCanvas, 0, 0);

      // Draw markup overlay (scaled up)
      const scale = contentCanvas.width / canvas.width;
      ctx.save();
      ctx.scale(scale, scale);

      [...strokes].forEach((stroke) => {
        if (stroke.points.length < 2) return;

        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }

        ctx.stroke();
      });

      ctx.restore();

      // Convert to base64
      const dataUrl = combinedCanvas.toDataURL("image/png");
      onCapture?.(dataUrl);
    } catch (error) {
      console.error("Screenshot capture failed:", error);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  return (
    <div className="relative">
      {/* Controls */}
      {enabled && (
        <div className="absolute top-4 right-4 z-20 bg-white rounded-lg shadow-lg p-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setColor("#FF0000")}
              className={`w-8 h-8 rounded border-2 ${color === "#FF0000" ? "border-black" : "border-gray-300"}`}
              style={{ backgroundColor: "#FF0000" }}
              title="Red"
            />
            <button
              onClick={() => setColor("#000000")}
              className={`w-8 h-8 rounded border-2 ${color === "#000000" ? "border-black" : "border-gray-300"}`}
              style={{ backgroundColor: "#000000" }}
              title="Black"
            />
            <button
              onClick={() => setColor("#0000FF")}
              className={`w-8 h-8 rounded border-2 ${color === "#0000FF" ? "border-black" : "border-gray-300"}`}
              style={{ backgroundColor: "#0000FF" }}
              title="Blue"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setLineWidth(2)}
              className={`px-2 py-1 text-xs rounded ${lineWidth === 2 ? "bg-blue-500 text-white" : "bg-gray-100"}`}
            >
              Thin
            </button>
            <button
              onClick={() => setLineWidth(4)}
              className={`px-2 py-1 text-xs rounded ${lineWidth === 4 ? "bg-blue-500 text-white" : "bg-gray-100"}`}
            >
              Thick
            </button>
          </div>

          <button
            onClick={handleClear}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Clear
          </button>

          <button
            onClick={handleCapture}
            className="px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded font-medium"
          >
            Send to AI
          </button>
        </div>
      )}

      {/* Content + Markup layers */}
      <div ref={containerRef} className="relative">
        {children}

        {/* Markup canvas overlay */}
        {enabled && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-auto cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        )}
      </div>
    </div>
  );
}
