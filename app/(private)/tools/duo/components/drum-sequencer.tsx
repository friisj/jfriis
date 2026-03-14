'use client';

import { cn } from '@/lib/utils';
import type { DuoDrumVoice } from '@/lib/duo/types';

interface DrumSequencerProps {
  voices: DuoDrumVoice[];
  currentStep: number;
  playing: boolean;
  onToggleStep: (voiceIndex: number, step: number) => void;
  onTriggerVoice: (voiceIndex: number) => void;
}

const RING_RADII = [80, 62, 44, 26];
const DOT_RADIUS = 8;
const VOICE_COLORS = ['#f43f5e', '#38bdf8', '#34d399', '#fbbf24']; // rose, sky, emerald, amber
const VOICE_COLORS_DIM = ['#4c1420', '#0c3049', '#0c3326', '#422d08'];

function stepPosition(index: number, total: number, radius: number) {
  const angle = ((index / total) * 360 - 90) * (Math.PI / 180);
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
  };
}

export function DrumSequencer({
  voices,
  currentStep,
  playing,
  onToggleStep,
  onTriggerVoice,
}: DrumSequencerProps) {
  const size = (RING_RADII[0] + DOT_RADIUS + 8) * 2;
  const center = size / 2;

  // Center trigger pads — 2×2 layout
  const padSize = 18;
  const padGap = 4;
  const padOffsets = [
    { x: -(padSize + padGap / 2), y: -(padSize + padGap / 2) }, // top-left = kick
    { x: padGap / 2, y: -(padSize + padGap / 2) },              // top-right = snare
    { x: -(padSize + padGap / 2), y: padGap / 2 },              // bottom-left = hat
    { x: padGap / 2, y: padGap / 2 },                           // bottom-right = clap
  ];

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Concentric ring guides */}
        {RING_RADII.map((r, i) => (
          <circle
            key={`ring-${i}`}
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={VOICE_COLORS_DIM[i]}
            strokeWidth={1}
            opacity={0.5}
          />
        ))}

        {/* Step dots — 4 rings × 8 steps */}
        {voices.map((voice, vi) =>
          voice.steps.map((active, si) => {
            const pos = stepPosition(si, voice.steps.length, RING_RADII[vi]);
            const isCurrent = playing && si === currentStep;

            return (
              <circle
                key={`${vi}-${si}`}
                cx={center + pos.x}
                cy={center + pos.y}
                r={DOT_RADIUS - vi * 0.5} // slightly smaller for inner rings
                fill={
                  isCurrent && active
                    ? VOICE_COLORS[vi]
                    : isCurrent
                      ? `${VOICE_COLORS[vi]}66`
                      : active
                        ? `${VOICE_COLORS[vi]}99`
                        : VOICE_COLORS_DIM[vi]
                }
                stroke={isCurrent ? VOICE_COLORS[vi] : 'transparent'}
                strokeWidth={isCurrent ? 1.5 : 0}
                className={cn('cursor-pointer transition-colors duration-75')}
                onClick={() => onToggleStep(vi, si)}
                role="button"
                aria-label={`${voice.name} step ${si + 1}: ${active ? 'on' : 'off'}`}
                aria-pressed={active}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleStep(vi, si);
                  }
                }}
              />
            );
          }),
        )}

        {/* Center trigger pads — 2×2 */}
        {padOffsets.map((offset, i) => (
          <rect
            key={`pad-${i}`}
            x={center + offset.x}
            y={center + offset.y}
            width={padSize}
            height={padSize}
            rx={3}
            fill={VOICE_COLORS_DIM[i]}
            stroke={VOICE_COLORS[i]}
            strokeWidth={1}
            className="cursor-pointer active:opacity-80"
            onClick={() => onTriggerVoice(i)}
            role="button"
            aria-label={`Trigger ${voices[i]?.name ?? `Voice ${i + 1}`}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onTriggerVoice(i);
              }
            }}
          />
        ))}

        {/* Pad labels */}
        {padOffsets.map((offset, i) => (
          <text
            key={`label-${i}`}
            x={center + offset.x + padSize / 2}
            y={center + offset.y + padSize / 2}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-[7px] font-mono fill-zinc-400 pointer-events-none select-none"
          >
            {voices[i]?.name?.[0] ?? ''}
          </text>
        ))}
      </svg>
    </div>
  );
}
