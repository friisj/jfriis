import React, { useState, useEffect } from 'react';

interface ColorPickerProps {
  label: string;
  value: number; // Three.js hex color (e.g., 0xFF6B6B)
  onChange: (value: number) => void;
}

/**
 * ColorPicker - Hex color input for theme colors.
 *
 * Features:
 * - Converts between Three.js hex (number) and CSS hex (string)
 * - Visual color preview
 * - Hex input field for precise control
 * - Validation to ensure valid hex colors
 */
export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  // Convert Three.js hex number to CSS hex string
  const numberToHex = (num: number): string => {
    return '#' + num.toString(16).padStart(6, '0').toUpperCase();
  };

  // Convert CSS hex string to Three.js hex number
  const hexToNumber = (hex: string): number => {
    const cleaned = hex.replace('#', '');
    return parseInt(cleaned, 16);
  };

  const [hexString, setHexString] = useState(numberToHex(value));

  // Update local state when prop changes (external update)
  useEffect(() => {
    setHexString(numberToHex(value));
  }, [value]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setHexString(input);

    // Validate and convert on every keystroke
    if (/^#[0-9A-Fa-f]{6}$/.test(input)) {
      onChange(hexToNumber(input));
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setHexString(hex);
    onChange(hexToNumber(hex));
  };

  const handleBlur = () => {
    // Ensure valid hex on blur
    if (!/^#[0-9A-Fa-f]{6}$/.test(hexString)) {
      setHexString(numberToHex(value)); // Reset to last valid value
    }
  };

  return (
    <div className="mb-4">
      <label className="text-sm font-medium text-gray-200 block mb-1">
        {label}
      </label>
      <div className="flex gap-2 items-center">
        {/* Visual color preview with picker */}
        <input
          type="color"
          value={hexString}
          onChange={handleColorPickerChange}
          className="w-12 h-10 border-2 border-gray-600 rounded cursor-pointer bg-transparent"
          title="Pick color"
        />
        {/* Hex input field */}
        <input
          type="text"
          value={hexString}
          onChange={handleHexChange}
          onBlur={handleBlur}
          placeholder="#RRGGBB"
          maxLength={7}
          className="flex-1 px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded text-gray-200 font-mono focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
