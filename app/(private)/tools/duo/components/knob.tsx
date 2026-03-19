'use client';

import { useId, useCallback } from 'react';
import { KnobHeadless, useKnobKeyboardControls } from 'react-knob-headless';
import { cn } from '@/lib/utils';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  displayFn?: (v: number) => string;
  mapTo01?: (x: number, min: number, max: number) => number;
  mapFrom01?: (x: number, min: number, max: number) => number;
  size?: number;
  color?: string;
}

const SWEEP = 270;
const GAP_DEG = (360 - SWEEP) / 2;
const START_ANGLE = 90 + GAP_DEG;

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function defaultMapTo01(x: number, min: number, max: number) {
  return (x - min) / (max - min);
}

function defaultDisplay(v: number) {
  return v >= 100 ? Math.round(v).toString() : v.toFixed(1);
}

/** Log-scale mapping for frequency knobs */
export function logMapTo01(x: number, min: number, max: number) {
  return Math.log(x / min) / Math.log(max / min);
}

export function logMapFrom01(x: number, min: number, max: number) {
  return min * Math.pow(max / min, x);
}

export function DuoKnob({
  label,
  value,
  min,
  max,
  step,
  onChange,
  displayFn = defaultDisplay,
  mapTo01,
  mapFrom01,
  size = 88,
  color,
}: KnobProps) {
  const id = useId();
  const norm = (mapTo01 ?? defaultMapTo01)(value, min, max);
  const angle = START_ANGLE + norm * SWEEP;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 3;

  const lineStart = polarToXY(cx, cy, r * 0.3, angle);
  const lineEnd = polarToXY(cx, cy, r - 1, angle);

  // Track arc
  const trackR = r + 1;
  const trackStart = polarToXY(cx, cy, trackR, START_ANGLE);
  const trackEnd = polarToXY(cx, cy, trackR, START_ANGLE + SWEEP);
  const activeEnd = polarToXY(cx, cy, trackR, angle);
  const largeArc = norm * SWEEP > 180 ? 1 : 0;
  const trackLargeArc = SWEEP > 180 ? 1 : 0;

  const roundFn = useCallback(
    (v: number) => {
      const rounded = Math.round(v / step) * step;
      return Math.min(max, Math.max(min, Number(rounded.toFixed(10))));
    },
    [step, min, max],
  );

  const keyboardControls = useKnobKeyboardControls({
    valueRaw: value,
    valueMin: min,
    valueMax: max,
    step,
    stepLarger: step * 10,
    onValueRawChange: (v) => onChange(roundFn(v)),
  });

  return (
    <div className="flex flex-col items-center gap-1.5 w-24">
      <span className="text-xs text-zinc-500 uppercase tracking-wider font-mono leading-tight text-center truncate max-w-full">
        {label}
      </span>
      <KnobHeadless
        id={id}
        aria-label={label}
        valueRaw={value}
        valueMin={min}
        valueMax={max}
        dragSensitivity={0.006}
        valueRawRoundFn={roundFn}
        valueRawDisplayFn={displayFn}
        onValueRawChange={onChange}
        mapTo01={mapTo01}
        mapFrom01={mapFrom01}
        includeIntoTabOrder
        className={cn(
          'relative cursor-grab active:cursor-grabbing touch-none rounded-full outline-none',
          'focus-visible:ring-2 focus-visible:ring-amber-400/50',
        )}
        style={{ width: size, height: size }}
        onKeyDown={keyboardControls.onKeyDown}
      >
        <svg width={size} height={size} className="overflow-visible">
          {/* Track arc (background) */}
          <path
            d={`M ${trackStart.x} ${trackStart.y} A ${trackR} ${trackR} 0 ${trackLargeArc} 1 ${trackEnd.x} ${trackEnd.y}`}
            fill="none"
            stroke="currentColor"
            className="text-zinc-700"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {/* Active arc */}
          {norm > 0.01 && (
            <path
              d={`M ${trackStart.x} ${trackStart.y} A ${trackR} ${trackR} 0 ${largeArc} 1 ${activeEnd.x} ${activeEnd.y}`}
              fill="none"
              stroke={color ?? 'currentColor'}
              className={color ? undefined : 'text-amber-400'}
              strokeWidth={2}
              strokeLinecap="round"
            />
          )}
          {/* Knob body */}
          <circle cx={cx} cy={cy} r={r} fill="currentColor" className="text-zinc-800" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" className="text-zinc-600" strokeWidth={1} />
          {/* Indicator line */}
          <line
            x1={lineStart.x}
            y1={lineStart.y}
            x2={lineEnd.x}
            y2={lineEnd.y}
            stroke={color ?? 'currentColor'}
            className={color ? undefined : 'text-zinc-200'}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </KnobHeadless>
      <span className="text-xs font-mono text-zinc-500 leading-tight">{displayFn(value)}</span>
    </div>
  );
}
