"use client";

import { createContext, useContext } from "react";
import { TLShapeId } from "tldraw";

export interface ShapeActions {
  onFocusAI: (shapeId: TLShapeId) => void;
  onEdit: (shapeId: TLShapeId) => void;
}

const ShapeActionsContext = createContext<ShapeActions | null>(null);

export function ShapeActionsProvider({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions: ShapeActions;
}) {
  return (
    <ShapeActionsContext.Provider value={actions}>
      {children}
    </ShapeActionsContext.Provider>
  );
}

export function useShapeActions(): ShapeActions {
  const context = useContext(ShapeActionsContext);
  if (!context) {
    // Return no-op functions if context not available
    return {
      onFocusAI: () => {},
      onEdit: () => {},
    };
  }
  return context;
}
