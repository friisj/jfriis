'use client';

import { useState } from 'react';
import { BOARD_VARIANTS, VariantName, setVariant } from '@/lib/studio/ludo/three/variants';

interface VariantSelectorProps {
  onVariantChange?: (variantName: VariantName) => void;
}

export function VariantSelector({ onVariantChange }: VariantSelectorProps) {
  const [selectedVariant, setSelectedVariant] = useState<VariantName>('classic');

  const handleVariantChange = (variantName: VariantName) => {
    setSelectedVariant(variantName);
    setVariant(variantName);
    onVariantChange?.(variantName);
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-100 rounded-lg">
      <h3 className="text-sm font-medium text-gray-700">Board Theme</h3>
      <div className="flex gap-2">
        {Object.entries(BOARD_VARIANTS).map(([key, variant]) => (
          <button
            key={key}
            onClick={() => handleVariantChange(key as VariantName)}
            className={`px-3 py-2 text-xs rounded transition-colors ${
              selectedVariant === key
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {variant.theme.name}
          </button>
        ))}
      </div>
      <div className="text-xs text-gray-500">
        Current: {BOARD_VARIANTS[selectedVariant].theme.name}
      </div>
    </div>
  );
}