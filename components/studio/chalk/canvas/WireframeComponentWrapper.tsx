"use client";

import { useEditor, TLShapeId } from "tldraw";
import { useState, useEffect } from "react";
import { SelectionToolbar } from "./SelectionToolbar";
import { WireframeComponent } from "@/lib/studio/chalk/wireframe/schema";
import { useShapeActions } from "@/lib/studio/chalk/contexts/ShapeActionsContext";

interface WireframeComponentWrapperProps {
  shapeId: TLShapeId;
  component: WireframeComponent;
  children: React.ReactNode;
}

export function WireframeComponentWrapper({
  shapeId,
  component,
  children,
}: WireframeComponentWrapperProps) {
  const editor = useEditor();
  const { onFocusAI, onEdit } = useShapeActions();
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    const updateSelection = () => {
      const selectedShapes = editor.getSelectedShapeIds();
      setIsSelected(selectedShapes.includes(shapeId));
    };

    // Initial check
    updateSelection();

    // Listen for selection changes
    const dispose = editor.store.listen(
      () => {
        updateSelection();
      },
      { source: "user", scope: "all" }
    );

    return () => {
      dispose();
    };
  }, [editor, shapeId]);

  const handleFocusAI = () => {
    onFocusAI(shapeId);
  };

  const handleEdit = () => {
    onEdit(shapeId);
  };

  const handleDuplicate = () => {
    editor.duplicateShapes([shapeId]);
  };

  const handleDelete = () => {
    editor.deleteShapes([shapeId]);
  };

  const fidelity = component.fidelity || 1;

  return (
    <div className="relative w-full h-full">
      {/* Selection Toolbar */}
      {isSelected && (
        <SelectionToolbar
          fidelity={fidelity}
          onFocusAI={handleFocusAI}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
      )}

      {/* Selected State Visual Enhancement */}
      {isSelected && (
        <div
          className="absolute inset-0 border-2 border-indigo-500 rounded pointer-events-none -z-10"
          style={{
            boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.1)",
          }}
        />
      )}

      {/* Component Content */}
      {children}
    </div>
  );
}
