# Remix — Definitions

> Glossary of terms specific to this project. Maintain as concepts evolve.

---

## Core Terms

| Term | Definition | Example |
|------|-----------|---------|
| **Source audio** | The original audio file provided as input to the pipeline | A 4-bar drum loop, a full record, a field recording |
| **Stem** | An isolated audio track containing a single type of sound, produced by the separation stage | Drums stem, bass stem, melody stem |
| **Stem separation** | The process of decomposing a mixed audio signal into constituent stems | Demucs separating a song into 4 stems |
| **Chop** | A short audio segment extracted from a stem, bounded by detected transients or bar/beat boundaries | A single snare hit, a 2-bar bassline phrase |
| **Sample bank** | The collection of chops extracted from all stems, with metadata (BPM, key, position, transient markers) | 40 drum chops + 12 bass chops from a source track |
| **Pattern** | A time-based arrangement of chops within a single stem lane — equivalent to a MIDI pattern or sequencer row | A 16-step drum pattern using 4 chops |
| **Arrangement** | The full song structure — how patterns are stacked, ordered, and varied over time | Intro (4 bars) → Build (8 bars) → Drop (16 bars) → Outro (4 bars) |
| **Genre conditioning** | Constraining or biasing the pattern generation and arrangement stages toward the conventions of a target genre | "Techno" implies 4/4 kick on every beat, minimal melodic variation, 8+ bar phrases |
| **Pipeline** | The full sequential process from source audio to output track | Separation → Analysis → Chopping → Pattern Gen → Arrangement → Mixdown |
| **Mixdown** | The final stage where all pattern outputs are balanced, processed, and rendered to a stereo file | Level matching, EQ, glue compression, limiting |

---

## Pipeline Stage Terms

| Term | Definition | Example |
|------|-----------|---------|
| **BPM detection** | Estimating the tempo of the source audio in beats per minute | Source detected at 128 BPM |
| **Key estimation** | Estimating the musical key of melodic content in the source | Melody stem detected as A minor |
| **Transient** | A sudden amplitude peak marking the onset of a sound event — used as a chopping boundary | The attack of a kick drum, the pluck of a bass note |
| **Quantization** | Snapping chop boundaries and pattern timing to a musical grid | Aligning a slightly off-grid snare hit to the nearest 1/16th note |
| **Bar boundary** | A chopping strategy that slices at musical bar (measure) intervals rather than transient onsets | Chop every 2 bars regardless of transient positions |
| **Playback rate** | A multiplier applied to a chop's playback speed, used to pitch-shift or time-stretch it | Playing a chop at 0.5× to transpose it down an octave |

---

## Model & Infrastructure Terms

| Term | Definition | Example |
|------|-----------|---------|
| **Demucs** | Meta's open-source neural network for music source separation | `htdemucs` model separates into drums, bass, other, vocals |
| **Replicate** | Cloud API for running ML models, including Demucs | `POST replicate.run("meta/demucs", ...)` |
| **MDX-Net** | An alternative stem separation architecture, often used in competition settings | Used in Music Demixing Challenge winners |
| **Spleeter** | Deezer's earlier stem separation tool — faster but lower quality than Demucs | 2-stem (vocals/accompaniment) or 4-stem mode |
| **Stage interface** | The defined data format passed between two pipeline stages | `StemBank` object passed from Separation → Analysis |
| **Stem lane** | One logical track in the arrangement timeline, corresponding to one stem type | The "drums" lane in the arranger view |

---

## Music Production Terms

| Term | Definition | Example |
|------|-----------|---------|
| **Drop** | The high-energy section of a track, typically following a build | The moment the kick returns after a breakdown |
| **Breakdown** | A section with reduced elements, often percussionless, building tension | 8 bars of just pads and atmosphere before the drop |
| **Phrase** | A musical unit of a fixed number of bars, used as the building block of arrangement | A 4-bar bass loop |
| **Loop** | A phrase intended to repeat seamlessly | A 2-bar drum loop at 130 BPM |
| **Groove** | The rhythmic feel of a pattern, including swing and humanization | A 10% swing applied to hi-hat pattern |
| **Sidechain** | A compression technique where one signal (often kick) reduces the volume of another (bass, pad) | Kick ducking the bass for a pumping effect |
| **Glue compression** | Gentle compression applied to the full mix to make elements feel cohesive | Master bus compressor at 2:1 ratio |

---

## Genre-Specific Terms

| Term | Definition | Genre |
|------|-----------|-------|
| **Four-on-the-floor** | A kick drum pattern with hits on every quarter note | Techno, House |
| **Closed hi-hat grid** | Hi-hats on every 1/8th or 1/16th note | Techno |
| **Open hi-hat accent** | An open hi-hat placed on the offbeat for rhythmic punctuation | Techno, Drum & Bass |
| **Pad texture** | Long, sustained chord or noise elements providing atmosphere | Ambient |
| **Drone** | A sustained single pitch or narrow frequency band | Ambient, Dub |
| **Stab** | A short, percussive harmonic hit | Techno, House |
| **Breakdown pad** | A sustained textural element used in breakdown sections | Techno |

---

*Add terms as they emerge during exploration. Precise definitions prevent confusion in later phases.*
