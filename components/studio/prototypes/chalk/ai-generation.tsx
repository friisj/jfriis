"use client"

import { useState } from "react"
import { ChatPanel } from "@/components/studio/chalk/chat/ChatPanel"
import { WireframeRenderer } from "@/components/studio/chalk/wireframe/WireframeRenderer"
import type { ChatContext, WireframeOption } from "@/lib/studio/chalk/types/chat"

export default function AiGenerationPrototype() {
  const [context, setContext] = useState<ChatContext>({ type: "canvas" })
  const [selectedOption, setSelectedOption] = useState<WireframeOption | null>(null)

  return (
    <div className="h-full w-full flex">
      <div className="flex-1 overflow-auto p-8 bg-gray-50">
        {selectedOption ? (
          <div className="max-w-2xl mx-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedOption.title}</h2>
              <button
                onClick={() => setSelectedOption(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <WireframeRenderer wireframe={selectedOption.wireframe} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Select a generated wireframe option to preview it here.</p>
          </div>
        )}
      </div>
      <div className="w-96">
        <ChatPanel
          context={context}
          onContextChange={setContext}
          onSelectOption={setSelectedOption}
        />
      </div>
    </div>
  )
}
