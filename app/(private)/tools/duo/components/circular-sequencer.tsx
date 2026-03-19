'use client';

import { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { DuoStep } from '@/lib/duo/types';

interface CircularSequencerProps {
  steps: DuoStep[];
  currentStep: number;
  playing: boolean;
  inputStep: number;
  onToggleStep: (index: number) => void;
  onSelectStep: (index: number) => void;
  onPlay: () => void;
  onStop: () => void;
  onRandomize: () => void;
  onBoostDown: () => void;
  onBoostUp: () => void;
}

const RADIUS = 85;
const LED_RADIUS = 16;
const CENTER_R = 20;
const SIDE_R = 14;
const SIDE_OFFSET = 32; // horizontal offset from center for side buttons

function stepPosition(index: number, total: number) {
  // Start from top (-90°), go clockwise
  const angle = ((index / total) * 360 - 90) * (Math.PI / 180);
  return {
    x: RADIUS * Math.cos(angle),
    y: RADIUS * Math.sin(angle),
  };
}

export function CircularSequencer({
  steps,
  currentStep,
  playing,
  inputStep,
  onToggleStep,
  onSelectStep,
  onPlay,
  onStop,
  onRandomize,
  onBoostDown,
  onBoostUp,
}: CircularSequencerProps) {
  const size = (RADIUS + LED_RADIUS + 8) * 2;
  const center = size / 2;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const handlePointerDown = useCallback((i: number) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      onToggleStep(i);
    }, 300);
  }, [onToggleStep]);

  const handlePointerUp = useCallback((i: number) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!longPressTriggered.current) {
      onSelectStep(i);
    }
  }, [onSelectStep]);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <div className="space-y-1.5">
      <div className="w-full max-w-sm mx-auto">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto overflow-visible">
          {/* Connection ring */}
          <circle
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            className="text-zinc-800"
            strokeWidth={1}
          />

          {/* Step LEDs */}
          {steps.map((step, i) => {
            const pos = stepPosition(i, steps.length);
            const isCurrent = playing && i === currentStep;
            const isInput = !playing && i === inputStep;
            const hasNote = step.note !== null;

            return (
              <g key={i} transform={`translate(${center + pos.x}, ${center + pos.y})`}>
                {/* Input cursor ring (shown when not playing) */}
                {isInput && (
                  <circle
                    r={LED_RADIUS + 3}
                    fill="none"
                    stroke="currentColor"
                    className="text-purple-400"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                )}
                <circle
                  r={LED_RADIUS}
                  className={cn(
                    'cursor-pointer transition-colors duration-75',
                    !step.active
                      ? 'fill-zinc-800 stroke-zinc-700'
                      : isCurrent
                        ? 'fill-amber-400 stroke-amber-300'
                        : isInput
                          ? hasNote
                            ? 'fill-purple-700 stroke-purple-500'
                            : 'fill-purple-900 stroke-purple-600'
                          : hasNote
                            ? 'fill-zinc-600 stroke-zinc-500'
                            : 'fill-zinc-800 stroke-zinc-700',
                  )}
                  strokeWidth={1.5}
                  onPointerDown={() => handlePointerDown(i)}
                  onPointerUp={() => handlePointerUp(i)}
                  onPointerCancel={handlePointerCancel}
                  onPointerLeave={handlePointerCancel}
                  role="button"
                  aria-label={`Step ${i + 1}: ${step.note ?? 'empty'}${isInput ? ' (input target)' : ''}${!step.active ? ' (muted)' : ''}`}
                  aria-pressed={step.active}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectStep(i);
                    } else if (e.key === 'Backspace' || e.key === 'Delete') {
                      e.preventDefault();
                      onToggleStep(i);
                    }
                  }}
                />
                {/* Step number or note */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn(
                    'text-[10px] font-mono pointer-events-none select-none',
                    isCurrent ? 'fill-zinc-900' : !step.active ? 'fill-zinc-600' : isInput ? 'fill-purple-200' : 'fill-zinc-300',
                  )}
                >
                  {hasNote ? step.note?.replace(/\d+$/, '') : i + 1}
                </text>
              </g>
            );
          })}

          {/* Random button (left of center) */}
          <g
            className="cursor-pointer"
            onClick={onRandomize}
            role="button"
            aria-label="Randomize sequence"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRandomize();
              }
            }}
          >
            <circle cx={center - SIDE_OFFSET} cy={center} r={SIDE_R} className="fill-purple-900/80 stroke-purple-600/60" strokeWidth={1} />
            {/* Dice icon — two dots */}
            <circle cx={center - SIDE_OFFSET - 3} cy={center - 3} r={1.5} className="fill-purple-300" />
            <circle cx={center - SIDE_OFFSET + 3} cy={center + 3} r={1.5} className="fill-purple-300" />
          </g>

          {/* Center play/stop button */}
          <g
            className="cursor-pointer"
            onClick={playing ? onStop : onPlay}
            role="button"
            aria-label={playing ? 'Stop' : 'Play'}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                playing ? onStop() : onPlay();
              }
            }}
          >
            <circle cx={center} cy={center} r={CENTER_R} className="fill-zinc-800 stroke-zinc-600" strokeWidth={1.5} />
            {playing ? (
              // Stop icon (square)
              <rect
                x={center - 6}
                y={center - 6}
                width={12}
                height={12}
                rx={1}
                className="fill-amber-400"
              />
            ) : (
              // Play icon (triangle)
              <polygon
                points={`${center - 5},${center - 7} ${center - 5},${center + 7} ${center + 7},${center}`}
                className="fill-zinc-400"
              />
            )}
          </g>

          {/* Boost button (right of center) — hold to 2x speed */}
          <g
            className="cursor-pointer select-none"
            onPointerDown={onBoostDown}
            onPointerUp={onBoostUp}
            onPointerLeave={onBoostUp}
            role="button"
            aria-label="Hold to boost tempo 2x"
            tabIndex={0}
          >
            <circle cx={center + SIDE_OFFSET} cy={center} r={SIDE_R} className="fill-amber-900/80 stroke-amber-600/60" strokeWidth={1} />
            {/* Lightning bolt icon */}
            <path
              d={`M ${center + SIDE_OFFSET - 2} ${center - 6} L ${center + SIDE_OFFSET - 4} ${center + 1} L ${center + SIDE_OFFSET} ${center - 1} L ${center + SIDE_OFFSET + 2} ${center + 6} L ${center + SIDE_OFFSET + 4} ${center - 1} L ${center + SIDE_OFFSET} ${center + 1} Z`}
              className="fill-amber-400"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
