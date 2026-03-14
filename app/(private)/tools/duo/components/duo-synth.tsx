'use client';

import { useReducer, useRef, useEffect, useCallback, useState } from 'react';
import { SequencerPanel } from './sequencer-panel';
import { SynthPanel } from './synth-panel';
import { DuoEngine } from '@/lib/duo/engine';
import { DuoSequencerTransport, createInitialSequencerState, randomizeSteps } from '@/lib/duo/sequencer';
import { PRESETS, DEFAULT_SYNTH } from '@/lib/duo/presets';
import type { DuoState, DuoAction, DuoSynthParams } from '@/lib/duo/types';

function duoReducer(state: DuoState, action: DuoAction): DuoState {
  switch (action.type) {
    case 'SET_PARAM':
      return {
        ...state,
        synth: { ...state.synth, [action.param]: action.value },
      };
    case 'SET_NOTE': {
      const steps = [...state.sequencer.steps];
      steps[action.step] = { ...steps[action.step], note: action.note };
      return { ...state, sequencer: { ...state.sequencer, steps } };
    }
    case 'TOGGLE_STEP': {
      const steps = [...state.sequencer.steps];
      steps[action.step] = { ...steps[action.step], active: !steps[action.step].active };
      return { ...state, sequencer: { ...state.sequencer, steps } };
    }
    case 'SET_BPM':
      return { ...state, sequencer: { ...state.sequencer, bpm: action.bpm } };
    case 'SET_NOTE_LENGTH':
      return { ...state, sequencer: { ...state.sequencer, noteLength: action.length } };
    case 'TRANSPOSE': {
      const transpose = Math.max(-12, Math.min(12, state.sequencer.transpose + action.delta));
      return { ...state, sequencer: { ...state.sequencer, transpose } };
    }
    case 'RANDOMIZE': {
      const steps = randomizeSteps(state.sequencer.transpose);
      return { ...state, sequencer: { ...state.sequencer, steps } };
    }
    case 'PLAY':
      return { ...state, sequencer: { ...state.sequencer, playing: true } };
    case 'STOP':
      return { ...state, sequencer: { ...state.sequencer, playing: false, currentStep: 0 } };
    case 'ADVANCE_STEP': {
      const next = (state.sequencer.currentStep + 1) % state.sequencer.steps.length;
      return { ...state, sequencer: { ...state.sequencer, currentStep: next } };
    }
    case 'LOAD_PRESET':
      return {
        ...state,
        synth: { ...action.preset.synth },
        sequencer: {
          ...state.sequencer,
          ...(action.preset.sequencer ?? {}),
        },
      };
    default:
      return state;
  }
}

const initialState: DuoState = {
  synth: { ...DEFAULT_SYNTH },
  sequencer: createInitialSequencerState(),
};

export function DuoSynth() {
  const [state, dispatch] = useReducer(duoReducer, initialState);
  const [initialized, setInitialized] = useState(false);
  const engineRef = useRef<DuoEngine | null>(null);
  const transportRef = useRef<DuoSequencerTransport | null>(null);
  const stateRef = useRef(state);
  // Track which step to assign next keyboard note to
  const inputStepRef = useRef(0);
  stateRef.current = state;

  // Initialize engine on first user interaction
  const ensureInit = useCallback(async () => {
    if (engineRef.current) return;
    const engine = new DuoEngine();
    await engine.init();
    engineRef.current = engine;

    const transport = new DuoSequencerTransport(
      (step, note) => {
        dispatch({ type: 'ADVANCE_STEP' });
        if (note) {
          engine.triggerNote(note, 1);
        }
      },
      () => stateRef.current.sequencer,
    );
    transportRef.current = transport;
    setInitialized(true);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      transportRef.current?.dispose();
      engineRef.current?.dispose();
    };
  }, []);

  // Sync engine params
  const handleParamChange = useCallback(async (param: keyof DuoSynthParams, value: number) => {
    dispatch({ type: 'SET_PARAM', param, value });
    engineRef.current?.setParam(param, value);
  }, []);

  // Sequencer BPM sync
  useEffect(() => {
    transportRef.current?.setBPM(state.sequencer.bpm);
  }, [state.sequencer.bpm]);

  // Keyboard note input — assigns to next step
  const handleNotePress = useCallback(async (note: string) => {
    await ensureInit();
    // Assign note to current input step and advance
    const step = inputStepRef.current;
    dispatch({ type: 'SET_NOTE', step, note });
    inputStepRef.current = (step + 1) % 8;
    // Preview the note
    engineRef.current?.triggerNote(note, 0.8);
  }, [ensureInit]);

  const handlePlay = useCallback(async () => {
    await ensureInit();
    dispatch({ type: 'PLAY' });
    transportRef.current?.start();
  }, [ensureInit]);

  const handleStop = useCallback(() => {
    dispatch({ type: 'STOP' });
    transportRef.current?.stop();
    inputStepRef.current = 0;
  }, []);

  const handleRandomize = useCallback(async () => {
    await ensureInit();
    dispatch({ type: 'RANDOMIZE' });
    inputStepRef.current = 0;
  }, [ensureInit]);

  const handleBoostDown = useCallback(() => {
    transportRef.current?.boost(true);
  }, []);

  const handleBoostUp = useCallback(() => {
    transportRef.current?.boost(false);
  }, []);

  const handleTriggerKick = useCallback(async (velocity: number) => {
    await ensureInit();
    engineRef.current?.triggerKick(velocity);
  }, [ensureInit]);

  const handleTriggerSnare = useCallback(async (velocity: number) => {
    await ensureInit();
    engineRef.current?.triggerSnare(velocity);
  }, [ensureInit]);

  const handlePresetChange = useCallback(async (index: number) => {
    await ensureInit();
    const preset = PRESETS[index];
    dispatch({ type: 'LOAD_PRESET', preset });
    engineRef.current?.setAllParams(preset.synth);
  }, [ensureInit]);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-zinc-200 tracking-wide">DUO</h1>
          {!initialized && (
            <span className="text-[10px] text-zinc-500">Click any control to start audio</span>
          )}
        </div>
        {/* Preset selector */}
        <select
          value={PRESETS.findIndex((p) => p.name === 'Init')}
          onChange={(e) => handlePresetChange(Number(e.target.value))}
          className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 rounded px-2 py-1
                     focus:ring-1 focus:ring-amber-400/50 outline-none"
          aria-label="Select preset"
        >
          {PRESETS.map((preset, i) => (
            <option key={preset.name} value={i}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-800 overflow-auto">
        {/* Sequencer side */}
        <div className="flex-1 min-w-0 overflow-auto">
          <SequencerPanel
            state={state.sequencer}
            onNotePress={handleNotePress}
            onToggleStep={(i) => dispatch({ type: 'TOGGLE_STEP', step: i })}
            onPlay={handlePlay}
            onStop={handleStop}
            onBpmChange={(bpm) => dispatch({ type: 'SET_BPM', bpm })}
            onNoteLengthChange={(length) => dispatch({ type: 'SET_NOTE_LENGTH', length })}
            onTranspose={(delta) => dispatch({ type: 'TRANSPOSE', delta })}
            onRandomize={handleRandomize}
            onBoostDown={handleBoostDown}
            onBoostUp={handleBoostUp}
          />
        </div>

        {/* Synth side */}
        <div className="flex-1 min-w-0 overflow-auto">
          <SynthPanel
            params={state.synth}
            onParamChange={handleParamChange}
            onTriggerKick={handleTriggerKick}
            onTriggerSnare={handleTriggerSnare}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-zinc-500">
            {state.sequencer.playing ? 'Playing' : 'Stopped'}
          </span>
          <span className="text-[10px] font-mono text-zinc-600">
            Step {state.sequencer.currentStep + 1}/8
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-600">
          {Math.round(state.sequencer.bpm)} BPM
        </span>
      </div>
    </div>
  );
}
