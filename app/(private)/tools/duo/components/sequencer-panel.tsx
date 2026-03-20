'use client';

import { PentatonicKeyboard } from './pentatonic-keyboard';
import { CircularSequencer } from './circular-sequencer';
import { DuoKnob } from './knob';
import type { DuoSequencerState } from '@/lib/duo/types';

interface SequencerPanelProps {
  state: DuoSequencerState;
  muted: boolean;
  inputStep: number;
  onNotePress: (note: string) => void;
  onToggleStep: (index: number) => void;
  onSelectStep: (index: number) => void;
  onToggleMute: () => void;
  onBpmChange: (bpm: number) => void;
  onNoteLengthChange: (length: number) => void;
  onSwingChange: (swing: number) => void;
  onTranspose: (delta: number) => void;
  onRandomize: () => void;
}

export function SequencerPanel({
  state,
  muted,
  inputStep,
  onNotePress,
  onToggleStep,
  onSelectStep,
  onToggleMute,
  onBpmChange,
  onNoteLengthChange,
  onSwingChange,
  onTranspose,
  onRandomize,
}: SequencerPanelProps) {
  const activeNote = state.steps[state.currentStep]?.note ?? null;

  return (
    <div className="flex flex-col p-4 h-full gap-4">
      <div className="flex items-center justify-center gap-4">
        <DuoKnob
          label="Speed"
          value={state.bpm}
          min={40}
          max={240}
          step={1}
          onChange={onBpmChange}
          displayFn={(v) => `${Math.round(v)}`}
        />
        <DuoKnob
          label="Length"
          value={state.noteLength}
          min={0.05}
          max={1}
          step={0.01}
          onChange={onNoteLengthChange}
          displayFn={(v) => `${Math.round(v * 100)}%`}
        />
        <DuoKnob
          label="Swing"
          value={state.swing}
          min={-1}
          max={1}
          step={0.01}
          onChange={onSwingChange}
          displayFn={(v) => {
            if (Math.abs(v) < 0.12) return 'Off';
            const pct = Math.round(Math.abs(v) * 100);
            return v < 0 ? `L ${pct}%` : `R ${pct}%`;
          }}
        />
      </div>

      <CircularSequencer
        steps={state.steps}
        currentStep={state.currentStep}
        playing={state.playing}
        muted={muted}
        inputStep={inputStep}
        onToggleStep={onToggleStep}
        onSelectStep={onSelectStep}
        onToggleMute={onToggleMute}
        onRandomize={onRandomize}
      />

      <div className="flex-1 flex flex-col justify-end">
        <PentatonicKeyboard
          transpose={state.transpose}
          onNotePress={onNotePress}
          activeNote={state.playing ? activeNote : undefined}
        />
      </div>
    </div>
  );
}
