# Iris

> Parametric photorealistic ocular iris generator combining WebGL shaders with generative AI.

## Status

- **Phase:** Exploration
- **Temperature:** Hot
- **Started:** 2026-03-13

## Overview

Iris is a multi-stage project to build a tool for generating photorealistic, scientifically accurate 3D eyes with complete surface anatomy. The core challenge is bridging real-time WebGL rendering — for procedural iris microstructure, collarette patterns, crypts, and furrows — with image or video generation models that add the photorealistic surface quality of real biological tissue.

The end goal is a parametric tool where users can define an eye through natural language descriptions or direct slider controls, producing dynamic irises that hold up under extreme close-up examination. Parameters span the full anatomy: iris color and heterochromia patterns, pupil dilation, limbal ring definition, collarette shape, crypt density, stromal fiber visibility, and scleral vasculature.

This sits at the intersection of medical visualization, generative art, and shader programming — with potential applications in character design, prosthetics reference, biometric visualization, and ophthalmology education.

## Hypotheses

- **H1:** A hybrid rendering pipeline combining procedural WebGL shaders for iris microstructure with generative AI for photorealistic surface detail can produce examination-quality eye renderings that are both parametrically controllable and visually indistinguishable from macro photography.
  - **Validation:** Rendered irises pass visual comparison with macro photography references at 1:1 crop; parametric controls produce visually distinct and anatomically plausible variations.

## Project Stages

### Stage 1: Procedural Iris Shader
Build a WebGL/Three.js shader that renders the core iris structures procedurally — radial fibers, crypts, collarette, pigment distribution, limbal ring. Parametric controls for all features.

### Stage 2: Full Eye Geometry
Extend to complete 3D eye model — sclera, corneal refraction, anterior chamber depth, pupil mechanics, eyelid interaction. Camera controls for macro-to-portrait zoom range.

### Stage 3: AI Integration
Integrate image generation models to add photorealistic tissue quality — subsurface scattering, moisture, specular highlights on the corneal surface. Explore natural language control ("deep amber with gold flecks around the pupil").

### Stage 4: Dynamic & Interactive
Pupil dilation response to light, accommodation reflex, micro-saccades. Potentially video generation for animated sequences.

## Project Structure

### Documentation
- `/docs/studio/iris/README.md` - This file
- `/docs/studio/iris/exploration/` - Research and conceptual docs
- `/docs/studio/iris/exploration/definitions.md` - Glossary of ocular anatomy terms
- `/docs/studio/iris/exploration/research.md` - Prior art and reference research

### Code (when prototype phase begins)
- `/components/studio/prototypes/iris/` - Prototype components

## Next Steps

1. Research iris anatomy and microstructure in detail
2. Survey existing procedural iris rendering approaches (shaders, papers)
3. Define key anatomical terms and parametric dimensions
4. Build first procedural iris shader prototype
5. Collect macro photography references for validation

---

**Started:** 2026-03-13
**Status:** Exploration
