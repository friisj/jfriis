import React, { useState, useEffect } from 'react';

interface NumberSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  hint?: string; // Valid range or usage hint
}

/**
 * NumberSlider - Combined slider and number input for numeric theme parameters.
 *
 * Features:
 * - Slider for visual adjustment
 * - Number input for precise values
 * - Range hints from JSDoc comments
 * - Debounced updates to avoid excessive re-renders
 */
export function NumberSlider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  hint,
}: NumberSliderProps) {
  const [localValue, setLocalValue] = useState(value);

  // Update local value when prop changes (external update)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      setLocalValue(newValue);
      onChange(Math.max(min, Math.min(max, newValue))); // Clamp to range
    }
  };

  const handleInputBlur = () => {
    // Ensure value is within range on blur
    const clampedValue = Math.max(min, Math.min(max, localValue));
    if (clampedValue !== localValue) {
      setLocalValue(clampedValue);
      onChange(clampedValue);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-medium text-gray-200">{label}</label>
        <input
          type="number"
          value={localValue.toFixed(3)}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          min={min}
          max={max}
          step={step}
          className="w-20 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200 focus:outline-none focus:border-blue-500"
        />
      </div>
      <input
        type="range"
        value={localValue}
        onChange={handleSliderChange}
        min={min}
        max={max}
        step={step}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      {hint && (
        <div className="text-xs text-gray-400 mt-1">Range: {hint}</div>
      )}
    </div>
  );
}
