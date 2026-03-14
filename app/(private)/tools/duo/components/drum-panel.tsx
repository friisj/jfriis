'use client';

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
  onSetPitch: (voiceIndex: number, pitch: number) => void;
  onSetDecay: (voiceIndex: number, decay: number) => void;
  onSetVolume: (voiceIndex: number, volume: number) => void;
  onRandomize: () => void;
}

export function DrumPanel({
  drum,
  currentStep,
  playing,
  onToggleStep,
  onTriggerVoice,
  onSetPitch,
  onSetDecay,
  onSetVolume,
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

      {/* Random button */}
      <div className="flex justify-center">
        <button
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
