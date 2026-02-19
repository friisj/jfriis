"use client"

import { WireframeRenderer } from "@/components/studio/chalk/wireframe/WireframeRenderer"
import type { Wireframe } from "@/lib/studio/chalk/wireframe/schema"

const sampleWireframe: Wireframe = {
  components: [
    {
      id: "c1",
      type: "container",
      fidelity: 2,
      props: {
        label: "Login Form",
        orientation: "vertical",
        children: [
          {
            id: "t1",
            type: "text",
            fidelity: 2,
            props: { content: "Sign In", size: "large", emphasis: "strong" },
          },
          {
            id: "i1",
            type: "input",
            fidelity: 2,
            props: {
              label: "Email",
              placeholder: "you@example.com",
              type: "email",
              required: true,
            },
          },
          {
            id: "i2",
            type: "input",
            fidelity: 2,
            props: {
              label: "Password",
              placeholder: "Enter password",
              type: "password",
              required: true,
            },
          },
          {
            id: "b1",
            type: "button",
            fidelity: 2,
            props: { label: "Sign In", variant: "primary", size: "medium" },
          },
          {
            id: "d1",
            type: "divider",
            fidelity: 2,
            props: { orientation: "horizontal" },
          },
          {
            id: "t2",
            type: "text",
            fidelity: 2,
            props: {
              content: "Or continue with",
              size: "small",
              emphasis: "normal",
            },
          },
          {
            id: "l1",
            type: "list",
            fidelity: 2,
            props: {
              orientation: "horizontal",
              spacing: "normal",
              items: [
                {
                  id: "b2",
                  type: "button",
                  fidelity: 2,
                  props: {
                    label: "Google",
                    variant: "secondary",
                    size: "small",
                  },
                },
                {
                  id: "b3",
                  type: "button",
                  fidelity: 2,
                  props: {
                    label: "GitHub",
                    variant: "secondary",
                    size: "small",
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      id: "img1",
      type: "image",
      fidelity: 2,
      props: { width: 200, height: 150, alt: "Hero illustration", placeholder: true },
    },
  ],
}

export default function WireframeRendererPrototype() {
  return (
    <div className="h-full w-full flex bg-background">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h2 className="text-lg font-semibold mb-2">Sample Login Form</h2>
            <p className="text-sm text-muted-foreground mb-4">
              All 7 wireframe component types rendered from a JSON schema definition.
            </p>
          </div>
          <WireframeRenderer wireframe={sampleWireframe} />
        </div>
      </div>

      <div className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Wireframe Renderer</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Schema-driven lo-fi component system
          </p>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-3">
          <div className="text-sm font-medium">Component Types</div>
          {["Container", "Text", "Button", "Input", "List", "Image", "Divider"].map(
            (type) => (
              <div
                key={type}
                className="px-3 py-2 bg-muted rounded text-sm font-mono"
              >
                {type}
              </div>
            )
          )}
        </div>
        <div className="p-4 border-t text-xs text-muted-foreground">
          Renders wireframe JSON into lo-fi UI components at configurable fidelity levels.
        </div>
      </div>
    </div>
  )
}
