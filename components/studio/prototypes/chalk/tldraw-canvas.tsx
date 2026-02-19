"use client"

import { TldrawCanvas } from "@/components/studio/chalk/canvas/TldrawCanvas"

export default function TldrawCanvasPrototype() {
  return (
    <div className="h-full w-full">
      <TldrawCanvas
        boardId="spike-demo"
        userId="spike-demo"
      />
    </div>
  )
}
