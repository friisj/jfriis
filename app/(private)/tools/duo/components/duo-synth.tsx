'use client';

import { useReducer, useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';
import { SequencerPanel } from './sequencer-panel';
import { SynthPanel } from './synth-panel';
import { DuoEngine } from '@/lib/duo/engine';
import { DrumPanel } from './drum-panel';
import { KnobSizeProvider } from './knob-size-context';
import { DuoSequencerTransport, createInitialSequencerState, createInitialDrumState, randomizeSteps, randomizeDrumSteps, randomOffsetDrumSteps, randomFlipDrumSteps } from '@/lib/duo/sequencer';
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
    case 'SET_SWING':
      return { ...state, sequencer: { ...state.sequencer, swing: action.swing } };
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
        drum: action.preset.drum
          ? { ...state.drum, ...action.preset.drum }
          : state.drum,
      };
    case 'DRUM_TOGGLE_STEP': {
      const voices = [...state.drum.voices];
      const voice = { ...voices[action.voiceIndex] };
      const steps = [...voice.steps];
      steps[action.step] = !steps[action.step];
      voice.steps = steps;
      voices[action.voiceIndex] = voice;
      return { ...state, drum: { ...state.drum, voices } };
    }
    case 'DRUM_SET_PITCH': {
      const voices = [...state.drum.voices];
      voices[action.voiceIndex] = { ...voices[action.voiceIndex], pitch: action.pitch };
      return { ...state, drum: { ...state.drum, voices } };
    }
    case 'DRUM_SET_DECAY': {
      const voices = [...state.drum.voices];
      voices[action.voiceIndex] = { ...voices[action.voiceIndex], decay: action.decay };
      return { ...state, drum: { ...state.drum, voices } };
    }
    case 'DRUM_SET_VOLUME': {
      const voices = [...state.drum.voices];
      voices[action.voiceIndex] = { ...voices[action.voiceIndex], volume: action.volume };
      return { ...state, drum: { ...state.drum, voices } };
    }
    case 'DRUM_RANDOM_OFFSET':
      return { ...state, drum: { ...state.drum, voices: randomOffsetDrumSteps(state.drum.voices) } };
    case 'DRUM_RANDOM_FLIP':
      return { ...state, drum: { ...state.drum, voices: randomFlipDrumSteps(state.drum.voices) } };
    case 'DRUM_SET_RECIPE': {
      const voices = [...state.drum.voices];
      voices[action.voiceIndex] = { ...voices[action.voiceIndex], recipeIndex: action.recipeIndex };
      return { ...state, drum: { ...state.drum, voices } };
    }
    case 'DRUM_RANDOMIZE':
      return { ...state, drum: { ...state.drum, voices: randomizeDrumSteps(state.drum.voices) } };
    case 'DRUM_SET_CRUSH':
      return { ...state, drum: { ...state.drum, effects: { ...state.drum.effects, crush: action.value } } };
    case 'DRUM_SET_FILTER':
      return { ...state, drum: { ...state.drum, effects: { ...state.drum.effects, filterCutoff: action.value } } };
    case 'TOGGLE_MELODIC_MUTE':
      return { ...state, melodicMuted: !state.melodicMuted };
    case 'TOGGLE_DRUM_MUTE':
      return { ...state, drumMuted: !state.drumMuted };
    default:
      return state;
  }
}

const initialState: DuoState = {
  synth: { ...DEFAULT_SYNTH },
  sequencer: createInitialSequencerState(),
  drum: createInitialDrumState(),
  melodicMuted: false,
  drumMuted: false,
};

export function DuoSynth() {
  const [state, dispatch] = useReducer(duoReducer, initialState);
  const [initialized, setInitialized] = useState(false);
  const [inputStep, setInputStep] = useState(0);
  const [presetIndex, setPresetIndex] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const synthPanelRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DuoEngine | null>(null);
  const transportRef = useRef<DuoSequencerTransport | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const stateRef = useRef(state);

  // Sync stateRef outside of render phase
  useLayoutEffect(() => {
    stateRef.current = state;
  });

  // Initialize engine on first user interaction (serialized to prevent leaks)
  const ensureInit = useCallback(async () => {
    if (engineRef.current) return;
    if (initPromiseRef.current) return initPromiseRef.current;

    initPromiseRef.current = (async () => {
      const engine = new DuoEngine();
      await engine.init();
      // Sync engine to current UI state (user may have changed presets/knobs before init)
      engine.setAllParams(stateRef.current.synth);
      engineRef.current = engine;

      const transport = new DuoSequencerTransport(
        (step, note, noteLength, time) => {
          dispatch({ type: 'ADVANCE_STEP' });
          if (note && !stateRef.current.melodicMuted) {
            engine.triggerNote(note, 1, noteLength);
          }
        },
        () => stateRef.current.sequencer,
        (_step, activeVoices, time) => {
          if (stateRef.current.drumMuted) return;
          for (const vi of activeVoices) {
            engine.triggerDrumVoice(vi, stateRef.current.drum.voices[vi].volume, time);
          }
        },
        () => stateRef.current.drum,
        (voiceIndex: number) => {
          if (stateRef.current.drumMuted) return;
          engine.triggerDrumVoice(voiceIndex, stateRef.current.drum.voices[voiceIndex].volume);
        },
      );
      transportRef.current = transport;
      setInitialized(true);
    })();

    return initPromiseRef.current;
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

  // Swing sync
  useEffect(() => {
    transportRef.current?.setSwing(state.sequencer.swing);
  }, [state.sequencer.swing]);

  // Keyboard note input — assigns to selected step, then advances cursor
  const handleNotePress = useCallback(async (note: string) => {
    await ensureInit();
    dispatch({ type: 'SET_NOTE', step: inputStep, note });
    setInputStep((inputStep + 1) % 8);
    engineRef.current?.triggerNote(note, 0.8);
  }, [ensureInit, inputStep]);

  const handleSelectStep = useCallback((index: number) => {
    setInputStep(index);
  }, []);

  const handlePlay = useCallback(async () => {
    await ensureInit();
    dispatch({ type: 'PLAY' });
    transportRef.current?.start();
  }, [ensureInit]);

  const handleStop = useCallback(() => {
    dispatch({ type: 'STOP' });
    transportRef.current?.stop();
    setInputStep(0);
  }, []);

  const handleRandomize = useCallback(async () => {
    await ensureInit();
    dispatch({ type: 'RANDOMIZE' });
    setInputStep(0);
  }, [ensureInit]);

  const handleBoostDown = useCallback(() => {
    transportRef.current?.boost(true);
  }, []);

  const handleBoostUp = useCallback(() => {
    transportRef.current?.boost(false);
  }, []);

  const handleDrumToggleStep = useCallback((voiceIndex: number, step: number) => {
    dispatch({ type: 'DRUM_TOGGLE_STEP', voiceIndex, step });
  }, []);

  const handleDrumTriggerVoice = useCallback(async (voiceIndex: number) => {
    await ensureInit();
    engineRef.current?.triggerDrumVoice(voiceIndex, stateRef.current.drum.voices[voiceIndex].volume);
  }, [ensureInit]);

  const handleDrumSetPitch = useCallback((voiceIndex: number, pitch: number) => {
    dispatch({ type: 'DRUM_SET_PITCH', voiceIndex, pitch });
    engineRef.current?.setDrumPitch(voiceIndex, pitch);
  }, []);

  const handleDrumSetDecay = useCallback((voiceIndex: number, decay: number) => {
    dispatch({ type: 'DRUM_SET_DECAY', voiceIndex, decay });
    engineRef.current?.setDrumDecay(voiceIndex, decay);
  }, []);

  const handleDrumSetVolume = useCallback((voiceIndex: number, volume: number) => {
    dispatch({ type: 'DRUM_SET_VOLUME', voiceIndex, volume });
    engineRef.current?.setDrumVolume(voiceIndex, volume);
  }, []);

  const handleDrumSetRecipe = useCallback((voiceIndex: number, recipeIndex: number) => {
    dispatch({ type: 'DRUM_SET_RECIPE', voiceIndex, recipeIndex });
    engineRef.current?.setDrumRecipe(voiceIndex, recipeIndex);
  }, []);

  const handleDrumSetCrush = useCallback((value: number) => {
    dispatch({ type: 'DRUM_SET_CRUSH', value });
    engineRef.current?.setDrumCrush(value);
  }, []);

  const handleDrumSetFilter = useCallback((value: number) => {
    dispatch({ type: 'DRUM_SET_FILTER', value });
    engineRef.current?.setDrumFilter(value);
  }, []);

  const handleDrumRetrigger = useCallback((voiceIndex: number | null, substep: boolean) => {
    transportRef.current?.setRetrigger(voiceIndex, substep);
  }, []);

  const handleDrumRandomize = useCallback(async () => {
    await ensureInit();
    dispatch({ type: 'DRUM_RANDOMIZE' });
  }, [ensureInit]);

  const handleDrumRandomOffset = useCallback(() => {
    dispatch({ type: 'DRUM_RANDOM_OFFSET' });
  }, []);

  const handleDrumRandomFlip = useCallback(() => {
    dispatch({ type: 'DRUM_RANDOM_FLIP' });
  }, []);

  const handlePresetChange = useCallback(async (index: number) => {
    setPresetIndex(index);
    await ensureInit();
    const preset = PRESETS[index];
    dispatch({ type: 'LOAD_PRESET', preset });
    engineRef.current?.setAllParams(preset.synth);
  }, [ensureInit]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">

      {/* Three-panel layout */}
      <KnobSizeProvider measureRef={synthPanelRef}>
      <div className="flex flex-1 flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-800 overflow-auto">
        {/* Synth panel */}
        <div ref={synthPanelRef} className="flex-1 min-w-0 overflow-auto">
          <SynthPanel
            params={state.synth}
            onParamChange={handleParamChange}
          />
        </div>

        {/* Sequencer panel */}
        <div className="flex-1 min-w-0 overflow-auto">
          <SequencerPanel
            state={state.sequencer}
            muted={state.melodicMuted}
            inputStep={inputStep}
            onNotePress={handleNotePress}
            onToggleStep={(i) => dispatch({ type: 'TOGGLE_STEP', step: i })}
            onSelectStep={handleSelectStep}
            onToggleMute={() => dispatch({ type: 'TOGGLE_MELODIC_MUTE' })}
            onBpmChange={(bpm) => dispatch({ type: 'SET_BPM', bpm })}
            onNoteLengthChange={(length) => dispatch({ type: 'SET_NOTE_LENGTH', length })}
            onTranspose={(delta) => dispatch({ type: 'TRANSPOSE', delta })}
            onSwingChange={(swing) => dispatch({ type: 'SET_SWING', swing })}
            onRandomize={handleRandomize}
          />
        </div>

        {/* Drum machine panel */}
        <div className="flex-1 min-w-0 overflow-auto">
          <DrumPanel
            drum={state.drum}
            currentStep={state.sequencer.currentStep}
            playing={state.sequencer.playing}
            muted={state.drumMuted}
            onToggleStep={handleDrumToggleStep}
            onTriggerVoice={handleDrumTriggerVoice}
            onRetrigger={handleDrumRetrigger}
            onSetRecipe={handleDrumSetRecipe}
            onSetPitch={handleDrumSetPitch}
            onSetDecay={handleDrumSetDecay}
            onSetVolume={handleDrumSetVolume}
            onSetCrush={handleDrumSetCrush}
            onSetFilter={handleDrumSetFilter}
            onToggleMute={() => dispatch({ type: 'TOGGLE_DRUM_MUTE' })}
            onRandomize={handleDrumRandomize}
            onRandomOffset={handleDrumRandomOffset}
            onRandomFlip={handleDrumRandomFlip}
          />
        </div>
      </div>
      </KnobSizeProvider>

      <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-4 flex-1">
          <h1 className="text-sm font-bold text-zinc-200 tracking-wide">DUO</h1>
          {/* Preset selector */}
          <select
            value={presetIndex}
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
        <div className="flex-1 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={state.sequencer.playing ? handleStop : handlePlay}
            className={`text-xs font-mono px-3 py-1 rounded transition-colors ${
              state.sequencer.playing
                ? 'bg-amber-600/80 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
            aria-label={state.sequencer.playing ? 'Stop' : 'Play'}
          >
            {state.sequencer.playing ? 'Stop' : 'Play'}
          </button>
          <button
            type="button"
            onPointerDown={handleBoostDown}
            onPointerUp={handleBoostUp}
            onPointerLeave={handleBoostUp}
            className="text-xs font-mono px-3 py-1 rounded select-none touch-none
                       bg-amber-900/40 text-amber-400 hover:bg-amber-800/50 active:bg-amber-700/60 transition-colors"
            aria-label="Hold to boost tempo 2x"
          >
            Boost
          </button>
          <span className="text-[10px] font-mono text-zinc-600">
            {Math.round(state.sequencer.bpm)} BPM
          </span>
        </div>
        <div className="flex items-center justify-end gap-4 px-4 py-1.5 flex-1 relative">
          <button
            type="button"
            onClick={() => setHelpOpen(!helpOpen)}
            className="w-6 h-6 rounded-full text-[10px] font-bold
                       bg-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700
                       transition-colors focus-visible:ring-2 focus-visible:ring-amber-400/50 outline-none"
            aria-label="How to use DUO"
            aria-expanded={helpOpen}
          >
            ?
          </button>
          {helpOpen && (
            <div
              className="absolute right-4 top-full mt-1 z-20 w-64 p-3 rounded-lg
                         bg-zinc-800 border border-zinc-700 shadow-xl text-[11px] text-zinc-300 space-y-2"
              role="tooltip"
            >
              <p className="font-medium text-zinc-100">Sequencer</p>
              <ul className="space-y-1.5 text-zinc-400">
                <li><span className="text-purple-400">Tap a step</span> to select it as the input target (purple ring).</li>
                <li><span className="text-amber-400">Press a key</span> on the keyboard to assign a note &mdash; the cursor advances automatically.</li>
                <li><span className="text-zinc-300">Long-press a step</span> to mute/unmute it (dimmed = muted).</li>
                <li>Centre button toggles <span className="text-amber-400">play/stop</span>.</li>
              </ul>
              <hr className="border-zinc-700" />
              <p className="font-medium text-zinc-100">Drums</p>
              <ul className="space-y-1.5 text-zinc-400">
                <li><span className="text-zinc-300">Tap a cell</span> in the grid to toggle that step on/off.</li>
                <li><span className="text-zinc-300">Hold a pad label</span> to retrigger that voice every step while held.</li>
                <li><span className="text-zinc-300">Random</span>: tap to shift pattern, hold to flip random steps.</li>
              </ul>
              <hr className="border-zinc-700" />
              <p className="font-medium text-zinc-100">Knobs</p>
              <ul className="space-y-1.5 text-zinc-400">
                <li><span className="text-zinc-300">Drag up/down</span> to adjust. Value shows below each knob.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
