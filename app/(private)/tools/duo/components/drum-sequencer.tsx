'use client';

import { useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { DuoDrumVoice } from '@/lib/duo/types';
import { DRUM_RECIPES } from '@/lib/duo/drum-voices';

interface DrumSequencerProps {
  voices: DuoDrumVoice[];
  currentStep: number;
  playing: boolean;
  onToggleStep: (voiceIndex: number, step: number) => void;
  onTriggerVoice: (voiceIndex: number) => void;
  onRetrigger: (voiceIndex: number | null, substep: boolean) => void;
  onSetRecipe: (voiceIndex: number, recipeIndex: number) => void;
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
  onRetrigger,
  onSetRecipe,
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

      {/* Trigger pads with integrated voice selector */}
      <div className="flex gap-2">
        {voices.map((voice, i) => (
          <VoicePad
            key={`pad-${i}`}
            voiceIndex={i}
            voice={voice}
            onTrigger={onTriggerVoice}
            onRetrigger={onRetrigger}
            onSetRecipe={onSetRecipe}
          />
        ))}
      </div>
    </div>
  );
}

/** Pad with recipe name, prev/next arrows, trigger on press, retrigger on hold */
function VoicePad({
  voiceIndex,
  voice,
  onTrigger,
  onRetrigger,
  onSetRecipe,
}: {
  voiceIndex: number;
  voice: DuoDrumVoice;
  onTrigger: (voiceIndex: number) => void;
  onRetrigger: (voiceIndex: number | null, substep: boolean) => void;
  onSetRecipe: (voiceIndex: number, recipeIndex: number) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdingRef = useRef(false);
  const recipes = DRUM_RECIPES[voiceIndex];
  const recipeName = recipes[voice.recipeIndex]?.name ?? 'Classic';

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handlePointerDown = useCallback(() => {
    holdingRef.current = true;
    onTrigger(voiceIndex);
    onRetrigger(voiceIndex, false);
    timerRef.current = setTimeout(() => {
      if (holdingRef.current) {
        onRetrigger(voiceIndex, true);
      }
    }, 300);
  }, [voiceIndex, onTrigger, onRetrigger]);

  const handlePointerUp = useCallback(() => {
    holdingRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onRetrigger(null, false);
  }, [onRetrigger]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const prevRecipe = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSetRecipe(voiceIndex, (voice.recipeIndex - 1 + recipes.length) % recipes.length);
  }, [voiceIndex, voice.recipeIndex, recipes.length, onSetRecipe]);

  const nextRecipe = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSetRecipe(voiceIndex, (voice.recipeIndex + 1) % recipes.length);
  }, [voiceIndex, voice.recipeIndex, recipes.length, onSetRecipe]);

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={prevRecipe}
        className="w-5 h-10 flex items-center justify-center rounded-l text-[10px]
                   bg-zinc-800/60 hover:bg-zinc-700 transition-colors outline-none"
        style={{ color: VOICE_COLORS[voiceIndex] }}
        aria-label={`Previous ${voice.name} recipe`}
      >
        ‹
      </button>
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={handleContextMenu}
        className="h-10 px-2 min-w-[3.5rem] text-[9px] font-mono font-medium
                   border-y transition-colors active:scale-95 active:brightness-125
                   focus-visible:ring-2 focus-visible:ring-amber-400/50 outline-none
                   touch-none select-none flex flex-col items-center justify-center leading-tight"
        style={{
          backgroundColor: VOICE_COLORS_DIM[voiceIndex],
          borderColor: VOICE_COLORS[voiceIndex],
          color: VOICE_COLORS[voiceIndex],
        }}
        aria-label={`Trigger ${voice.name} — ${recipeName} (hold for retrigger)`}
      >
        <span className="text-[8px] opacity-60">{voice.name}</span>
        <span>{recipeName}</span>
      </button>
      <button
        type="button"
        onClick={nextRecipe}
        className="w-5 h-10 flex items-center justify-center rounded-r text-[10px]
                   bg-zinc-800/60 hover:bg-zinc-700 transition-colors outline-none"
        style={{ color: VOICE_COLORS[voiceIndex] }}
        aria-label={`Next ${voice.name} recipe`}
      >
        ›
      </button>
    </div>
  );
}
