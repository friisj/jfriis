# Chroma - Initial Research

> Landscape survey and foundational research for the project.

---

## Problem Space

Vision models (GPT-4V, Claude, Gemini) demonstrate significant limitations in precise color analysis despite excelling at object recognition and scene understanding. Key failure modes:

1. **Contextual Blindness** — Cannot adjust for lighting conditions the way human perception does
2. **Oversimplified Representation** — Reduce complex color interactions to simple labels ("green", "brown")
3. **Layer Conflation** — Cannot separate undertones from overtones (e.g. cool undertone beneath warm tan)
4. **No Emotional/Aesthetic Context** — Cannot understand personal taste or subjective color responses

### The Amber-Green Paradox (Case Study)

Luv chassis parameters specify warm amber eyes (#D4A857) with golden flecks. Generated images consistently appear "green" to vision models due to:
- Cool lighting in generated scenes shifting amber toward green hues
- Melanin complexity: amber eyes naturally exhibit greenish hints from pheomelanin
- Digital rendering artifacts exaggerating color temperature differences

This is a *known phenomenon* in photography — not an AI-specific bug.

## Prior Art

| Approach | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| Basic RGB Eye-Dropper | Simple, fast, widely available | Single-pixel, no context, no lighting awareness | Baseline to improve upon |
| AI-Enhanced Eye-Dropper Tools | Better accuracy via learned priors | Still RGB-primary, black-box | Partial solution |
| HSV Color Space Detection | Separates hue from brightness/saturation | Doesn't match human perception curves | Key component of multi-space approach |
| CIELAB Analysis | Perceptually uniform, closest to human vision | Computationally heavier, less intuitive | Gold standard for our purposes |
| NVIDIA NRD Denoisers | Handles noise from shadows/reflections | GPU-dependent, rendering-focused | Relevant for pre-processing |
| Professional Color Calibration | Highest accuracy | Hardware-dependent, not scalable to AI pipelines | Reference standard |

## Key Questions

1. Can client-side canvas pixel sampling achieve sufficient accuracy for color validation?
2. What's the minimum viable set of color spaces needed for reliable lighting compensation?
3. How do we define "ground truth" for generated image colors when the image is synthetic?
4. Can we build a confidence scoring model that correlates with human perception without training data?
5. Should region detection (iris boundaries, limbal rings) be manual, semi-automatic, or fully automatic?

## Technical Approach (Proposed)

### Multi-Space Analysis Pipeline

```
Image → Region Selection → Pixel Sampling (NxN) →
  ├── RGB extraction
  ├── HSV conversion (lighting-robust hue)
  └── CIELAB conversion (perceptual uniformity)
→ Statistical Aggregation (dominant, distribution, variance) →
→ Lighting Condition Detection →
→ Parameter Correlation (vs chassis specs) →
→ Confidence Score + Suggested Adjustments
```

### Implementation Candidates

- **Canvas API** — Browser-native pixel access, no dependencies
- **color-convert / chroma-js** — JS color space conversion libraries
- **Custom CIELAB pipeline** — For perceptual distance calculations (Delta E)

## Initial Findings

*Populated as research progresses*

---

*This document captures the initial research phase. Update as exploration proceeds.*
