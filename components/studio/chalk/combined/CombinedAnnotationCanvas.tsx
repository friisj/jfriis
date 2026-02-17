"use client";

import { useRef, useState, useImperativeHandle, forwardRef, useEffect } from "react";
import { Volume2, Loader2 } from "lucide-react";

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface VoiceAnnotation {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  audioBlob: Blob | null;
  transcription: string;
  timestamp: number;
  status: "recording" | "transcribing" | "ready" | "error";
  error?: string;
}

interface CombinedAnnotationCanvasProps {
  children: React.ReactNode;
  mode: "markup" | "voice";
  onCapture?: (screenshot: string, markupStrokes: Stroke[], voiceAnnotations: VoiceAnnotation[]) => void;
}

export interface CombinedAnnotationCanvasHandle {
  getMarkupStrokes: () => Stroke[];
  getVoiceAnnotations: () => VoiceAnnotation[];
  clearAll: () => void;
}

export const CombinedAnnotationCanvas = forwardRef<
  CombinedAnnotationCanvasHandle,
  CombinedAnnotationCanvasProps
>(({ children, mode, onCapture }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const markupCanvasRef = useRef<HTMLCanvasElement>(null);
  const voiceCanvasRef = useRef<HTMLCanvasElement>(null);

  // Markup state
  const [markupStrokes, setMarkupStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [isDrawingMarkup, setIsDrawingMarkup] = useState(false);
  const [color, setColor] = useState("#FF0000");
  const [lineWidth, setLineWidth] = useState(3);

  // Voice state
  const [voiceAnnotations, setVoiceAnnotations] = useState<VoiceAnnotation[]>([]);
  const [isDrawingVoice, setIsDrawingVoice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStartPoint, setVoiceStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentVoiceBounds, setCurrentVoiceBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getMarkupStrokes: () => markupStrokes,
    getVoiceAnnotations: () => voiceAnnotations,
    clearAll: () => {
      setMarkupStrokes([]);
      setVoiceAnnotations([]);
    },
  }));

  // Combined capture with both annotations
  const handleCombinedCapture = async () => {
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

      // Draw content
      ctx.drawImage(contentCanvas, 0, 0);

      const scale = contentCanvas.width / (markupCanvasRef.current?.width || 1);
      ctx.save();
      ctx.scale(scale, scale);

      // Draw markup strokes
      markupStrokes.forEach((stroke) => {
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

      // Draw voice annotation rectangles
      voiceAnnotations.forEach((annotation) => {
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
      });

      ctx.restore();

      const dataUrl = combinedCanvas.toDataURL("image/png");
      onCapture(dataUrl, markupStrokes, voiceAnnotations);
    } catch (error) {
      console.error("Screenshot capture failed:", error);
    }
  };

  // Markup handlers (only active when mode === "markup")
  const handleMarkupPointerDown = (e: React.PointerEvent) => {
    if (mode !== "markup") return;
    setIsDrawingMarkup(true);
    const rect = markupCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setCurrentStroke({ points: [point], color, width: lineWidth });
  };

  const handleMarkupPointerMove = (e: React.PointerEvent) => {
    if (mode !== "markup" || !isDrawingMarkup || !currentStroke) return;
    const rect = markupCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setCurrentStroke({
      ...currentStroke,
      points: [...currentStroke.points, point],
    });
  };

  const handleMarkupPointerUp = () => {
    if (mode !== "markup" || !isDrawingMarkup || !currentStroke) return;
    setIsDrawingMarkup(false);
    setMarkupStrokes([...markupStrokes, currentStroke]);
    setCurrentStroke(null);
  };

  // Voice handlers (only active when mode === "voice")
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

      setTimeout(() => {
        if (mediaRecorder.state === "inactive") return;
        setIsRecording(true);
      }, 500);

      mediaRecorder.start(200);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        resolve(new Blob());
        return;
      }

      setTimeout(() => {
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());
          setIsRecording(false);
          resolve(audioBlob);
        };
        mediaRecorder.stop();
      }, 500);
    });
  };

  const playAudio = (annotation: VoiceAnnotation) => {
    if (!annotation.audioBlob) return;
    const url = URL.createObjectURL(annotation.audioBlob);
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  };

  const handleVoiceCanvasClick = (e: React.MouseEvent) => {
    if (mode !== "voice" || isDrawingVoice) return;
    const rect = voiceCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is within any annotation bounds
    for (const annotation of voiceAnnotations) {
      if (
        x >= annotation.bounds.x &&
        x <= annotation.bounds.x + annotation.bounds.width &&
        y >= annotation.bounds.y &&
        y <= annotation.bounds.y + annotation.bounds.height
      ) {
        setSelectedId(annotation.id);
        return;
      }
    }
    // Click outside all annotations - deselect
    setSelectedId(null);
  };

  const handleVoicePointerDown = async (e: React.PointerEvent) => {
    if (mode !== "voice") return;
    const rect = voiceCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setVoiceStartPoint(point);
    setIsDrawingVoice(true);
    await startRecording();
  };

  const handleVoicePointerMove = (e: React.PointerEvent) => {
    if (mode !== "voice" || !isDrawingVoice || !voiceStartPoint) return;
    const rect = voiceCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    const x = Math.min(voiceStartPoint.x, point.x);
    const y = Math.min(voiceStartPoint.y, point.y);
    const width = Math.abs(point.x - voiceStartPoint.x);
    const height = Math.abs(point.y - voiceStartPoint.y);
    setCurrentVoiceBounds({ x, y, width, height });
  };

  const handleVoicePointerUp = async () => {
    if (mode !== "voice" || !isDrawingVoice || !currentVoiceBounds) return;
    setIsDrawingVoice(false);

    const audioBlob = await stopRecording();
    const annotationId = `C${voiceAnnotations.length + 1}`;
    const newAnnotation: VoiceAnnotation = {
      id: annotationId,
      bounds: currentVoiceBounds,
      audioBlob,
      transcription: "",
      timestamp: Date.now(),
      status: "transcribing",
    };

    setVoiceAnnotations([...voiceAnnotations, newAnnotation]);
    setCurrentVoiceBounds(null);
    setVoiceStartPoint(null);

    // Transcribe
    try {
      const formData = new FormData();
      formData.append("audio", new File([audioBlob], "recording.webm", { type: "audio/webm" }));

      const response = await fetch("/api/transcribe-audio", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      setVoiceAnnotations((prev) =>
        prev.map((a) =>
          a.id === annotationId
            ? { ...a, status: "ready" as const, transcription: data.transcript || "No speech detected" }
            : a
        )
      );
    } catch (error) {
      console.error("Transcription error:", error);
      setVoiceAnnotations((prev) =>
        prev.map((a) =>
          a.id === annotationId
            ? { ...a, status: "error" as const, error: "Transcription failed" }
            : a
        )
      );
    }
  };

  // Combined pointer handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (mode === "markup") handleMarkupPointerDown(e);
    else handleVoicePointerDown(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (mode === "markup") handleMarkupPointerMove(e);
    else handleVoicePointerMove(e);
  };

  const handlePointerUp = () => {
    if (mode === "markup") handleMarkupPointerUp();
    else handleVoicePointerUp();
  };

  // Resize canvases
  useEffect(() => {
    const container = containerRef.current;
    const markupCanvas = markupCanvasRef.current;
    const voiceCanvas = voiceCanvasRef.current;
    if (!container || !markupCanvas || !voiceCanvas) return;

    const resizeCanvases = () => {
      const rect = container.getBoundingClientRect();
      markupCanvas.width = rect.width;
      markupCanvas.height = rect.height;
      voiceCanvas.width = rect.width;
      voiceCanvas.height = rect.height;
    };

    resizeCanvases();
    window.addEventListener("resize", resizeCanvases);
    return () => window.removeEventListener("resize", resizeCanvases);
  }, []);

  // Redraw markup canvas
  useEffect(() => {
    const canvas = markupCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    [...markupStrokes, ...(currentStroke ? [currentStroke] : [])].forEach((stroke) => {
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
  }, [markupStrokes, currentStroke]);

  // Redraw voice canvas
  useEffect(() => {
    const canvas = voiceCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all voice annotations
    voiceAnnotations.forEach((annotation) => {
      const isSelected = annotation.id === selectedId;
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
    });

    // Draw current rectangle being drawn
    if (currentVoiceBounds) {
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(
        currentVoiceBounds.x,
        currentVoiceBounds.y,
        currentVoiceBounds.width,
        currentVoiceBounds.height
      );
    }
  }, [voiceAnnotations, currentVoiceBounds, selectedId]);

  // Render both canvases
  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 bg-white rounded-lg shadow-lg p-3 flex flex-col gap-2">
        {mode === "markup" && (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => setColor("#FF0000")}
                className={`w-8 h-8 rounded border-2 ${color === "#FF0000" ? "border-black" : "border-gray-300"}`}
                style={{ backgroundColor: "#FF0000" }}
              />
              <button
                onClick={() => setColor("#000000")}
                className={`w-8 h-8 rounded border-2 ${color === "#000000" ? "border-black" : "border-gray-300"}`}
                style={{ backgroundColor: "#000000" }}
              />
              <button
                onClick={() => setColor("#0000FF")}
                className={`w-8 h-8 rounded border-2 ${color === "#0000FF" ? "border-black" : "border-gray-300"}`}
                style={{ backgroundColor: "#0000FF" }}
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
          </>
        )}
        <button
          onClick={() => {
            setMarkupStrokes([]);
            setVoiceAnnotations([]);
          }}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          Clear All
        </button>
        <button
          onClick={handleCombinedCapture}
          disabled={markupStrokes.length === 0 && voiceAnnotations.length === 0}
          className="px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded font-medium disabled:opacity-50"
        >
          Send to AI
        </button>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-20 left-4 z-20 bg-red-500 text-white rounded-lg px-4 py-2 flex items-center gap-2 animate-pulse">
          <div className="w-3 h-3 bg-white rounded-full" />
          <span className="font-medium">Recording...</span>
        </div>
      )}

      {/* Voice Annotations List */}
      {voiceAnnotations.length > 0 && (
        <div className="absolute bottom-4 left-4 z-20 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="font-semibold mb-2 text-sm">Annotations:</div>
          <div className="space-y-2">
            {voiceAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                onClick={() => setSelectedId(annotation.id)}
                className={`p-2 rounded border cursor-pointer transition-colors ${
                  selectedId === annotation.id
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="font-mono text-sm font-medium text-red-600">
                  {annotation.id}
                </div>
                {annotation.status === "transcribing" && (
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Transcribing...
                  </div>
                )}
                {annotation.status === "ready" && (
                  <>
                    <div className="text-xs text-gray-700 mt-1">
                      {annotation.transcription}
                    </div>
                    {annotation.audioBlob && selectedId === annotation.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(annotation);
                        }}
                        className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                      >
                        <Volume2 className="w-4 h-4" />
                        Play Audio
                      </button>
                    )}
                  </>
                )}
                {annotation.status === "error" && (
                  <div className="text-xs text-red-500 mt-1">
                    {annotation.error || "Transcription failed"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div ref={containerRef} className="relative">
        {children}

        {/* Markup canvas (always rendered, draws strokes) */}
        <canvas
          ref={markupCanvasRef}
          className="absolute inset-0"
          style={{ pointerEvents: mode === "markup" ? "auto" : "none", cursor: mode === "markup" ? "crosshair" : "default" }}
          onPointerDown={mode === "markup" ? handlePointerDown : undefined}
          onPointerMove={mode === "markup" ? handlePointerMove : undefined}
          onPointerUp={mode === "markup" ? handlePointerUp : undefined}
        />

        {/* Voice canvas (always rendered, draws rectangles) */}
        <canvas
          ref={voiceCanvasRef}
          className="absolute inset-0"
          style={{ pointerEvents: mode === "voice" ? "auto" : "none", cursor: mode === "voice" ? "crosshair" : "default" }}
          onPointerDown={mode === "voice" ? handlePointerDown : undefined}
          onPointerMove={mode === "voice" ? handlePointerMove : undefined}
          onPointerUp={mode === "voice" ? handlePointerUp : undefined}
          onClick={handleVoiceCanvasClick}
        />
      </div>
    </div>
  );
});

CombinedAnnotationCanvas.displayName = "CombinedAnnotationCanvas";
