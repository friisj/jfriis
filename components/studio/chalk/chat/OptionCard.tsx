"use client";

import type { WireframeOption } from "@/lib/studio/chalk/types/chat";
import { ComponentRenderer } from "@/components/studio/chalk/wireframe/WireframeRenderer";

interface OptionCardProps {
  option: WireframeOption;
  onSelect: (option: WireframeOption) => void;
  selected?: boolean;
}

export function OptionCard({ option, onSelect, selected }: OptionCardProps) {
  return (
    <div
      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
        selected
          ? "border-blue-600 bg-blue-50"
          : "border-gray-300 hover:border-gray-400 bg-white"
      }`}
      onClick={() => onSelect(option)}
    >
      {/* Title */}
      <h4 className="font-semibold text-sm mb-2">{option.title}</h4>

      {/* Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-3 min-h-[200px] flex items-center justify-center">
        <div className="scale-75 origin-center">
          {option.wireframe.components.map((component, index) => (
            <ComponentRenderer key={index} component={component} />
          ))}
        </div>
      </div>

      {/* Rationale */}
      <p className="text-xs text-gray-700 mb-2">{option.rationale}</p>

      {/* Principles */}
      {option.principles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {option.principles.map((principle, index) => (
            <span
              key={index}
              className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded"
            >
              {principle}
            </span>
          ))}
        </div>
      )}

      {/* Select Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(option);
        }}
        className={`mt-3 w-full py-2 rounded text-sm font-medium transition-colors ${
          selected
            ? "bg-blue-600 text-white"
            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
        }`}
      >
        {selected ? "Selected" : "Add to Canvas"}
      </button>
    </div>
  );
}
