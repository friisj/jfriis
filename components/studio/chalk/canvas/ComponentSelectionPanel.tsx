"use client";

import { IconInfoCircle, IconFocusCentered } from "@tabler/icons-react";

interface ComponentSelectionPanelProps {
  selectedComponent: {
    id: string;
    type: string;
    props: any;
    createdAt?: number;
  } | null;
  onFocusAI: () => void;
  onNotesChange?: (notes: string) => void;
  notes?: string;
}

export function ComponentSelectionPanel({
  selectedComponent,
  onFocusAI,
  onNotesChange,
  notes = "",
}: ComponentSelectionPanelProps) {
  if (!selectedComponent) {
    return (
      <div className="p-4 bg-white border-l border-gray-200">
        <div className="text-center text-gray-400 mt-8">
          <IconInfoCircle size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Select a component to view details</p>
        </div>
      </div>
    );
  }

  const formatComponentType = (type: string) => {
    // Remove "wireframe:" prefix if present
    return type.replace("wireframe:", "").replace("-", " ");
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <IconInfoCircle size={20} />
          Component Details
        </h2>
      </div>

      {/* Component IconInfoCircle */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Basic IconInfoCircle */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Type
          </label>
          <p className="text-sm font-medium capitalize mt-1">
            {formatComponentType(selectedComponent.type)}
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            ID
          </label>
          <p className="text-xs font-mono mt-1 text-gray-600">
            {selectedComponent.id}
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Created
          </label>
          <p className="text-sm mt-1">
            {formatDate(selectedComponent.createdAt)}
          </p>
        </div>

        {/* Fidelity */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Fidelity Level
          </label>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: "20%" }}
              />
            </div>
            <span className="text-sm font-medium">1</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Sketch (lo-fi)</p>
        </div>

        {/* Properties */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
            Properties
          </label>
          <div className="bg-gray-50 rounded p-3 space-y-2">
            {Object.entries(selectedComponent.props || {}).map(
              ([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="font-medium text-gray-600">{key}:</span>
                  <span className="text-gray-900 font-mono">
                    {typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange?.(e.target.value)}
            placeholder="Add notes about this component..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>
      </div>

      {/* Focus AI Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onFocusAI}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium text-sm flex items-center justify-center gap-2"
        >
          <IconFocusCentered size={16} />
          Focus AI on This Component
        </button>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Switch chat context to this element
        </p>
      </div>
    </div>
  );
}
