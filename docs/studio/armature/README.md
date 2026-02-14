# Armature

> A browser-based Three.js tool for shaping and posing a human character model, inspired by traditional artist armatures.

## Status

- **Phase:** Exploration
- **Temperature:** Hot
- **Started:** 2026-02-14

## Overview

Armature is a lightweight, browser-based posable figure tool built with Three.js. It gives artists a digital equivalent of the wooden artist mannequins found in studios — but with the ability to modify anatomy (proportions, body type) and manipulate poses via a rigged character model.

Existing solutions fall into three buckets, all of which leave gaps: full 3D suites (too complex for quick reference), static reference images (too rigid), and simple posable tools (lacking meaningful body modification). Armature sits at the intersection — simple enough to pick up instantly, flexible enough to shape the figure you actually need.

The core challenge is resolving two distinct but intertwined interaction models: anatomy modification (changing what the figure looks like) and pose manipulation (changing how the figure is positioned). Getting both right — and making them feel seamless together — is the central design problem.

## Hypotheses

- **H1:** A rigged Three.js character with separate interaction modes for anatomy modification and pose manipulation can provide artists with a usable, lightweight alternative to full 3D suites for figure reference.
  - **Validation:** Users can shape a figure's proportions and pose it in under 60 seconds without prior instruction.

## Current Focus

Resolve the two core interaction models — anatomy modification and pose manipulation — on a rigged Three.js character.

## Project Structure

### Documentation
- `/docs/studio/armature/README.md` - This file
- `/docs/studio/armature/exploration/` - Research and conceptual docs
- `/docs/studio/armature/exploration/definitions.md` - Glossary
- `/docs/studio/armature/exploration/research.md` - Initial research

### Code (when prototype phase begins)
- `/components/studio/prototypes/armature/` - Prototype components

## Next Steps

1. Complete initial research — survey existing posable figure tools and Three.js rigging approaches
2. Define key terms (armature, rig, anatomy modification, pose manipulation)
3. Map the interaction model: how do anatomy edits and pose edits coexist?
4. Identify Three.js libraries/approaches for skeletal animation + mesh deformation
5. Validate H1 with a minimal rigged figure prototype

---

**Started:** 2026-02-14
**Status:** Exploration
