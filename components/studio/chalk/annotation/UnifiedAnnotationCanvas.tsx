// @ts-nocheck
"use client";

import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";

export type AnnotationType = "rectangle" | "freehand" | "text";

export interface Annotation {
  id: string;
  type: AnnotationType;
  timestamp: number;

  // Visual data
  bounds?: { x: number; y: number; width: number; height: number };
  points?: { x: number; y: number }[];
  color?: string;
  width?: number;

  // Text data (for text annotations)
  text?: string;
  position?: { x: number; y: number };

  // Voice data (optional)
  voice?: {
    audioUrl: string; // Object URL instead of blob to prevent memory leaks
    transcription: string;
    status: "recording" | "transcribing" | "ready" | "error";
    timestamp: number;
    error?: string;
  };
}

interface UnifiedAnnotationCanvasProps {
  children: React.ReactNode;
  onCapture?: (screenshot: string, annotations: Annotation[]) => void;
  initialAnnotations?: Annotation[];
  showAnnotations?: boolean;
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  tool?: AnnotationType | null;
  voiceEnabled?: boolean;
  onClearAll?: () => void;
  onSelectionChange?: (annotationId: string | null) => void;
  color?: string;
}

export const UnifiedAnnotationCanvas = forwardRef<{ triggerCapture: () => void; deleteSelected: () => void }, UnifiedAnnotationCanvasProps>(function UnifiedAnnotationCanvas({
  children,
  onCapture,
  initialAnnotations = [],
  showAnnotations = true,
  onAnnotationsChange,
  tool = null,
  voiceEnabled = false,
  onClearAll,
  onSelectionChange,
  color: colorProp,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Drawing state
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBounds, setCurrentBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);

  // Text annotation state
  const [isEditingText, setIsEditingText] = useState(false);
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState("");

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Selection state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Drawing style
  const drawingColor = colorProp ?? "#FF0000";
  const [lineWidth] = useState(3);

  // Simplify freehand points using Douglas-Peucker algorithm
  const simplifyPoints = (points: { x: number; y: number }[], tolerance = 2): { x: number; y: number }[] => {
    if (points.length <= 2) return points;

    const sqTolerance = tolerance * tolerance;

    // Find the point with maximum distance from line segment
    const simplifyDouglasPeucker = (points: { x: number; y: number }[], first: number, last: number, sqTolerance: number, simplified: { x: number; y: number }[]): void => {
      let maxSqDist = sqTolerance;
      let index = 0;

      const firstPoint = points[first];
      const lastPoint = points[last];

      for (let i = first + 1; i < last; i++) {
        const sqDist = getSqSegDist(points[i], firstPoint, lastPoint);
        if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
        }
      }

      if (maxSqDist > sqTolerance) {
        if (index - first > 1) simplifyDouglasPeucker(points, first, index, sqTolerance, simplified);
        simplified.push(points[index]);
        if (last - index > 1) simplifyDouglasPeucker(points, index, last, sqTolerance, simplified);
      }
    };

    // Square distance from point to segment
    const getSqSegDist = (p: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
      let x = p1.x;
      let y = p1.y;
      let dx = p2.x - x;
      let dy = p2.y - y;

      if (dx !== 0 || dy !== 0) {
        const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
          x = p2.x;
          y = p2.y;
        } else if (t > 0) {
          x += dx * t;
          y += dy * t;
        }
      }

      dx = p.x - x;
      dy = p.y - y;

      return dx * dx + dy * dy;
    };

    const last = points.length - 1;
    const simplified: { x: number; y: number }[] = [points[0]];
    simplifyDouglasPeucker(points, 0, last, sqTolerance, simplified);
    simplified.push(points[last]);

    return simplified;
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Start recording immediately
      setIsRecording(true);
      mediaRecorder.start(100); // Capture every 100ms

      console.log("[Voice] Recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        console.log("[Voice] No active recording to stop");
        resolve(new Blob());
        return;
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        console.log(`[Voice] Recording stopped, blob size: ${audioBlob.size} bytes`);
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        resolve(audioBlob);
      };

      // Add small delay to ensure we capture the last audio chunk
      setTimeout(() => {
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      }, 150);
    });
  };

  const transcribeAudio = async (audioBlob: Blob, annotationId: string) => {
    console.log(`[Voice] Starting transcription for ${annotationId}, blob size: ${audioBlob.size} bytes`);

    // Check if audio blob is too small
    if (audioBlob.size < 1000) {
      console.warn(`[Voice] Audio blob too small (${audioBlob.size} bytes), skipping transcription`);
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === annotationId && a.voice
            ? {
                ...a,
                voice: {
                  ...a.voice,
                  status: "ready" as const,
                  transcription: "(Recording too short)",
                },
              }
            : a
        )
      );
      return;
    }

    try {
      const formData = new FormData();
      formData.append("audio", new File([audioBlob], "recording.webm", { type: "audio/webm" }));

      const response = await fetch("/apps/chalk/api/transcribe-audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription API returned ${response.status}`);
      }

      const data = await response.json();
      console.log(`[Voice] Transcription result for ${annotationId}:`, data.transcript || "No speech detected");

      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === annotationId && a.voice
            ? {
                ...a,
                voice: {
                  ...a.voice,
                  status: "ready" as const,
                  transcription: data.transcript || "(No speech detected)",
                },
              }
            : a
        )
      );
    } catch (error) {
      console.error(`[Voice] Transcription error for ${annotationId}:`, error);
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === annotationId && a.voice
            ? {
                ...a,
                voice: {
                  ...a.voice,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "Transcription failed",
                },
              }
            : a
        )
      );
    }
  };

  // Check if click is on an existing annotation
  const getAnnotationAtPoint = (x: number, y: number): Annotation | null => {
    // Check in reverse order (most recent first)
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i];

      if (annotation.type === "rectangle" && annotation.bounds) {
        const { bounds } = annotation;
        if (
          x >= bounds.x &&
          x <= bounds.x + bounds.width &&
          y >= bounds.y &&
          y <= bounds.y + bounds.height
        ) {
          return annotation;
        }
      } else if (annotation.type === "text" && annotation.position && annotation.text) {
        const textWidth = annotation.text.length * 8;
        const textHeight = 20;
        if (
          x >= annotation.position.x &&
          x <= annotation.position.x + textWidth &&
          y >= annotation.position.y - textHeight &&
          y <= annotation.position.y
        ) {
          return annotation;
        }
      } else if (annotation.type === "freehand" && annotation.points && annotation.points.length > 0) {
        // Simple bounding box check for freehand
        const xs = annotation.points.map(p => p.x);
        const ys = annotation.points.map(p => p.y);
        const minX = Math.min(...xs) - 5;
        const maxX = Math.max(...xs) + 5;
        const minY = Math.min(...ys) - 5;
        const maxY = Math.max(...ys) + 5;
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          return annotation;
        }
      }
    }
    return null;
  };

  // Drawing handlers
  const handlePointerDown = async (e: React.PointerEvent) => {
    console.log("[Canvas] Pointer down, tool:", tool, "isEditingText:", isEditingText);

    // Don't handle pointer down if editing text
    if (isEditingText) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // Check if clicking on an existing annotation to select it
    const clickedAnnotation = getAnnotationAtPoint(point.x, point.y);
    if (clickedAnnotation) {
      console.log("[Canvas] Selected annotation:", clickedAnnotation.id);
      setSelectedId(clickedAnnotation.id);
      if (onSelectionChange) {
        onSelectionChange(clickedAnnotation.id);
      }
      return;
    }

    // Clear selection if clicking on empty space
    if (selectedId) {
      setSelectedId(null);
      if (onSelectionChange) {
        onSelectionChange(null);
      }
    }

    // If no tool is selected, don't create annotations (view/select mode only)
    if (tool === null) {
      return;
    }

    // Handle text tool - click to place text
    if (tool === "text") {
      console.log("[Canvas] Text tool clicked at:", point);
      setTextPosition(point);
      setIsEditingText(true);
      console.log("[Canvas] Set textPosition and isEditingText to true");
      return;
    }

    setIsDrawing(true);
    setStartPoint(point);

    if (tool === "freehand") {
      setCurrentPoints([point]);
    }

    // Start voice recording if enabled (not for text)
    if (voiceEnabled && tool !== "text") {
      await startRecording();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !startPoint || tool === "text") return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (tool === "rectangle") {
      const x = Math.min(startPoint.x, point.x);
      const y = Math.min(startPoint.y, point.y);
      const width = Math.abs(point.x - startPoint.x);
      const height = Math.abs(point.y - startPoint.y);
      setCurrentBounds({ x, y, width, height });
    } else {
      setCurrentPoints((prev) => [...prev, point]);
    }
  };

  const handlePointerUp = async () => {
    if (!isDrawing || tool === "text") return;
    setIsDrawing(false);

    const annotationId = `A${annotations.length + 1}`;
    const timestamp = Date.now();

    // Stop voice recording if active
    let audioBlob: Blob | null = null;
    if (voiceEnabled && isRecording) {
      audioBlob = await stopRecording();
    }

    // Create annotation based on tool type
    const newAnnotation: Annotation = {
      id: annotationId,
      type: tool,
      timestamp,
    };

    if (tool === "rectangle" && currentBounds) {
      newAnnotation.bounds = currentBounds;
    } else if (tool === "freehand" && currentPoints.length > 0) {
      // Simplify freehand points to reduce memory and improve performance
      const simplifiedPoints = simplifyPoints(currentPoints, 2);
      console.log(`[Canvas] Freehand simplified: ${currentPoints.length} → ${simplifiedPoints.length} points (${Math.round((1 - simplifiedPoints.length / currentPoints.length) * 100)}% reduction)`);
      newAnnotation.points = simplifiedPoints;
      newAnnotation.color = drawingColor;
      newAnnotation.width = lineWidth;
    }

    // Add voice data if recorded (convert to object URL to save memory)
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      newAnnotation.voice = {
        audioUrl,
        transcription: "",
        status: "transcribing",
        timestamp,
      };
    }

    setAnnotations([...annotations, newAnnotation]);

    // Reset drawing state
    setCurrentBounds(null);
    setCurrentPoints([]);
    setStartPoint(null);

    // Transcribe audio if we have it
    if (audioBlob) {
      await transcribeAudio(audioBlob, annotationId);
    }
  };

  const handleTextSubmit = () => {
    console.log("[Canvas] handleTextSubmit, textInput:", textInput);
    if (!textInput.trim()) {
      // Empty input - just cancel
      console.log("[Canvas] Empty input, canceling");
      setIsEditingText(false);
      setTextInput("");
      setTextPosition(null);
      return;
    }

    if (!textPosition) {
      console.log("[Canvas] No text position, canceling");
      setIsEditingText(false);
      setTextInput("");
      return;
    }

    const annotationId = `A${annotations.length + 1}`;
    const newAnnotation: Annotation = {
      id: annotationId,
      type: "text",
      timestamp: Date.now(),
      text: textInput,
      position: textPosition,
    };

    console.log("[Canvas] Creating text annotation:", newAnnotation);
    setAnnotations([...annotations, newAnnotation]);
    setIsEditingText(false);
    setTextInput("");
    setTextPosition(null);
  };

  const handleTextCancel = () => {
    console.log("[Canvas] Text input canceled");
    setIsEditingText(false);
    setTextInput("");
    setTextPosition(null);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleTextCancel();
    }
  };

  const playAudio = (annotation: Annotation) => {
    if (!annotation.voice?.audioUrl) return;
    const audio = new Audio(annotation.voice.audioUrl);
    audio.play();
  };

  // Detect hovered annotation
  const handleCanvasHover = (e: React.MouseEvent) => {
    if (isDrawing || isEditingText) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if hovering over any annotation
    for (const annotation of annotations) {
      if (annotation.type === "rectangle" && annotation.bounds) {
        const { bounds } = annotation;
        if (
          x >= bounds.x &&
          x <= bounds.x + bounds.width &&
          y >= bounds.y &&
          y <= bounds.y + bounds.height
        ) {
          setHoveredId(annotation.id);
          return;
        }
      } else if (annotation.type === "text" && annotation.position && annotation.text) {
        // Simple hover detection for text (approximate bounding box)
        const textWidth = annotation.text.length * 8; // Approximate
        const textHeight = 20;
        if (
          x >= annotation.position.x &&
          x <= annotation.position.x + textWidth &&
          y >= annotation.position.y - textHeight &&
          y <= annotation.position.y
        ) {
          setHoveredId(annotation.id);
          return;
        }
      }
    }
    setHoveredId(null);
  };

  const handleCapture = async () => {
    const container = containerRef.current;
    if (!container || !onCapture) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const contentCanvas = await html2canvas(container, {
        backgroundColor: "#f9fafb",
        scale: 2,
      });

      const combinedCanvas = document.createElement("canvas");
      combinedCanvas.width = contentCanvas.width;
      combinedCanvas.height = contentCanvas.height;

      const ctx = combinedCanvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(contentCanvas, 0, 0);

      const scale = contentCanvas.width / (canvasRef.current?.width || 1);
      ctx.save();
      ctx.scale(scale, scale);

      // Draw all annotations
      annotations.forEach((annotation) => {
        if (annotation.type === "rectangle" && annotation.bounds) {
          ctx.strokeStyle = "#DC2626";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(
            annotation.bounds.x,
            annotation.bounds.y,
            annotation.bounds.width,
            annotation.bounds.height
          );
          ctx.fillStyle = "#DC2626";
          ctx.font = "bold 14px monospace";
          ctx.fillText(annotation.id, annotation.bounds.x + 4, annotation.bounds.y - 4);
          ctx.setLineDash([]);
        } else if (annotation.type === "freehand" && annotation.points && annotation.points.length > 1) {
          ctx.strokeStyle = annotation.color || "#FF0000";
          ctx.lineWidth = annotation.width || 3;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
          for (let i = 1; i < annotation.points.length; i++) {
            ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
          }
          ctx.stroke();
        } else if (annotation.type === "text" && annotation.position && annotation.text) {
          ctx.fillStyle = "#DC2626";
          ctx.font = "bold 16px monospace";
          ctx.fillText(annotation.text, annotation.position.x, annotation.position.y);
          // Draw annotation ID above text
          ctx.font = "bold 12px monospace";
          ctx.fillText(annotation.id, annotation.position.x, annotation.position.y - 20);
        }
      });

      ctx.restore();

      const dataUrl = combinedCanvas.toDataURL("image/png");
      onCapture(dataUrl, annotations);
    } catch (error) {
      console.error("Screenshot capture failed:", error);
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;

    console.log("[Canvas] Deleting annotation:", selectedId);

    // Revoke object URL for deleted annotation with voice
    const deletedAnnotation = annotations.find(a => a.id === selectedId);
    if (deletedAnnotation?.voice?.audioUrl) {
      URL.revokeObjectURL(deletedAnnotation.voice.audioUrl);
      console.log("[Canvas] Revoked audio URL for:", selectedId);
    }

    const newAnnotations = annotations.filter(a => a.id !== selectedId);
    setAnnotations(newAnnotations);
    setSelectedId(null);
    if (onSelectionChange) {
      onSelectionChange(null);
    }
  };

  // Expose capture trigger and delete to parent
  useImperativeHandle(ref, () => ({
    triggerCapture: handleCapture,
    deleteSelected: handleDeleteSelected,
  }), [handleCapture, handleDeleteSelected]);

  // Notify parent when annotations change
  useEffect(() => {
    if (onAnnotationsChange) {
      onAnnotationsChange(annotations);
    }
  }, [annotations, onAnnotationsChange]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      // Revoke all object URLs when component unmounts
      annotations.forEach((annotation) => {
        if (annotation.voice?.audioUrl) {
          URL.revokeObjectURL(annotation.voice.audioUrl);
        }
      });
      console.log("[Canvas] Revoked all audio URLs on unmount");
    };
  }, [annotations]);

  // Resize canvas
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Only draw annotations if showAnnotations is true
    if (showAnnotations) {
      // Draw all completed annotations
      annotations.forEach((annotation) => {
        const isSelected = annotation.id === selectedId;

        if (annotation.type === "rectangle" && annotation.bounds) {
          ctx.strokeStyle = isSelected ? "#EF4444" : "#DC2626";
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(
            annotation.bounds.x,
            annotation.bounds.y,
            annotation.bounds.width,
            annotation.bounds.height
          );
          ctx.fillStyle = isSelected ? "#EF4444" : "#DC2626";
          ctx.font = "bold 14px monospace";
          ctx.fillText(annotation.id, annotation.bounds.x + 4, annotation.bounds.y - 4);
          ctx.setLineDash([]);
        } else if (annotation.type === "freehand" && annotation.points && annotation.points.length > 1) {
          ctx.strokeStyle = annotation.color || "#FF0000";
          ctx.lineWidth = annotation.width || 3;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.globalAlpha = isSelected ? 1 : 0.8;
          ctx.beginPath();
          ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
          for (let i = 1; i < annotation.points.length; i++) {
            ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (annotation.type === "text" && annotation.position && annotation.text) {
          ctx.fillStyle = isSelected ? "#EF4444" : "#DC2626";
          ctx.font = "bold 16px monospace";
          ctx.fillText(annotation.text, annotation.position.x, annotation.position.y);
          // Draw annotation ID above text
          ctx.font = "bold 12px monospace";
          ctx.fillText(annotation.id, annotation.position.x, annotation.position.y - 20);
        }
      });
    }

    // Draw current drawing in progress
    if (tool === "rectangle" && currentBounds) {
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(
        currentBounds.x,
        currentBounds.y,
        currentBounds.width,
        currentBounds.height
      );
    } else if (tool === "freehand" && currentPoints.length > 1) {
      ctx.strokeStyle = drawingColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
      }
      ctx.stroke();
    }
  }, [annotations, currentBounds, currentPoints, selectedId, tool, drawingColor, lineWidth, showAnnotations]);

  const hoveredAnnotation = annotations.find((a) => a.id === hoveredId);

  return (
    <div className="relative">

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-20 left-4 z-20 bg-red-500 text-white rounded-lg px-4 py-2 flex items-center gap-2 animate-pulse">
          <div className="w-3 h-3 bg-white rounded-full" />
          <span className="font-medium">Recording...</span>
        </div>
      )}

      {/* Tooltip for hovered annotation with transcription */}
      {showAnnotations && hoveredAnnotation && hoveredAnnotation.voice?.status === "ready" && hoveredAnnotation.voice.transcription && (
        <div
          className="absolute z-30 bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-lg max-w-xs pointer-events-none"
          style={{
            left: hoveredAnnotation.bounds ? `${hoveredAnnotation.bounds.x + hoveredAnnotation.bounds.width / 2}px` : '50%',
            top: hoveredAnnotation.bounds ? `${hoveredAnnotation.bounds.y - 10}px` : '50%',
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-mono font-semibold mb-1">{hoveredAnnotation.id}</div>
          <div className="italic">"{hoveredAnnotation.voice.transcription}"</div>
        </div>
      )}

      {/* Text input overlay */}
      {(() => {
        return isEditingText && textPosition && (
          <div
            className="absolute z-40 bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-1"
            style={{
              left: `${textPosition.x}px`,
              top: `${textPosition.y - 50}px`,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              autoFocus
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleTextKeyDown}
              placeholder="Type text (Enter to save, Esc to cancel)"
              className="px-3 py-2 text-sm border-0 focus:outline-none font-mono"
              style={{ minWidth: "300px" }}
            />
          </div>
        );
      })()}

      {/* Content */}
      <div ref={containerRef} className="relative">
        {children}

        {/* Canvas for annotations */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{
            pointerEvents: "auto",
            cursor: tool === "text" ? "text" : tool === null ? "default" : "crosshair"
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onMouseMove={handleCanvasHover}
        />
      </div>
    </div>
  );
});
