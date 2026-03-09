# Remix — Recipes

> Recipe schema and initial presets. A recipe encodes creative intent as pipeline configuration.

---

## Schema

```typescript
interface Recipe {
  name: string
  description: string

  separation: {
    model: 'htdemucs' | 'htdemucs_6s'    // 4-stem or 6-stem separation
    stems: 4 | 6
  }

  analysis: {
    detect_key: boolean                   // run key estimation
    energy_resolution: 'beat' | 'bar'     // granularity of energy map
  }

  chopping: {
    strategy: 'transient' | 'bar' | 'hybrid'
    min_length_ms: number                 // minimum chop duration
    max_length_ms: number                 // maximum chop duration
    prefer_sustained: boolean             // bias toward longer, held sounds
    stems_override?: Partial<Record<StemType, {  // per-stem overrides
      strategy?: 'transient' | 'bar' | 'hybrid'
      min_length_ms?: number
    }>>
  }

  patterns: {
    density: number                       // 0–1, steps per available position
    swing: number                         // 0–1, timing offset on even steps
    variation_rate: number                // 0–1, how often new chops introduced
    humanize: number                      // 0–1, velocity/timing randomization
    pitch_range: number                   // semitones, max pitch shift applied to chops
    allow_reverse: boolean                // permit reversed chop playback
    stems_override?: Partial<Record<StemType, {
      density?: number
      swing?: number
    }>>
  }

  arrangement: {
    sections: SectionTemplate[]           // ordered list of sections
    phrase_length: number                 // bars per repeating unit
    total_bars?: number                   // if set, override calculated total
    energy_curve: 'flat' | 'build' | 'arc' | 'dissolve' | 'wave'
  }

  mixdown: {
    reverb: number                        // 0–1, master reverb send
    reverb_decay: number                  // seconds
    compression: number                   // 0–1, mapped to ratio
    stereo_width: number                  // 1.0 = normal
    per_stem?: Partial<Record<StemType, {
      volume?: number                     // 0–1
      pan?: number                        // -1 to 1
      reverb_send?: number
      delay_send?: number
      delay_time_ms?: number
    }>>
  }
}

interface SectionTemplate {
  name: string                            // 'intro', 'drift', 'peak', 'dissolve', etc.
  length_bars: number
  active_stems: StemType[]                // which stems play in this section
  energy: number                          // 0–1, target intensity for this section
}

type StemType = 'drums' | 'bass' | 'vocals' | 'other' | 'guitar' | 'piano'
```

---

## Initial Presets

### synth-to-ambient

The first demo recipe: transform an 80s synth track into ambient texture.

```json
{
  "name": "synth-to-ambient",
  "description": "Dissolve synth-heavy source into ambient atmosphere. Emphasizes melodic/harmonic stems, deprioritizes percussion, favors long phrases and slow evolution.",

  "separation": {
    "model": "htdemucs_6s",
    "stems": 6
  },

  "analysis": {
    "detect_key": true,
    "energy_resolution": "bar"
  },

  "chopping": {
    "strategy": "bar",
    "min_length_ms": 2000,
    "max_length_ms": 16000,
    "prefer_sustained": true,
    "stems_override": {
      "drums": { "strategy": "transient", "min_length_ms": 200 }
    }
  },

  "patterns": {
    "density": 0.15,
    "swing": 0,
    "variation_rate": 0.1,
    "humanize": 0.3,
    "pitch_range": 5,
    "allow_reverse": true,
    "stems_override": {
      "drums": { "density": 0.05 },
      "vocals": { "density": 0.08 }
    }
  },

  "arrangement": {
    "sections": [
      { "name": "intro",    "length_bars": 8,  "active_stems": ["other", "piano"],              "energy": 0.2 },
      { "name": "drift",    "length_bars": 16, "active_stems": ["other", "piano", "bass"],      "energy": 0.3 },
      { "name": "swell",    "length_bars": 16, "active_stems": ["other", "piano", "bass", "guitar", "vocals"], "energy": 0.6 },
      { "name": "peak",     "length_bars": 8,  "active_stems": ["other", "piano", "bass", "guitar", "vocals", "drums"], "energy": 0.8 },
      { "name": "dissolve", "length_bars": 16, "active_stems": ["other", "piano", "vocals"],    "energy": 0.2 }
    ],
    "phrase_length": 8,
    "energy_curve": "arc"
  },

  "mixdown": {
    "reverb": 0.7,
    "reverb_decay": 4.5,
    "compression": 0.15,
    "stereo_width": 1.4,
    "per_stem": {
      "drums": { "volume": 0.2, "reverb_send": 0.9, "delay_send": 0.3, "delay_time_ms": 375 },
      "bass": { "volume": 0.5, "pan": 0, "reverb_send": 0.4 },
      "vocals": { "volume": 0.35, "reverb_send": 0.8, "delay_send": 0.5, "delay_time_ms": 500 },
      "other": { "volume": 0.7, "reverb_send": 0.6 },
      "guitar": { "volume": 0.5, "reverb_send": 0.5 },
      "piano": { "volume": 0.6, "reverb_send": 0.6, "pan": -0.2 }
    }
  }
}
```

**Key characteristics:**
- 6-stem separation to isolate guitar + piano from the synth source
- Bar-based chopping with long minimum lengths (2s) — preserves sustained textures
- Very low pattern density (0.15) — sparse, breathing arrangement
- Arc energy curve: gentle intro → swell → peak → dissolve
- Heavy reverb (0.7, 4.5s decay) + wide stereo (1.4×) for space
- Drums almost silent (0.2 volume, 0.05 density) — just enough for subtle pulse

### lofi-chop

Chop source into dusty, warm lo-fi downtempo.

```json
{
  "name": "lofi-chop",
  "description": "Classic sample-culture treatment. Chop melodic material into short phrases, add swing and dust. Warm, intimate, head-nodding.",

  "separation": {
    "model": "htdemucs",
    "stems": 4
  },

  "analysis": {
    "detect_key": true,
    "energy_resolution": "beat"
  },

  "chopping": {
    "strategy": "hybrid",
    "min_length_ms": 250,
    "max_length_ms": 4000,
    "prefer_sustained": false
  },

  "patterns": {
    "density": 0.45,
    "swing": 0.6,
    "variation_rate": 0.3,
    "humanize": 0.5,
    "pitch_range": 3,
    "allow_reverse": true,
    "stems_override": {
      "drums": { "density": 0.6, "swing": 0.4 }
    }
  },

  "arrangement": {
    "sections": [
      { "name": "intro",   "length_bars": 4,  "active_stems": ["other"],                           "energy": 0.3 },
      { "name": "verse",   "length_bars": 8,  "active_stems": ["other", "drums", "bass"],           "energy": 0.5 },
      { "name": "hook",    "length_bars": 4,  "active_stems": ["other", "drums", "bass", "vocals"], "energy": 0.7 },
      { "name": "verse",   "length_bars": 8,  "active_stems": ["other", "drums", "bass"],           "energy": 0.5 },
      { "name": "hook",    "length_bars": 4,  "active_stems": ["other", "drums", "bass", "vocals"], "energy": 0.7 },
      { "name": "outro",   "length_bars": 4,  "active_stems": ["other"],                           "energy": 0.2 }
    ],
    "phrase_length": 4,
    "energy_curve": "wave"
  },

  "mixdown": {
    "reverb": 0.25,
    "reverb_decay": 1.5,
    "compression": 0.5,
    "stereo_width": 0.9,
    "per_stem": {
      "drums": { "volume": 0.7, "reverb_send": 0.15 },
      "bass": { "volume": 0.65, "pan": 0, "reverb_send": 0.1 },
      "vocals": { "volume": 0.4, "reverb_send": 0.3, "delay_send": 0.2, "delay_time_ms": 250 },
      "other": { "volume": 0.6, "reverb_send": 0.2 }
    }
  }
}
```

**Key characteristics:**
- 4-stem separation (standard — no need for guitar/piano isolation)
- Hybrid chopping with short min lengths (250ms) — tight chops, rhythmic
- High swing (0.6) + humanize (0.5) — loose, human feel
- Wave energy curve — verse/hook alternation
- Narrower stereo (0.9×), more compression (0.5) — warm, intimate, compressed
- Short reverb (1.5s) — room-sized, not cavernous

---

## Recipe Design Principles

1. **Recipes are opinionated defaults.** Every parameter has a value. No nulls, no "auto-detect" magic. The recipe author makes every decision explicitly.

2. **Per-stem overrides are optional.** The top-level parameters apply to all stems. Override only when a specific stem needs different treatment (e.g., drums always get transient chopping even in an ambient recipe).

3. **Energy curve + section definitions work together.** The `energy_curve` is a macro shape; section `energy` values are specific points on that curve. If they conflict, section values win.

4. **Recipes are forkable.** Start from a preset, tweak parameters, save as a new recipe. The UI should make this effortless.

5. **Recipes don't reference specific source material.** They're source-agnostic — the same recipe applied to different sources should produce stylistically consistent (but sonically different) output.

---

*Add new presets as genre targets expand. Each preset should document its key characteristics and design rationale.*
