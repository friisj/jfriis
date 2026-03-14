'use client';

import { DrumSequencer } from './drum-sequencer';
import { DuoKnob } from './knob';
import type { DuoDrumState } from '@/lib/duo/types';
import { DRUM_RECIPES } from '@/lib/duo/drum-voices';

const VOICE_COLORS = ['#f43f5e', '#38bdf8', '#34d399', '#fbbf24'];

interface DrumPanelProps {
  drum: DuoDrumState;
  currentStep: number;
  playing: boolean;
  onToggleStep: (voiceIndex: number, step: number) => void;
  onTriggerVoice: (voiceIndex: number) => void;
  onSetRecipe: (voiceIndex: number, recipeIndex: number) => void;
  onSetPitch: (voiceIndex: number, pitch: number) => void;
  onSetDecay: (voiceIndex: number, decay: number) => void;
  onSetVolume: (voiceIndex: number, volume: number) => void;
  onSetCrush: (value: number) => void;
  onSetFilter: (value: number) => void;
  onRandomize: () => void;
}

export function DrumPanel({
  drum,
  currentStep,
  playing,
  onToggleStep,
  onTriggerVoice,
  onSetRecipe,
  onSetPitch,
  onSetDecay,
  onSetVolume,
  onSetCrush,
  onSetFilter,
  onRandomize,
}: DrumPanelProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <DrumSequencer
        voices={drum.voices}
        currentStep={currentStep}
        playing={playing}
        onToggleStep={onToggleStep}
        onTriggerVoice={onTriggerVoice}
      />

      {/* Voice selector — per-voice recipe picker */}
      <div className="space-y-2">
        <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider">Voice</h3>
        <div className="flex flex-col gap-1">
          {drum.voices.map((voice, i) => {
            const recipes = DRUM_RECIPES[i];
            const currentRecipe = recipes[voice.recipeIndex];
            return (
              <div key={`recipe-${i}`} className="flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => onSetRecipe(i, (voice.recipeIndex - 1 + recipes.length) % recipes.length)}
                  className="w-8 h-8 flex items-center justify-center rounded text-xs
                             bg-zinc-800 hover:bg-zinc-700 transition-colors
                             focus-visible:ring-2 focus-visible:ring-amber-400/50 outline-none"
                  style={{ color: VOICE_COLORS[i] }}
                  aria-label={`Previous ${voice.name} recipe`}
                >
                  ‹
                </button>
                <span
                  className="text-[11px] font-mono w-20 text-center truncate"
                  style={{ color: VOICE_COLORS[i] }}
                >
                  {currentRecipe?.name ?? 'Classic'}
                </span>
                <button
                  type="button"
                  onClick={() => onSetRecipe(i, (voice.recipeIndex + 1) % recipes.length)}
                  className="w-8 h-8 flex items-center justify-center rounded text-xs
                             bg-zinc-800 hover:bg-zinc-700 transition-colors
                             focus-visible:ring-2 focus-visible:ring-amber-400/50 outline-none"
                  style={{ color: VOICE_COLORS[i] }}
                  aria-label={`Next ${voice.name} recipe`}
                >
                  ›
                </button>
              </div>
            );
          })}
        </div>
      </div>

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

      {/* Random button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onRandomize}
          className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-400
                     bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700
                     transition-colors"
          aria-label="Randomize drum pattern"
        >
          Random
        </button>
      </div>
    </div>
  );
}
