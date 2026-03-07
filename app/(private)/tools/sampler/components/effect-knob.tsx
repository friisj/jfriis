'use client';

import { useId, useCallback } from 'react';
import { KnobHeadless, useKnobKeyboardControls } from 'react-knob-headless';
import { cn } from '@/lib/utils';

interface EffectKnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  displayFn: (v: number) => string;
  mapTo01?: (x: number, min: number, max: number) => number;
  mapFrom01?: (x: number, min: number, max: number) => number;
  size?: number;
}

const SWEEP = 270;
const GAP_DEG = (360 - SWEEP) / 2;
const START_ANGLE = 90 + GAP_DEG; // 135° (7:30 clock)

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function defaultMapTo01(x: number, min: number, max: number) {
  return (x - min) / (max - min);
}

export function EffectKnob({
  label,
  value,
  min,
  max,
  step,
  onChange,
  displayFn,
  mapTo01,
  mapFrom01,
  size = 36,
}: EffectKnobProps) {
  const id = useId();
  const norm = (mapTo01 ?? defaultMapTo01)(value, min, max);
  const angle = START_ANGLE + norm * SWEEP;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  // Radial indicator line from center to edge
  const lineEnd = polarToXY(cx, cy, r - 1, angle);

  const roundFn = useCallback((v: number) => {
    const rounded = Math.round(v / step) * step;
    return Math.min(max, Math.max(min, Number(rounded.toFixed(10))));
  }, [step, min, max]);

  const keyboardControls = useKnobKeyboardControls({
    valueRaw: value,
    valueMin: min,
    valueMax: max,
    step,
    stepLarger: step * 10,
    onValueRawChange: (v) => onChange(roundFn(v)),
  });

  return (
    <div className="flex flex-col items-center gap-0.5 w-12">
      <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-full">
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
          'focus-visible:ring-2 focus-visible:ring-ring',
          '[&:focus-visible]:shadow-[0_0_0_3px_hsl(var(--ring)/0.4)]',
        )}
        style={{ width: size, height: size }}
        onKeyDown={keyboardControls.onKeyDown}
      >
        <svg width={size} height={size}>
          {/* Filled circle body */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="currentColor"
            className="text-muted-foreground/20"
          />
          {/* Radial indicator line */}
          <line
            x1={cx}
            y1={cy}
            x2={lineEnd.x}
            y2={lineEnd.y}
            stroke="currentColor"
            className="text-foreground"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </KnobHeadless>
      <span className="text-[10px] font-mono text-muted-foreground leading-tight">
        {displayFn(value)}
      </span>
    </div>
  );
}
