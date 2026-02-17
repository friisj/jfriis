import React, { useState, useEffect } from 'react';

interface Vector3InputProps {
  label: string;
  value: { x: number; y: number; z: number };
  onChange: (value: { x: number; y: number; z: number }) => void;
  step?: number;
}

/**
 * Vector3Input - Three-field input for 3D position vectors.
 *
 * Features:
 * - Separate inputs for X, Y, Z components
 * - Labeled axes for clarity
 * - Compact layout
 * - Validation and clamping
 */
export function Vector3Input({
  label,
  value,
  onChange,
  step = 0.1,
}: Vector3InputProps) {
  const [localValue, setLocalValue] = useState(value);

  // Update local value when prop changes (external update)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (axis: 'x' | 'y' | 'z', newValue: number) => {
    const updated = { ...localValue, [axis]: newValue };
    setLocalValue(updated);
    onChange(updated);
  };

  const handleInputChange = (axis: 'x' | 'y' | 'z') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      handleChange(axis, newValue);
    }
  };

  return (
    <div className="mb-4">
      <label className="text-sm font-medium text-gray-200 block mb-2">
        {label}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {/* X axis */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">X</label>
          <input
            type="number"
            value={localValue.x.toFixed(2)}
            onChange={handleInputChange('x')}
            step={step}
            className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-gray-200 focus:outline-none focus:border-blue-500"
          />
        </div>
        {/* Y axis */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Y</label>
          <input
            type="number"
            value={localValue.y.toFixed(2)}
            onChange={handleInputChange('y')}
            step={step}
            className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-gray-200 focus:outline-none focus:border-blue-500"
          />
        </div>
        {/* Z axis */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Z</label>
          <input
            type="number"
            value={localValue.z.toFixed(2)}
            onChange={handleInputChange('z')}
            step={step}
            className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-gray-200 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
