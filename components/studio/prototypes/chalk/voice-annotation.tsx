"use client"

import { VoiceAnnotationCanvas } from "@/components/studio/chalk/voice/VoiceAnnotationCanvas"
import { WireframeRenderer } from "@/components/studio/chalk/wireframe/WireframeRenderer"
import type { Wireframe } from "@/lib/studio/chalk/wireframe/schema"

const sampleWireframe: Wireframe = {
  components: [
    {
      id: "c1",
      type: "container",
      fidelity: 2,
      props: {
        label: "Dashboard Header",
        orientation: "horizontal",
        children: [
          {
            id: "t1",
            type: "text",
            fidelity: 2,
            props: { content: "Dashboard", size: "large", emphasis: "strong" },
          },
          {
            id: "b1",
            type: "button",
            fidelity: 2,
            props: { label: "Settings", variant: "secondary", size: "small" },
          },
        ],
      },
    },
    {
      id: "c2",
      type: "container",
      fidelity: 2,
      props: {
        label: "Stats Row",
        orientation: "horizontal",
        children: [
          {
            id: "t2",
            type: "text",
            fidelity: 2,
            props: { content: "Active Users: 1,234", size: "medium", emphasis: "normal" },
          },
          {
            id: "t3",
            type: "text",
            fidelity: 2,
            props: { content: "Revenue: $12,345", size: "medium", emphasis: "normal" },
          },
        ],
      },
    },
  ],
}

export default function VoiceAnnotationPrototype() {
  return (
    <div className="h-full w-full flex bg-background">
      <div className="flex-1 overflow-auto p-8">
        <VoiceAnnotationCanvas maxAnnotations={5}>
          <div className="max-w-lg mx-auto">
            <WireframeRenderer wireframe={sampleWireframe} />
          </div>
        </VoiceAnnotationCanvas>
      </div>

      <div className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Voice Annotation</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Draw rectangles while recording voice feedback
          </p>
        </div>
        <div className="flex-1 p-4">
          <div className="text-sm space-y-3">
            <div className="p-3 bg-muted rounded">
              <div className="font-medium mb-1">How it works</div>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Click and drag to draw a rectangle</li>
                <li>Speak while drawing to record voice</li>
                <li>Release to finish — audio is transcribed via Deepgram</li>
                <li>Click annotations to select and play back audio</li>
              </ol>
            </div>
          </div>
        </div>
        <div className="p-4 border-t text-xs text-muted-foreground">
          Requires microphone access. Transcription via Deepgram API.
        </div>
      </div>
    </div>
  )
}
