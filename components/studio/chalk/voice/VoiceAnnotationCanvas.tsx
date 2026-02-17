// @ts-nocheck
"use client";

import { useRef, useState, useEffect } from "react";
import { Volume2, Loader2 } from "lucide-react";

interface VoiceAnnotation {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  audioBlob: Blob | null;
  transcription: string;
  timestamp: number;
  status: "recording" | "transcribing" | "ready" | "error";
  error?: string;
}

interface VoiceAnnotationCanvasProps {
  children: React.ReactNode;
  onAnnotationsChange?: (annotations: VoiceAnnotation[]) => void;
  onCapture?: (screenshot: string, annotations: VoiceAnnotation[]) => void;
  maxAnnotations?: number;
}

export function VoiceAnnotationCanvas({
  children,
  onAnnotationsChange,
  onCapture,
  maxAnnotations = 3,
}: VoiceAnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [annotations, setAnnotations] = useState<VoiceAnnotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [currentBounds, setCurrentBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);

  useEffect(() => {
    onAnnotationsChange?.(annotations);
  }, [annotations, onAnnotationsChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [annotations, currentBounds, selectedId]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all annotations
    annotations.forEach((annotation) => {
      const isSelected = annotation.id === selectedId;

      ctx.strokeStyle = isSelected ? "#EF4444" : "#DC2626";
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.setLineDash(isSelected ? [] : [5, 5]);

      ctx.strokeRect(
        annotation.bounds.x,
        annotation.bounds.y,
        annotation.bounds.width,
        annotation.bounds.height
      );

      // Draw ID label
      ctx.fillStyle = "#DC2626";
      ctx.font = "bold 14px monospace";
      const labelX = annotation.bounds.x + 4;
      const labelY = annotation.bounds.y - 4;
      ctx.fillText(annotation.id, labelX, labelY);

      ctx.setLineDash([]);
    });

    // Draw current rectangle being drawn
    if (currentBounds) {
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(
        currentBounds.x,
        currentBounds.y,
        currentBounds.width,
        currentBounds.height
      );
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Try to use a Deepgram-compatible format
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options = { mimeType: "audio/webm;codecs=opus" };
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options = { mimeType: "audio/mp4" };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Add 500ms buffer before starting
      setTimeout(() => {
        if (mediaRecorder.state === "inactive") return;
        setIsRecording(true);
        setRecordingStartTime(Date.now());
      }, 500);

      // Request data every 200ms to ensure we get chunks
      mediaRecorder.start(200);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Microphone permission denied or not available");
    }
  };

  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder) {
        resolve(new Blob());
        return;
      }

      // Add 500ms buffer after stopping
      setTimeout(() => {
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());
          setIsRecording(false);
          resolve(audioBlob);
        };

        mediaRecorder.stop();
      }, 500);
    });
  };

  const getCanvasPoint = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = async (e: React.PointerEvent) => {
    if (annotations.length >= maxAnnotations) {
      alert(`Maximum ${maxAnnotations} annotations allowed`);
      return;
    }

    const point = getCanvasPoint(e);
    setStartPoint(point);
    setIsDrawing(true);
    await startRecording();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !startPoint) return;

    const point = getCanvasPoint(e);
    const x = Math.min(startPoint.x, point.x);
    const y = Math.min(startPoint.y, point.y);
    const width = Math.abs(point.x - startPoint.x);
    const height = Math.abs(point.y - startPoint.y);

    setCurrentBounds({ x, y, width, height });
  };

  const handlePointerUp = async () => {
    if (!isDrawing || !currentBounds) return;

    setIsDrawing(false);

    // Stop recording
    const audioBlob = await stopRecording();

    // Create annotation with "transcribing" status
    const annotationId = `C${annotations.length + 1}`;
    const newAnnotation: VoiceAnnotation = {
      id: annotationId,
      bounds: currentBounds,
      audioBlob,
      transcription: "",
      timestamp: Date.now(),
      status: "transcribing",
    };

    setAnnotations([...annotations, newAnnotation]);
    setCurrentBounds(null);
    setStartPoint(null);

    // Transcribe using Deepgram API
    try {
      const formData = new FormData();
      // Use the actual blob type, or default to webm/opus
      const fileType = audioBlob.type || "audio/webm;codecs=opus";
      const fileExtension = fileType.includes("mp4") ? "m4a" : "webm";
      formData.append(
        "audio",
        new File([audioBlob], `recording.${fileExtension}`, {
          type: fileType,
        })
      );

      const response = await fetch("/apps/chalk/api/transcribe-audio", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transcription failed");
      }

      // Update annotation with transcript
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === annotationId
            ? {
                ...a,
                status: "ready" as const,
                transcription: data.transcript || "No speech detected",
              }
            : a
        )
      );
    } catch (error) {
      console.error("Transcription error:", error);
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === annotationId
            ? {
                ...a,
                status: "error" as const,
                error: error instanceof Error ? error.message : "Unknown error",
              }
            : a
        )
      );
    }
  };

  const handleCanvasClick = (e: React.PointerEvent) => {
    if (isDrawing) return;

    const point = getCanvasPoint(e);

    // Check if clicked on any annotation
    const clicked = annotations.find(
      (a) =>
        point.x >= a.bounds.x &&
        point.x <= a.bounds.x + a.bounds.width &&
        point.y >= a.bounds.y &&
        point.y <= a.bounds.y + a.bounds.height
    );

    setSelectedId(clicked ? clicked.id : null);
  };

  const playAudio = (annotation: VoiceAnnotation) => {
    if (!annotation.audioBlob) return;

    const audio = new Audio(URL.createObjectURL(annotation.audioBlob));
    audio.play();
  };

  const clearAnnotations = () => {
    setAnnotations([]);
    setSelectedId(null);
  };

  const handleCapture = async () => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !onCapture) return;

    try {
      // Dynamically import html2canvas
      const html2canvas = (await import("html2canvas")).default;

      // Capture the content div
      const contentCanvas = await html2canvas(container, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      // Create a new canvas to combine content + annotation rectangles
      const combinedCanvas = document.createElement("canvas");
      combinedCanvas.width = contentCanvas.width;
      combinedCanvas.height = contentCanvas.height;

      const ctx = combinedCanvas.getContext("2d");
      if (!ctx) return;

      // Draw content
      ctx.drawImage(contentCanvas, 0, 0);

      // Draw annotation rectangles (scaled up)
      const scale = contentCanvas.width / canvas.width;
      ctx.save();
      ctx.scale(scale, scale);

      annotations.forEach((annotation) => {
        const isSelected = annotation.id === selectedId;

        ctx.strokeStyle = isSelected ? "#EF4444" : "#DC2626";
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.setLineDash(isSelected ? [] : [5, 5]);

        ctx.strokeRect(
          annotation.bounds.x,
          annotation.bounds.y,
          annotation.bounds.width,
          annotation.bounds.height
        );

        // Draw ID label
        ctx.fillStyle = "#DC2626";
        ctx.font = "bold 14px monospace";
        const labelX = annotation.bounds.x + 4;
        const labelY = annotation.bounds.y - 4;
        ctx.fillText(annotation.id, labelX, labelY);

        ctx.setLineDash([]);
      });

      ctx.restore();

      // Convert to base64
      const dataUrl = combinedCanvas.toDataURL("image/png");
      onCapture(dataUrl, annotations);
    } catch (error) {
      console.error("Screenshot capture failed:", error);
      alert("Failed to capture screenshot. Please try again.");
    }
  };

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 bg-white rounded-lg shadow-lg p-3 flex flex-col gap-2">
        <button
          onClick={handleCapture}
          disabled={annotations.length === 0}
          className="px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send to AI
        </button>
        <button
          onClick={clearAnnotations}
          disabled={annotations.length === 0}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
        >
          Clear All
        </button>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute top-20 left-4 z-20 bg-red-500 text-white rounded-lg px-4 py-2 flex items-center gap-2 animate-pulse">
          <div className="w-3 h-3 bg-white rounded-full" />
          <span className="font-medium">Recording...</span>
        </div>
      )}

      {/* Annotation List */}
      {annotations.length > 0 && (
        <div className="absolute bottom-4 left-4 z-20 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="font-semibold mb-2 text-sm">Annotations:</div>
          <div className="space-y-2">
            {annotations.map((annotation) => (
              <div
                key={annotation.id}
                className={`p-2 rounded border ${selectedId === annotation.id ? "border-red-500 bg-red-50" : "border-gray-200"} cursor-pointer`}
                onClick={() => setSelectedId(annotation.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-sm font-medium text-red-600">
                      {annotation.id}
                    </div>
                    {annotation.status === "transcribing" && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Transcribing...
                      </div>
                    )}
                    {annotation.status === "ready" && (
                      <div className="text-xs text-gray-700 mt-1">
                        {annotation.transcription}
                      </div>
                    )}
                    {annotation.status === "error" && (
                      <div className="text-xs text-red-600 mt-1">
                        Error: {annotation.error}
                      </div>
                    )}
                  </div>
                  {annotation.audioBlob &&
                    annotation.status === "ready" &&
                    selectedId === annotation.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(annotation);
                        }}
                        className="ml-2 p-1 hover:bg-gray-100 rounded"
                        title="Play audio"
                      >
                        <Volume2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content + Canvas layers */}
      <div ref={containerRef} className="relative">
        {children}

        {/* Annotation canvas overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-auto cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleCanvasClick}
        />
      </div>
    </div>
  );
}
