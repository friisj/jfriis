'use client';

import { PentatonicKeyboard } from './pentatonic-keyboard';
import { CircularSequencer } from './circular-sequencer';
import { DuoKnob } from './knob';
import type { DuoSequencerState } from '@/lib/duo/types';

interface SequencerPanelProps {
  state: DuoSequencerState;
  inputStep: number;
  onNotePress: (note: string) => void;
  onToggleStep: (index: number) => void;
  onSelectStep: (index: number) => void;
  onPlay: () => void;
  onStop: () => void;
  onBpmChange: (bpm: number) => void;
  onNoteLengthChange: (length: number) => void;
  onSwingChange: (swing: number) => void;
  onTranspose: (delta: number) => void;
  onRandomize: () => void;
  onBoostDown: () => void;
  onBoostUp: () => void;
}

export function SequencerPanel({
  state,
  inputStep,
  onNotePress,
  onToggleStep,
  onSelectStep,
  onPlay,
  onStop,
  onBpmChange,
  onNoteLengthChange,
  onSwingChange,
  onTranspose,
  onRandomize,
  onBoostDown,
  onBoostUp,
}: SequencerPanelProps) {
  const activeNote = state.steps[state.currentStep]?.note ?? null;

  return (
    <div className="flex flex-col p-4 h-full gap-4">


      <div className="space-y-3 flex-1 flex flex-col justify-between">
        {/* Speed & Length knobs */}
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

        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onRandomize}
            className="h-8 px-4 rounded-lg bg-purple-600/80 text-white text-xs font-medium
                       hover:bg-purple-500/80 active:bg-purple-700/80 transition-colors
                       focus-visible:ring-2 focus-visible:ring-amber-400/50 outline-none"
          >
            Random
          </button>
          <button
            type="button"
            onPointerDown={onBoostDown}
            onPointerUp={onBoostUp}
            onPointerLeave={onBoostUp}
            className="h-8 px-4 rounded-lg bg-amber-600/80 text-white text-xs font-medium select-none touch-none
                       hover:bg-amber-500/80 active:bg-amber-700/80 transition-colors
                       focus-visible:ring-2 focus-visible:ring-amber-400/50 outline-none"
          >
            Boost
          </button>
        </div>
      </div>
      <CircularSequencer
        steps={state.steps}
        currentStep={state.currentStep}
        playing={state.playing}
        inputStep={inputStep}
        onToggleStep={onToggleStep}
        onSelectStep={onSelectStep}
        onPlay={onPlay}
        onStop={onStop}
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
