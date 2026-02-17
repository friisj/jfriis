// @ts-nocheck
"use client";

import { useState } from "react";
import { Editor, TLShapeId, createShapeId } from "tldraw";
import { TldrawCanvas } from "./TldrawCanvas";
import { ChatPanel } from "../chat/ChatPanel";
import { ComponentSelectionPanel } from "./ComponentSelectionPanel";
import { ShapeActionsProvider } from "@/lib/studio/chalk/contexts/ShapeActionsContext";
import type { ChatContext, WireframeOption } from "@/lib/studio/chalk/types/chat";
import type { WireframeComponent } from "@/lib/studio/chalk/wireframe/schema";

interface MainCanvasProps {
  boardId: string;
  userId: string;
  initialSnapshot: any;
  initialViewport: any;
}

export function MainCanvas({
  boardId,
  userId,
  initialSnapshot,
  initialViewport,
}: MainCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<TLShapeId | null>(null);
  const [context, setContext] = useState<ChatContext>({ type: "canvas" });
  const [showChat, setShowChat] = useState(true);
  const [showSelection, setShowSelection] = useState(false);

  const handleEditorMount = (editor: Editor) => {
    setEditor(editor);

    // Listen to selection changes
    editor.store.listen(() => {
      const selectedShapes = editor.getSelectedShapes();
      if (selectedShapes.length === 1) {
        const shape = selectedShapes[0];
        if (shape.type.startsWith("wireframe:")) {
          setSelectedShapeId(shape.id);
          setShowSelection(true);
        } else {
          setSelectedShapeId(null);
          setShowSelection(false);
        }
      } else {
        setSelectedShapeId(null);
        setShowSelection(false);
      }
    });
  };

  const handleSelectOption = (option: WireframeOption) => {
    if (!editor) return;

    // For now, add the first component from the option to the canvas
    // In a real implementation, we'd create proper Tldraw shapes
    if (option.wireframe.components.length > 0) {
      const component = option.wireframe.components[0];

      // Determine shape type from component
      let shapeType = "wireframe:container";
      if (component.type === "interactive") {
        if ((component.props as any).label) {
          shapeType = "wireframe:button";
        } else {
          shapeType = "wireframe:input";
        }
      } else if (component.type === "content") {
        shapeType = "wireframe:container";
      }

      // Create shape at center of viewport
      const viewport = editor.getViewportPageBounds();
      const x = viewport.center.x - 60;
      const y = viewport.center.y - 40;

      editor.createShape({
        id: createShapeId(),
        type: shapeType,
        x,
        y,
        props: {
          component: component,
        },
      });

      // Select the new shape
      // editor.select(id);
    }
  };

  const handleContextChange = (newContext: ChatContext) => {
    setContext(newContext);

    if (newContext.type === "element" && selectedShapeId && editor) {
      const shape = editor.getShape(selectedShapeId);
      if (shape) {
        setContext({
          ...newContext,
          elementId: selectedShapeId,
          elementData: (shape.props as any).component,
        });
      }
    }
  };

  const handleFocusAI = (shapeId?: TLShapeId) => {
    const targetShapeId = shapeId || selectedShapeId;
    if (targetShapeId && editor) {
      const shape = editor.getShape(targetShapeId);
      if (shape) {
        setContext({
          type: "element",
          elementId: targetShapeId,
          elementData: (shape.props as any).component,
        });
        // Switch to chat tab to show the focused context
        setShowChat(true);
      }
    }
  };

  const handleEdit = (shapeId: TLShapeId) => {
    // TODO: Implement edit mode with annotation capabilities
    // This will be connected to the spike 7/8 annotation features
    console.log("Edit shape:", shapeId);
    // For now, just select the shape and show the selection panel
    if (editor) {
      editor.select(shapeId);
      setShowChat(false);
    }
  };

  const getSelectedComponentData = () => {
    if (!selectedShapeId || !editor) return null;

    const shape = editor.getShape(selectedShapeId);
    if (!shape) return null;

    const component = (shape.props as any).component as WireframeComponent;
    return {
      id: selectedShapeId,
      type: shape.type,
      props: component?.props || {},
      // eslint-disable-next-line react-hooks/purity
      createdAt: Date.now(), // TODO: Store actual creation time
    };
  };

  const getSelectedComponentName = () => {
    if (!selectedShapeId || !editor) return undefined;

    const shape = editor.getShape(selectedShapeId);
    if (!shape) return undefined;

    const component = (shape.props as any).component as WireframeComponent;
    return component?.props?.label || component?.id || shape.type.replace("wireframe:", "");
  };

  return (
    <div className="flex-1 flex relative">
      {/* Main Canvas */}
      <div className="flex-1 relative">
        <ShapeActionsProvider
          actions={{
            onFocusAI: handleFocusAI,
            onEdit: handleEdit,
          }}
        >
          <TldrawCanvas
            boardId={boardId}
            userId={userId}
            initialSnapshot={initialSnapshot}
            initialViewport={initialViewport}
            onMount={handleEditorMount}
          />
        </ShapeActionsProvider>
      </div>

      {/* Right Sidebar - Chat or Selection */}
      <div className="w-96 flex flex-col">
        {/* Toggle Buttons */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setShowChat(true)}
            className={`flex-1 py-2 text-sm font-medium ${
              showChat
                ? "bg-white border-b-2 border-blue-600 text-blue-600"
                : "bg-gray-50 text-gray-600 hover:text-gray-900"
            }`}
          >
            AI Chat
          </button>
          <button
            onClick={() => setShowChat(false)}
            disabled={!selectedShapeId}
            className={`flex-1 py-2 text-sm font-medium ${
              !showChat && selectedShapeId
                ? "bg-white border-b-2 border-blue-600 text-blue-600"
                : "bg-gray-50 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            Selection
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden">
          {showChat ? (
            <ChatPanel
              context={context}
              onContextChange={handleContextChange}
              onSelectOption={handleSelectOption}
              selectedElementName={getSelectedComponentName()}
            />
          ) : (
            <ComponentSelectionPanel
              selectedComponent={getSelectedComponentData()}
              onFocusAI={handleFocusAI}
            />
          )}
        </div>
      </div>
    </div>
  );
}
