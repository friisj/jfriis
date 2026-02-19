"use client"

import { useRef, useState } from "react"
import { MarkupCanvas } from "@/components/studio/chalk/markup/MarkupCanvas"
import { WireframeRenderer } from "@/components/studio/chalk/wireframe/WireframeRenderer"
import type { Wireframe } from "@/lib/studio/chalk/wireframe/schema"
import { Loader2 } from "lucide-react"

const initialWireframe: Wireframe = {
  components: [
    {
      id: "c1",
      type: "container",
      fidelity: 2,
      props: {
        label: "Sign Up Form",
        orientation: "vertical",
        children: [
          {
            id: "t1",
            type: "text",
            fidelity: 2,
            props: { content: "Create Account", size: "large", emphasis: "strong" },
          },
          {
            id: "i1",
            type: "input",
            fidelity: 2,
            props: { label: "Name", placeholder: "Full name", type: "text", required: true },
          },
          {
            id: "i2",
            type: "input",
            fidelity: 2,
            props: { label: "Email", placeholder: "you@example.com", type: "email", required: true },
          },
          {
            id: "b1",
            type: "button",
            fidelity: 2,
            props: { label: "Sign Up", variant: "primary", size: "medium" },
          },
        ],
      },
    },
  ],
}

export default function VisionIterationPrototype() {
  const [wireframe, setWireframe] = useState<Wireframe>(initialWireframe)
  const [iterating, setIterating] = useState(false)
  const [interpretation, setInterpretation] = useState<string | null>(null)
  const [changes, setChanges] = useState<string[]>([])

  const handleCapture = async (screenshot: string) => {
    setIterating(true)
    setInterpretation(null)
    setChanges([])

    try {
      const response = await fetch("/apps/chalk/api/iterate-with-markup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenshotBase64: screenshot,
          currentWireframe: wireframe,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Iteration failed")
      }

      if (data.wireframe) {
        setWireframe(data.wireframe)
      }
      setInterpretation(data.interpretation || null)
      setChanges(data.changes || [])
    } catch (error) {
      console.error("Vision iteration error:", error)
    } finally {
      setIterating(false)
    }
  }

  return (
    <div className="h-full w-full flex bg-background">
      <div className="flex-1 overflow-auto p-8">
        <MarkupCanvas onCapture={handleCapture} enabled={!iterating}>
          <div className="max-w-lg mx-auto">
            <WireframeRenderer wireframe={wireframe} />
          </div>
        </MarkupCanvas>
      </div>

      <div className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Vision Iteration</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Draw markup, then send to Claude for intelligent iteration
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {iterating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Claude is analyzing your markup...
            </div>
          )}

          {interpretation && (
            <div>
              <div className="text-sm font-medium mb-1">Interpretation</div>
              <p className="text-xs text-muted-foreground">{interpretation}</p>
            </div>
          )}

          {changes.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-1">Changes Made</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {changes.map((change, i) => (
                  <li key={i} className="flex gap-1">
                    <span className="text-green-600 shrink-0">&bull;</span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-3 bg-muted rounded">
            <div className="text-sm font-medium mb-1">How it works</div>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Draw on the wireframe with markup tools</li>
              <li>Click &ldquo;Send to AI&rdquo; to capture</li>
              <li>Claude Vision analyzes your annotations</li>
              <li>Wireframe updates based on your feedback</li>
            </ol>
          </div>

          <button
            onClick={() => {
              setWireframe(initialWireframe)
              setInterpretation(null)
              setChanges([])
            }}
            className="w-full px-3 py-2 text-sm bg-muted rounded hover:bg-muted/80"
          >
            Reset Wireframe
          </button>
        </div>

        <div className="p-4 border-t text-xs text-muted-foreground">
          Uses Claude Sonnet vision API for markup interpretation.
        </div>
      </div>
    </div>
  )
}
