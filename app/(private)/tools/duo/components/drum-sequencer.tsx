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

const RING_RADII = [140, 112, 84, 56];
const DOT_RADIUS = 11;
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

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
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
                r={DOT_RADIUS - vi * 0.5}
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
      </svg>

      {/* Trigger pads — 4-column row below rings */}
      <div className="flex gap-2">
        {voices.map((voice, i) => (
          <button
            key={`pad-${i}`}
            type="button"
            onClick={() => onTriggerVoice(i)}
            className="w-12 h-12 rounded-lg text-[10px] font-mono font-medium
                       border transition-colors active:scale-95 active:brightness-125
                       focus-visible:ring-2 focus-visible:ring-amber-400/50 outline-none
                       touch-none select-none"
            style={{
              backgroundColor: VOICE_COLORS_DIM[i],
              borderColor: VOICE_COLORS[i],
              color: VOICE_COLORS[i],
            }}
            aria-label={`Trigger ${voice.name}`}
          >
            {voice.name}
          </button>
        ))}
      </div>
    </div>
  );
}
