'use client';

import { useRef, useCallback, useEffect } from 'react';
import { DrumSequencer } from './drum-sequencer';
import { DuoKnob } from './knob';
import type { DuoDrumState } from '@/lib/duo/types';

const VOICE_COLORS = ['#f43f5e', '#38bdf8', '#34d399', '#fbbf24'];

interface DrumPanelProps {
  drum: DuoDrumState;
  currentStep: number;
  playing: boolean;
  onToggleStep: (voiceIndex: number, step: number) => void;
  onTriggerVoice: (voiceIndex: number) => void;
  onRetrigger: (voiceIndex: number | null, substep: boolean) => void;
  onSetRecipe: (voiceIndex: number, recipeIndex: number) => void;
  onSetPitch: (voiceIndex: number, pitch: number) => void;
  onSetDecay: (voiceIndex: number, decay: number) => void;
  onSetVolume: (voiceIndex: number, volume: number) => void;
  onSetCrush: (value: number) => void;
  onSetFilter: (value: number) => void;
  onRandomize: () => void;
  onRandomOffset: () => void;
  onRandomFlip: () => void;
}

export function DrumPanel({
  drum,
  currentStep,
  playing,
  onToggleStep,
  onTriggerVoice,
  onRetrigger,
  onSetRecipe,
  onSetPitch,
  onSetDecay,
  onSetVolume,
  onSetCrush,
  onSetFilter,
  onRandomize,
  onRandomOffset,
  onRandomFlip,
}: DrumPanelProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <DrumSequencer
        voices={drum.voices}
        currentStep={currentStep}
        playing={playing}
        onToggleStep={onToggleStep}
        onTriggerVoice={onTriggerVoice}
        onRetrigger={onRetrigger}
        onSetRecipe={onSetRecipe}
      />

      {/* Per-voice pitch knobs */}
      <div className="space-y-2">
        <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider">Pitch</h3>
        <div className="flex items-start justify-center gap-2">
          {drum.voices.map((voice, i) => (
            <DuoKnob
              key={`pitch-${i}`}
              label={voice.name[0]}
              value={voice.pitch}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => onSetPitch(i, v)}
              displayFn={(v) => `${Math.round(v * 100)}%`}
              color={VOICE_COLORS[i]}
            />
          ))}
        </div>
      </div>

      {/* Per-voice decay knobs */}
      <div className="space-y-2">
        <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider">Decay</h3>
        <div className="flex items-start justify-center gap-2">
          {drum.voices.map((voice, i) => (
            <DuoKnob
              key={`decay-${i}`}
              label={voice.name[0]}
              value={voice.decay}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => onSetDecay(i, v)}
              displayFn={(v) => `${Math.round(v * 500)}ms`}
              color={VOICE_COLORS[i]}
            />
          ))}
        </div>
      </div>

      {/* Per-voice volume knobs */}
      <div className="space-y-2">
        <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider">Level</h3>
        <div className="flex items-start justify-center gap-2">
          {drum.voices.map((voice, i) => (
            <DuoKnob
              key={`vol-${i}`}
              label={voice.name[0]}
              value={voice.volume}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => onSetVolume(i, v)}
              displayFn={(v) => `${Math.round(v * 100)}%`}
              color={VOICE_COLORS[i]}
            />
          ))}
        </div>
      </div>

      {/* Drum effects */}
      <div className="space-y-2">
        <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider">Effects</h3>
        <div className="flex items-start justify-center gap-2">
          <DuoKnob
            label="Crush"
            value={drum.effects.crush}
            min={0}
            max={1}
            step={0.01}
            onChange={onSetCrush}
            displayFn={(v) => v < 0.01 ? 'Off' : `${Math.round(v * 100)}%`}
            color="#a855f7"
          />
          <DuoKnob
            label="Filter"
            value={drum.effects.filterCutoff}
            min={0}
            max={1}
            step={0.01}
            onChange={onSetFilter}
            displayFn={(v) => {
              const freq = 400 * Math.pow(20000 / 400, v);
              return freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : `${Math.round(freq)}`;
            }}
            color="#a855f7"
          />
        </div>
      </div>

      {/* Random buttons — click = offset, long press = flip, full random */}
      <div className="flex justify-center gap-2">
        <RandomButton onOffset={onRandomOffset} onFlip={onRandomFlip} />
        <button
          type="button"
          onClick={onRandomize}
          className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-400
                     bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700
                     transition-colors"
          aria-label="Full randomize drum pattern"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

/** Click = offset shift, long press (300ms) = probability flip */
function RandomButton({ onOffset, onFlip }: { onOffset: () => void; onFlip: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handlePointerDown = useCallback(() => {
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onFlip();
    }, 300);
  }, [onFlip]);

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!firedRef.current) {
      onOffset();
    }
  }, [onOffset]);

  const handlePointerLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-400
                 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700
                 transition-colors select-none touch-none"
      aria-label="Random: click to shift, hold to flip"
    >
      Random
    </button>
  );
}
