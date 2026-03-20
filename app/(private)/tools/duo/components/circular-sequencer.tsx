'use client';

import { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { IconDice5Filled, IconVolume, IconVolumeOff } from '@tabler/icons-react';
import type { DuoStep } from '@/lib/duo/types';

interface CircularSequencerProps {
  steps: DuoStep[];
  currentStep: number;
  playing: boolean;
  muted: boolean;
  inputStep: number;
  onToggleStep: (index: number) => void;
  onSelectStep: (index: number) => void;
  onToggleMute: () => void;
  onRandomize: () => void;
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
  muted,
  inputStep,
  onToggleStep,
  onSelectStep,
  onToggleMute,
  onRandomize,
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
          <g className="cursor-pointer" onClick={onRandomize} role="button" aria-label="Randomize sequence" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRandomize(); } }}>
            <circle cx={center - SIDE_OFFSET} cy={center} r={SIDE_R} className="fill-purple-900/80 stroke-purple-600/60" strokeWidth={1} />
            <foreignObject x={center - SIDE_OFFSET - 8} y={center - 8} width={16} height={16} className="pointer-events-none">
              <IconDice5Filled size={16} className="text-purple-300" />
            </foreignObject>
          </g>

          {/* Center mute toggle */}
          <g
            className="cursor-pointer"
            onClick={onToggleMute}
            role="button"
            aria-label={muted ? 'Unmute synth' : 'Mute synth'}
            aria-pressed={!muted}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleMute();
              }
            }}
          >
            <circle cx={center} cy={center} r={CENTER_R}
              className={muted ? 'fill-zinc-800 stroke-zinc-700' : 'fill-amber-900/60 stroke-amber-500/60'}
              strokeWidth={1.5} />
            <foreignObject x={center - 10} y={center - 10} width={20} height={20} className="pointer-events-none">
              {muted
                ? <IconVolumeOff size={20} className="text-zinc-500" />
                : <IconVolume size={20} className="text-amber-400" />
              }
            </foreignObject>
          </g>

        </svg>
      </div>
    </div>
  );
}
