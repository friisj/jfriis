'use client';

import { useId } from 'react';
import { KnobHeadless } from 'react-knob-headless';

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

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToXY(cx, cy, r, startDeg);
  const end = polarToXY(cx, cy, r, endDeg);
  const sweep = endDeg - startDeg;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
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
  size = 48,
}: EffectKnobProps) {
  const id = useId();
  const norm = (mapTo01 ?? defaultMapTo01)(value, min, max);
  const endAngle = START_ANGLE + norm * SWEEP;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  const trackPath = describeArc(cx, cy, r, START_ANGLE, START_ANGLE + SWEEP);
  const valuePath = norm > 0.003 ? describeArc(cx, cy, r, START_ANGLE, endAngle) : '';
  const dot = polarToXY(cx, cy, r, endAngle);

  const roundFn = (v: number) => {
    const rounded = Math.round(v / step) * step;
    return Math.min(max, Math.max(min, Number(rounded.toFixed(10))));
  };

  return (
    <div className="flex flex-col items-center gap-0.5 w-14">
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
        className="relative cursor-grab active:cursor-grabbing touch-none"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="overflow-visible">
          {/* Background arc */}
          <path
            d={trackPath}
            fill="none"
            stroke="currentColor"
            className="text-muted-foreground/20"
            strokeWidth={3}
            strokeLinecap="round"
          />
          {/* Value arc */}
          {valuePath && (
            <path
              d={valuePath}
              fill="none"
              stroke="currentColor"
              className="text-foreground"
              strokeWidth={3}
              strokeLinecap="round"
            />
          )}
          {/* Indicator dot */}
          <circle
            cx={dot.x}
            cy={dot.y}
            r={2.5}
            fill="currentColor"
            className="text-foreground"
          />
        </svg>
      </KnobHeadless>
      <span className="text-[10px] font-mono text-muted-foreground leading-tight">
        {displayFn(value)}
      </span>
    </div>
  );
}
