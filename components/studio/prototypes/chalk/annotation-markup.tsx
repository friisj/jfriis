"use client"

import { useRef, useState } from "react"
import {
  UnifiedAnnotationCanvas,
  type AnnotationType,
  type Annotation,
} from "@/components/studio/chalk/annotation/UnifiedAnnotationCanvas"
import { WireframeRenderer } from "@/components/studio/chalk/wireframe/WireframeRenderer"
import type { Wireframe } from "@/lib/studio/chalk/wireframe/schema"

const sampleWireframe: Wireframe = {
  components: [
    {
      id: "c1",
      type: "container",
      fidelity: 2,
      props: {
        label: "Product Card",
        orientation: "vertical",
        children: [
          {
            id: "img1",
            type: "image",
            fidelity: 2,
            props: { width: 300, height: 200, alt: "Product photo", placeholder: true },
          },
          {
            id: "t1",
            type: "text",
            fidelity: 2,
            props: { content: "Product Name", size: "large", emphasis: "strong" },
          },
          {
            id: "t2",
            type: "text",
            fidelity: 2,
            props: { content: "$49.99", size: "medium", emphasis: "normal" },
          },
          {
            id: "b1",
            type: "button",
            fidelity: 2,
            props: { label: "Add to Cart", variant: "primary", size: "medium" },
          },
        ],
      },
    },
  ],
}

export default function AnnotationMarkupPrototype() {
  const canvasRef = useRef<{ triggerCapture: () => void; deleteSelected: () => void }>(null)
  const [tool, setTool] = useState<AnnotationType | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const handleCapture = (screenshot: string, annots: Annotation[]) => {
    setCapturedImage(screenshot)
  }

  return (
    <div className="h-full w-full flex bg-background">
      <div className="flex-1 overflow-auto p-8">
        <UnifiedAnnotationCanvas
          ref={canvasRef}
          tool={tool}
          onCapture={handleCapture}
          onAnnotationsChange={setAnnotations}
        >
          <div className="max-w-lg mx-auto">
            <WireframeRenderer wireframe={sampleWireframe} />
          </div>
        </UnifiedAnnotationCanvas>
      </div>

      <div className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Annotation Tools</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Draw annotations on the wireframe
          </p>
        </div>

        <div className="p-4 space-y-2">
          <div className="text-sm font-medium mb-2">Tool</div>
          {([
            { value: null, label: "Select" },
            { value: "rectangle" as const, label: "Rectangle" },
            { value: "freehand" as const, label: "Freehand" },
            { value: "text" as const, label: "Text" },
          ]).map((opt) => (
            <button
              key={opt.label}
              onClick={() => setTool(opt.value)}
              className={`w-full text-left px-3 py-2 rounded text-sm ${
                tool === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="p-4 border-t space-y-2">
          <button
            onClick={() => canvasRef.current?.triggerCapture()}
            disabled={annotations.length === 0}
            className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            Capture Screenshot
          </button>
          <button
            onClick={() => canvasRef.current?.deleteSelected()}
            className="w-full px-3 py-2 text-sm bg-muted rounded hover:bg-muted/80"
          >
            Delete Selected
          </button>
        </div>

        {capturedImage && (
          <div className="p-4 border-t">
            <div className="text-sm font-medium mb-2">Captured</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedImage} alt="Captured annotation" className="w-full rounded border" />
          </div>
        )}

        <div className="mt-auto p-4 border-t text-xs text-muted-foreground">
          {annotations.length} annotation{annotations.length !== 1 ? "s" : ""} on canvas
        </div>
      </div>
    </div>
  )
}
