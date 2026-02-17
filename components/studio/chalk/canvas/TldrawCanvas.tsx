"use client";

import { Tldraw, Editor, TLRecord, TLStoreSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import { useEffect, useRef, useCallback } from "react";
import {
  ButtonShapeUtil,
  InputShapeUtil,
  ContainerShapeUtil,
  FormShapeUtil,
} from "@/lib/studio/chalk/tldraw/shapes";

const customShapeUtils = [
  ButtonShapeUtil,
  InputShapeUtil,
  ContainerShapeUtil,
  FormShapeUtil,
];

interface TldrawCanvasProps {
  boardId: string;
  userId: string;
  initialSnapshot?: TLStoreSnapshot;
  initialViewport?: { x: number; y: number; zoom: number };
  onMount?: (editor: Editor) => void;
}

export function TldrawCanvas({
  boardId,
  userId,
  initialSnapshot,
  initialViewport,
  onMount,
}: TldrawCanvasProps) {
  const editorRef = useRef<Editor | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedSnapshotRef = useRef<string>("");

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      // Call parent onMount callback
      onMount?.(editor);

      // Load initial snapshot if provided
      if (initialSnapshot && Object.keys(initialSnapshot).length > 0) {
        try {
          editor.loadSnapshot(initialSnapshot);
        } catch (error) {
          console.error("Failed to load initial snapshot:", error);
        }
      }

      // Set initial viewport if provided
      if (initialViewport) {
        editor.setCamera({
          x: initialViewport.x,
          y: initialViewport.y,
          z: initialViewport.zoom,
        });
      }

      // Set up auto-save listener
      const handleChange = () => {
        // Debounce saves to avoid too many requests
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
          const snapshot = editor.getSnapshot();
          const snapshotString = JSON.stringify(snapshot);

          // Only save if content has changed
          if (snapshotString !== lastSavedSnapshotRef.current) {
            lastSavedSnapshotRef.current = snapshotString;

            const camera = editor.getCamera();
            const viewport = {
              x: camera.x,
              y: camera.y,
              zoom: camera.z,
            };

            try {
              console.log("Saving board...", { boardId, snapshotSize: snapshotString.length });
              const response = await fetch("/apps/chalk/api/save-board", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  boardId,
                  snapshot,
                  viewport,
                }),
              });
              const result = await response.json();
              console.log("Save result:", result);
            } catch (error) {
              console.error("Failed to save board:", error);
            }
          }
        }, 1000); // Save 1 second after last change
      };

      // Listen to store changes
      const dispose = editor.store.listen(handleChange, {
        source: "user",
        scope: "all",
      });

      return () => {
        dispose();
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    },
    [boardId, initialSnapshot, initialViewport, onMount]
  );

  return (
    <div className="w-full h-full">
      <Tldraw shapeUtils={customShapeUtils} onMount={handleMount} />
    </div>
  );
}
