'use client';

import { DrumSequencer } from './drum-sequencer';
import { DuoKnob } from './knob';
import type { DuoDrumState } from '@/lib/duo/types';
import {
  IconMusic,
  IconClock,
  IconVolume,
  IconSparkles,
} from '@tabler/icons-react';

const VOICE_COLORS = ['#f43f5e', '#38bdf8', '#34d399', '#fbbf24'];

interface DrumPanelProps {
  drum: DuoDrumState;
  currentStep: number;
  playing: boolean;
  muted: boolean;
  onToggleStep: (voiceIndex: number, step: number) => void;
  onTriggerVoice: (voiceIndex: number) => void;
  onRetrigger: (voiceIndex: number | null, substep: boolean) => void;
  onSetRecipe: (voiceIndex: number, recipeIndex: number) => void;
  onSetPitch: (voiceIndex: number, pitch: number) => void;
  onSetDecay: (voiceIndex: number, decay: number) => void;
  onSetVolume: (voiceIndex: number, volume: number) => void;
  onSetCrush: (value: number) => void;
  onSetFilter: (value: number) => void;
  onToggleMute: () => void;
  onRandomize: () => void;
  onRandomOffset: () => void;
  onRandomFlip: () => void;
}

function Section({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex justify-between relative flex-1 min-h-0">
      <div className="flex flex-col items-center justify-start w-8 gap-2 pt-2 select-none">
        <div className="text-zinc-500">{icon}</div>
        <div className="rotate-90 size-2.5 flex items-center">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider whitespace-nowrap">{label}</span>
        </div>
      </div>
      <div className="flex items-center justify-start gap-2 flex-wrap py-2 px-2">{children}</div>
    </div>
  );
}

export function DrumPanel({
  drum,
  currentStep,
  playing,
  muted,
  onToggleStep,
  onTriggerVoice,
  onRetrigger,
  onSetRecipe,
  onSetPitch,
  onSetDecay,
  onSetVolume,
  onSetCrush,
  onSetFilter,
  onToggleMute,
  onRandomize,
  onRandomOffset,
  onRandomFlip,
}: DrumPanelProps) {
  return (
    <div className="flex flex-col divide-y divide-zinc-800 h-full">
      {/* Knob sections */}
      <Section label="Pitch" icon={<IconMusic size={16} stroke={1} />}>
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
      </Section>

      <Section label="Decay" icon={<IconClock size={16} stroke={1} />}>
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
      </Section>

      <Section label="Level" icon={<IconVolume size={16} stroke={1} />}>
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
      </Section>

      <Section label="Effects" icon={<IconSparkles size={16} stroke={1} />}>
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
      </Section>

      {/* Drum sequencer + voice pads at bottom */}
      <div className="flex-[2] min-h-0 flex flex-col items-center justify-center p-2 gap-2">
        <DrumSequencer
          voices={drum.voices}
          currentStep={currentStep}
          playing={playing}
          muted={muted}
          onToggleStep={onToggleStep}
          onTriggerVoice={onTriggerVoice}
          onRetrigger={onRetrigger}
          onSetRecipe={onSetRecipe}
          onToggleMute={onToggleMute}
          onRandomize={onRandomize}
          onRandomOffset={onRandomOffset}
          onRandomFlip={onRandomFlip}
        />
      </div>
    </div>
  );
}
