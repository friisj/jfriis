# Armature

> A browser-based Three.js tool for shaping and posing a human character model, inspired by traditional artist armatures.

## Status

- **Phase:** Exploration — decisions made, ready for prototype
- **Temperature:** Hot
- **Started:** 2026-02-14

## Overview

Armature is a lightweight, browser-based posable figure tool built with Three.js. It gives artists a digital equivalent of the wooden artist mannequins found in studios — but with the ability to modify body shape (proportions, body type) and manipulate poses via a rigged character model.

Existing solutions fall into three buckets, all of which leave gaps: full 3D suites (too complex for quick reference), static reference images (too rigid), and simple posable tools (lacking meaningful body modification). Armature sits at the intersection — simple enough to pick up instantly, flexible enough to shape the figure you actually need.

## Core Architecture

Two **discrete interaction modes** with non-destructive hot-swap:

1. **Shape mode** — modify the figure's proportions and body type (terminology pending final decision)
2. **Pose mode** — manipulate joint rotations and limb positions

Both systems stay live at all times. Switching modes changes which system accepts input, not which states exist. Shape is applied before pose at render time (morph targets before skinning, per glTF 2.0 spec).

## Research Summary

Research completed 2026-02-14. Full findings in `/docs/studio/armature/exploration/research.md`.

### Decisions Made

| Area | Decision |
|------|----------|
| Shaping mode name | **Shape** (pairs as "Shape & Pose") |
| Shaping implementation | **Hybrid** (macro bone scaling + corrective morph targets) |
| Pose input | **Both IK + FK from start** |
| Shape↔Pose behavior | **Reset to default pose on shape change; re-apply pose after** |
| Base model for v0 | **MakeHuman CC0 export** |
| Mode-switching UX | **Two-tab segmented control** + always-live state + unified undo |

### Must Prototype to Resolve

- Shape control budget (morph target count vs. perf on real devices)
- Reset-to-default UX feel (does reverting pose on shape change feel natural?)
- IK + FK coexistence (confusion vs. power in v0)
- Minimum viable mesh fidelity (lowest detail that's still useful for artist reference)

## Hypotheses

- **H1:** A rigged Three.js character with discrete, hot-swappable modes for body shaping and pose manipulation can provide artists with a usable, lightweight alternative to full 3D suites for figure reference.
  - **Validation:** Users can shape a figure's proportions and pose it in under 60 seconds without prior instruction.

## Project Structure

### Documentation
- `/docs/studio/armature/README.md` — This file
- `/docs/studio/armature/exploration/research.md` — Full research findings (6 areas, options tables, recommendations)
- `/docs/studio/armature/exploration/definitions.md` — Glossary (12 core terms + 7 related concepts)

### Code (when prototype phase begins)
- `/components/studio/prototypes/armature/` — Prototype components

## Next Steps

1. ~~Make decisions on the 6 pending areas~~ Done
2. Source v0 base model — export a MakeHuman CC0 figure as GLB with rig + morph targets
3. Prototype: load GLB in Three.js, render SkinnedMesh, verify morph target + skinning pipeline
4. Prototype: Shape mode — slider UI driving morph weights + bone scale params
5. Prototype: Pose mode — FK gizmos (TransformControls on bones) + IK end-effectors (CCDIKSolver)
6. Prototype: two-tab mode switch with reset-to-default-on-shape-change behavior
7. User test: rapid shape/pose cycling to validate hot-swap, mode slips, and reset UX feel

---

**Started:** 2026-02-14
**Status:** Exploration — decisions made, ready for prototype
