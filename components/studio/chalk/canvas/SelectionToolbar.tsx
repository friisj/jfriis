"use client";

import { Focus, Pencil, Copy, Trash2 } from "lucide-react";

interface SelectionToolbarProps {
  fidelity: number;
  onFocusAI: () => void;
  onEdit: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export function SelectionToolbar({
  fidelity,
  onFocusAI,
  onEdit,
  onDuplicate,
  onDelete,
}: SelectionToolbarProps) {
  return (
    <div
      className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white border border-gray-300 rounded-lg shadow-lg flex items-center gap-1 p-1 z-50"
      style={{ pointerEvents: "all" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Fidelity Badge */}
      <div className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700 border-r border-gray-300">
        F{fidelity}
      </div>

      {/* Focus AI */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFocusAI();
        }}
        className="p-1.5 hover:bg-indigo-50 rounded transition-colors group"
        title="Focus AI on this component"
      >
        <Focus className="w-4 h-4 text-gray-600 group-hover:text-indigo-600" />
      </button>

      {/* Edit / Annotate */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="p-1.5 hover:bg-blue-50 rounded transition-colors group"
        title="Edit and annotate"
      >
        <Pencil className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
      </button>

      {/* Duplicate */}
      {onDuplicate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors group"
          title="Duplicate"
        >
          <Copy className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
        </button>
      )}

      {/* Delete */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 hover:bg-red-50 rounded transition-colors group border-l border-gray-300"
          title="Delete"
        >
          <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
        </button>
      )}
    </div>
  );
}
