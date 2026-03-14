# DUO — Browser Synthesizer Tool Design

A collaborative, two-sided browser synthesizer inspired by the [Dato DUO](https://dato.mu/). Built with Web Audio API and Tone.js, living at `/tools/duo`.

## Concept

The Dato DUO is a hardware synth designed for two players — one side sequences notes, the other sculpts sound. This browser version preserves that collaborative split while adapting controls for screen interaction. It should feel playful, immediate, and impossible to make sound bad.

**Key design principles:**
- Two-panel layout (sequencer + synth) — can be used solo or with two people on the same screen
- No menus, no complexity — every control is always visible
- Constrained to sound good — minor pentatonic scale, limited but musical parameter ranges
- 12-bit lo-fi character — gritty, charming, "cartoonish"
- Visual feedback on every interaction — LEDs, animations, state indicators

## Architecture

### Sound Engine

```
                           SYNTH SIDE
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ┌─────────┐  ┌─────────┐                               │
│  │  OSC 1  │  │  OSC 2  │                               │
│  │  (Saw)  │  │ (Pulse) │                               │
│  │         │  │  PWM    │                               │
│  └────┬────┘  └────┬────┘                               │
│       │            │                                     │
│       └──────┬─────┘                                     │
│              │  mix / detune                              │
│              ▼                                           │
│       ┌──────────────┐                                   │
│       │  2-pole LPF  │                                   │
│       │  cutoff +    │                                   │
│       │  resonance   │                                   │
│       └──────┬───────┘                                   │
│              ▼                                           │
│       ┌──────────────┐                                   │
│       │     VCA      │                                   │
│       │  level +     │                                   │
│       │  decay env   │                                   │
│       └──────┬───────┘                                   │
│              ▼                                           │
│       ┌──────────────┐     ┌──────────┐                  │
│       │  Bitcrusher  │     │  Delay   │                  │
│       │  (12-bit     │────▶│ (tempo   │                  │
│       │   default)   │     │  synced) │                  │
│       └──────┬───────┘     └─────┬────┘                  │
│              └───────┬───────────┘                        │
│                      ▼                                   │
│              ┌──────────────┐                            │
│              │   Accent /   │                            │
│              │    Glide     │                            │
│              └──────┬───────┘                            │
│                     ▼                                    │
│              ┌──────────────┐                            │
│              │    Master    │───▶ Output                  │
│              └──────────────┘                            │
│                                                          │
│  ┌─────────┐  ┌─────────┐                               │
│  │  KICK   │  │ SNARE   │  (parallel drum bus)           │
│  │  pad    │  │  pad    │──────────────────▶ Master      │
│  └─────────┘  └─────────┘                               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Implementation: Web Audio Graph

Uses a hybrid approach — **Tone.js** for oscillators, envelopes, and effects (already a dependency via the sampler tool), with raw **Web Audio API** for the bitcrusher worklet (reuse from `sampler-engine.ts`).

```typescript
// Core synth voice
interface DuoVoice {
  osc1: Tone.Oscillator;       // Sawtooth
  osc2: Tone.PulseOscillator;  // Pulse with PWM
  filter: Tone.Filter;         // 2-pole lowpass
  vca: Tone.AmplitudeEnvelope;
  bitcrusher: Tone.BitCrusher;
  delay: Tone.FeedbackDelay;
  accent: Tone.Gain;           // velocity-driven boost
  glide: number;               // portamento time in seconds
  master: Tone.Gain;
}

// Drum voices (noise-based)
interface DuoDrums {
  kick: Tone.MembraneSynth;
  snare: Tone.NoiseSynth;
  drumBus: Tone.Gain;
}
```

### Sequencer

8-step circular sequencer with note data from a 2-octave minor pentatonic keyboard.

```typescript
interface DuoSequencer {
  steps: DuoStep[];         // 8 steps
  currentStep: number;      // 0-7
  bpm: number;              // tempo
  playing: boolean;
  noteLength: number;       // 0-1 (staccato to legato)
}

interface DuoStep {
  note: string | null;      // e.g. "C4", "Eb4", null = rest
  active: boolean;          // mute per step
  accent: boolean;          // accent flag
}
```

**Scale constraint:** Minor pentatonic, 2 octaves. The keyboard maps to these notes only:

```
Octave 1: C3, Eb3, F3, G3, Bb3
Octave 2: C4, Eb4, F4, G4, Bb4
```

Pitch arrows transpose the entire sequence up/down in semitones.

### Transport

- `Tone.Transport` for sequencer timing
- Sync I/O not applicable in browser, but MIDI support via Web MIDI API is a stretch goal

## UI Layout

Two-panel split layout, responsive:

```
┌─────────────────────────────────────────────────────────┐
│                     DUO HEADER BAR                       │
│                    (title, MIDI, output)                  │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│     SEQUENCER SIDE       │       SYNTH SIDE             │
│                          │                              │
│  ┌──────────────────┐    │   ┌───────────────────────┐  │
│  │   KEYBOARD       │    │   │   OSCILLATORS         │  │
│  │   (2-oct penta)  │    │   │   [saw detune] [PWM]  │  │
│  │   10 rubber keys │    │   └───────────────────────┘  │
│  └──────────────────┘    │                              │
│                          │   ┌───────────────────────┐  │
│  ┌──────────────────┐    │   │   FILTER              │  │
│  │   SEQUENCER      │    │   │   [cutoff] [reso]     │  │
│  │   ○ ○ ○ ○        │    │   └───────────────────────┘  │
│  │   ○ ○ ○ ○        │    │                              │
│  │     [▶]          │    │   ┌───────────────────────┐  │
│  └──────────────────┘    │   │   AMP                 │  │
│                          │   │   [level] [decay]     │  │
│  ┌──────────────────┐    │   └───────────────────────┘  │
│  │  CONTROLS        │    │                              │
│  │  [speed] [length]│    │   ┌───────────────────────┐  │
│  │  [↑pitch] [↓]   │    │   │   EFFECTS             │  │
│  │  [random] [boost]│    │   │   [crush] [delay]     │  │
│  └──────────────────┘    │   │   [accent] [glide]    │  │
│                          │   └───────────────────────┘  │
│                          │                              │
│                          │   ┌───────────────────────┐  │
│                          │   │   DRUMS               │  │
│                          │   │   [KICK]    [SNARE]   │  │
│                          │   └───────────────────────┘  │
│                          │                              │
├──────────────────────────┴──────────────────────────────┤
│                    STATUS BAR                            │
│         (step indicator, BPM, transport state)           │
└─────────────────────────────────────────────────────────┘
```

On mobile: stacked vertically, sequencer on top.

### Component Breakdown

```
app/(private)/tools/duo/
  page.tsx                          # Server page, loads presets
  layout.tsx                        # Tool layout wrapper
  components/
    duo-synth.tsx                   # Main client component (orchestrator)
    sequencer-panel.tsx             # Left side: keyboard + sequencer + controls
    synth-panel.tsx                 # Right side: oscillators + filter + effects
    pentatonic-keyboard.tsx         # 10-key keyboard input
    circular-sequencer.tsx          # 8-step circular display with LEDs
    knob.tsx                        # Rotary knob control (SVG-based)
    slider.tsx                      # Vertical slider (for osc mix etc.)
    drum-pad.tsx                    # Touch/click drum trigger
    led-indicator.tsx               # Step indicator LED

lib/duo/
  engine.ts                        # DuoEngine class — audio graph setup
  sequencer.ts                     # Sequencer state machine + transport
  scales.ts                        # Minor pentatonic note mapping
  presets.ts                       # Factory presets (parameter snapshots)
  types.ts                         # Shared types
```

### Reusable from Existing Codebase

- `lib/sampler-synth.ts` — Tone.js patterns for synth creation, effect chains
- `lib/sampler-engine.ts` — AudioContext management, bitcrusher worklet
- `app/(private)/tools/sampler/components/effect-knob.tsx` — Rotary knob UI
- `app/(private)/tools/sampler/components/adsr-editor.tsx` — Envelope visualization pattern

## Controls Reference

### Sequencer Side

| Control | Type | Function | Range |
|---------|------|----------|-------|
| Keyboard | 10 buttons | Input notes to sequencer steps | C3-Bb4 (minor pentatonic) |
| Sequencer ring | 8 LEDs + buttons | Show/mute steps, display playback position | on/off per step |
| Play | Button | Start/stop sequencer | toggle |
| Speed | Knob | Sequencer tempo | 40-240 BPM |
| Length | Knob | Note duration (gate time) | 5%-100% of step |
| Pitch Up | Button | Transpose sequence +1 semitone | -12 to +12 |
| Pitch Down | Button | Transpose sequence -1 semitone | -12 to +12 |
| Random | Button | Randomize step notes from scale | instant |
| Boost | Button (momentary) | Double tempo while held | momentary |

### Synth Side

| Control | Type | Function | Range |
|---------|------|----------|-------|
| Osc Mix / Detune | Slider | Blend saw ↔ pulse, detune saw osc | -100 to +100 cents / mix 0-1 |
| Pulse Width | Knob | PWM of pulse oscillator | 0.01-0.99 |
| Filter Cutoff | Slider | LPF cutoff frequency | 60-8000 Hz (log) |
| Filter Resonance | Knob | LPF Q/resonance | 0-20 |
| Level | Knob | Master output volume | 0-1 |
| Decay | Knob | Amplitude envelope decay time | 0.01-2.0s |
| Bitcrusher | Knob | Bit depth reduction | 1-16 bits |
| Delay | Knob | Delay wet/dry mix | 0-1 |
| Accent | Knob | Velocity boost amount | 0-1 |
| Glide | Knob | Portamento time | 0-0.5s |
| Kick Pad | Pad | Trigger kick drum | velocity-sensitive |
| Snare Pad | Pad | Trigger snare drum | velocity-sensitive |

## Synth Parameters & Defaults

```typescript
const DUO_DEFAULTS = {
  // Oscillators
  osc1Type: 'sawtooth' as OscillatorType,
  osc2Type: 'pulse',
  oscMix: 0.5,            // 0 = saw only, 1 = pulse only
  detune: 0,              // cents
  pulseWidth: 0.5,        // 0.01 - 0.99

  // Filter
  filterCutoff: 2000,     // Hz
  filterResonance: 2,     // Q
  filterType: 'lowpass' as BiquadFilterType,
  filterRolloff: -12,     // 2-pole = -12dB/oct

  // Amp
  level: 0.7,
  decay: 0.3,             // seconds
  attack: 0.005,          // fast attack (fixed)
  sustain: 0,             // no sustain (percussive default)
  release: 0.1,           // short release

  // Effects
  bitcrusherBits: 12,     // 12-bit = Dato character
  delayTime: 0.25,        // seconds
  delayFeedback: 0.3,
  delayWet: 0,            // off by default
  accent: 0.3,
  glide: 0,               // off by default

  // Sequencer
  bpm: 120,
  noteLength: 0.5,        // 50% gate
  transpose: 0,           // semitones

  // Drums
  kickDecay: 0.15,
  kickPitchDecay: 0.05,
  kickOctaves: 6,
  snareDecay: 0.1,
  snareType: 'white' as const,
};
```

## Visual Design

### Aesthetic

- **Playful but not childish** — rounded corners, soft shadows, warm color palette
- **Skeuomorphic controls** — knobs that rotate, sliders that slide, pads that depress
- **LED feedback** — dot indicators on sequencer steps light up on beat
- **Pictographic labels** — optional cute icons (tortoise/hare for speed, tunnel for delay) alongside text labels
- **Dark background** with colorful controls (inspired by Dato's wood + colored rubber)

### Color Palette

```
Background:    hsl(30, 15%, 12%)     // warm dark
Panel:         hsl(30, 10%, 18%)     // slightly lighter
Seq keys:      hsl(0, 70%, 55%)      // red
               hsl(30, 80%, 55%)     // orange
               hsl(50, 80%, 55%)     // yellow
               hsl(120, 50%, 45%)    // green
               hsl(210, 60%, 50%)    // blue
LED active:    hsl(50, 100%, 60%)    // bright yellow
LED inactive:  hsl(30, 10%, 25%)     // dim
Knob:          hsl(30, 5%, 30%)      // neutral
Knob indicator: hsl(0, 0%, 90%)     // white mark
```

### Interactions

- **Knobs**: Click+drag (vertical or circular), scroll wheel, touch drag
- **Keyboard**: Click/touch to input note to current sequencer step (auto-advance)
- **Drum pads**: Touch/click with velocity from pointer pressure or click speed
- **Sequencer LEDs**: Click to toggle step mute; animated pulse on current step
- **Random**: Brief animation randomizing step notes
- **Boost**: Active only while pressed — visual tempo acceleration feedback

## State Management

React state with `useReducer` for synth parameters + sequencer state. No server persistence initially — presets stored in `localStorage`.

```typescript
type DuoAction =
  | { type: 'SET_PARAM'; param: string; value: number }
  | { type: 'SET_NOTE'; step: number; note: string | null }
  | { type: 'TOGGLE_STEP'; step: number }
  | { type: 'SET_BPM'; bpm: number }
  | { type: 'TRANSPOSE'; semitones: number }
  | { type: 'RANDOMIZE' }
  | { type: 'PLAY' }
  | { type: 'STOP' }
  | { type: 'ADVANCE_STEP' }
  | { type: 'LOAD_PRESET'; preset: DuoPreset }
  | { type: 'TRIGGER_DRUM'; drum: 'kick' | 'snare'; velocity: number };
```

## Presets

Factory presets demonstrating the range:

1. **Init** — Clean saw, filter open, no effects
2. **Acid Bass** — Resonant filter, short decay, glide on
3. **Lo-Fi Lead** — Bitcrusher at 8-bit, delay, moderate resonance
4. **Fat Pad** — Both oscs, slow decay, low resonance, delay
5. **Perc Stab** — Very short decay, accent high, no effects
6. **Noise Bot** — Heavy bitcrusher, max resonance, fast sequence

## MIDI (Stretch Goal)

Web MIDI API integration:
- MIDI In: external keyboard → note input to sequencer or direct play
- MIDI Out: sequencer notes → external gear
- MIDI CC mapping for knobs/sliders
- Clock sync (send/receive)

## Non-Goals (v1)

- No patch saving to database (localStorage only)
- No audio recording/export
- No undo/redo
- No multi-voice polyphony (mono only, like the hardware)
- No network collaboration (two players = same screen)
- No integration with other tools (sampler, remix)

## File Structure (final)

```
app/(private)/tools/duo/
  page.tsx
  layout.tsx
  components/
    duo-synth.tsx
    sequencer-panel.tsx
    synth-panel.tsx
    pentatonic-keyboard.tsx
    circular-sequencer.tsx
    knob.tsx
    slider.tsx
    drum-pad.tsx
    led-indicator.tsx
    preset-picker.tsx
    transport-bar.tsx

lib/duo/
  engine.ts
  sequencer.ts
  scales.ts
  presets.ts
  types.ts
```

## Sources

- [Dato DUO official](https://dato.mu/)
- [Perfect Circuit — Dato DUO](https://www.perfectcircuit.com/dato-duo.html)
- [AudioNewsRoom — Dato DUO Review](https://audionewsroom.net/2020/05/dato-duo-review-sharing-the-joy.html)
- [FACT Magazine — Dato DUO Review](https://www.factmag.com/2017/11/04/dato-duo-review/)
- [Thomann — Dato DUO specs](https://www.thomannmusic.com/dato_duo.htm)
- [Engadget — Dato DUO overview](https://www.engadget.com/2016-06-08-dato-duo-synthesizer.html)
- [ManualsLib — Dato DUO Manual](https://www.manualslib.com/manual/1626841/Dato-Duo.html)
