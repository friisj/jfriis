'use client';

import { useId, useCallback } from 'react';
import { KnobHeadless, useKnobKeyboardControls } from 'react-knob-headless';

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
  size = 36,
}: EffectKnobProps) {
  const id = useId();
  const norm = (mapTo01 ?? defaultMapTo01)(value, min, max);
  const endAngle = START_ANGLE + norm * SWEEP;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR - 5;

  const trackPath = describeArc(cx, cy, outerR, START_ANGLE, START_ANGLE + SWEEP);
  const valuePath = norm > 0.003 ? describeArc(cx, cy, outerR, START_ANGLE, endAngle) : '';

  // Indicator line from inner edge to outer edge at current angle
  const lineInner = polarToXY(cx, cy, innerR - 1, endAngle);
  const lineOuter = polarToXY(cx, cy, outerR, endAngle);

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
        className="relative cursor-grab active:cursor-grabbing touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        style={{ width: size, height: size }}
        onKeyDown={keyboardControls.onKeyDown}
      >
        <svg width={size} height={size}>
          {/* Filled center disc — grip affordance */}
          <circle cx={cx} cy={cy} r={innerR} fill="currentColor" className="text-muted/60" />
          {/* Background arc */}
          <path
            d={trackPath}
            fill="none"
            stroke="currentColor"
            className="text-muted-foreground/25"
            strokeWidth={5}
            strokeLinecap="round"
          />
          {/* Value arc */}
          {valuePath && (
            <path
              d={valuePath}
              fill="none"
              stroke="currentColor"
              className="text-foreground"
              strokeWidth={5}
              strokeLinecap="round"
            />
          )}
          {/* Indicator line */}
          <line
            x1={lineInner.x}
            y1={lineInner.y}
            x2={lineOuter.x}
            y2={lineOuter.y}
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
