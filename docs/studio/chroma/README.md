# Chroma

> Multi-space color analysis toolkit for validating AI-generated imagery against parametric specifications.

## Status

- **Phase:** Exploration
- **Temperature:** Warm
- **Started:** 2026-03-12

## Overview

Vision models excel at object recognition and scene understanding but demonstrate significant limitations in precise color analysis. When a parametric character system specifies amber eyes (#D4A857), generated images consistently appear "green" to vision models due to lighting context, undertone layering, and oversimplified RGB-only analysis.

Chroma explores whether multi-space color analysis (RGB + HSV + CIELAB) with regional sampling and lighting compensation can provide objective, quantitative color validation that outperforms vision model descriptions. The toolkit would integrate as a post-generation analysis step — extracting precise color data from defined image regions and correlating it against parametric specifications.

The broader opportunity extends beyond identity systems to medical imaging, industrial quality control, and professional creative tools wherever precise computational color measurement matters.

## Hypotheses

- **H1:** Multi-space color analysis (RGB + HSV + CIELAB) with regional sampling and lighting compensation can objectively validate generated image colors against parametric specifications more accurately than vision model descriptions
  - **Validation:** Eye-dropper analysis of generated amber eyes correctly identifies warm amber tones where vision models misclassify as green; color match confidence scores correlate with human perception in blind tests

## Project Structure

### Documentation
- `/docs/studio/chroma/README.md` - This file
- `/docs/studio/chroma/exploration/` - Research and conceptual docs
- `/docs/studio/chroma/exploration/definitions.md` - Glossary
- `/docs/studio/chroma/exploration/research.md` - Initial research

### Code (when prototype phase begins)
- `/components/studio/prototypes/chroma/` - Prototype components

## Key Relationships

- **Luv** — Primary consumer. Chroma addresses the amber-vs-green eye color misclassification problem discovered during Luv's image generation validation.

## Next Steps

1. Complete initial research and exploration
2. Define key terms and concepts (color spaces, undertone models, lighting normalization)
3. Validate H1 with manual multi-space sampling of Luv-generated images
4. Design the `analyze_image_colors` function specification
5. Implement the prototype component

---

**Started:** 2026-03-12
**Status:** Exploration
