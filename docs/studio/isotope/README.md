# Isotope

**Status:** Draft | **Temperature:** Warm
**DB ID:** `a2f0d07f-dc89-423d-9311-b084215c6c60`

AI-augmented, fixed-perspective 3D sketching tool that lets creators draw buildings, machines, environments and more in layered, interactive compositions — as if they're developing component-based software interfaces.

---

## Problem

Existing 3D tools (Blender, SketchUp) demand steep learning curves and free-camera navigation that overwhelms casual creators. 2D tools lack depth and spatial relationships. There is no tool that makes 3D composition feel as fast and intuitive as sketching on paper.

## Success Criteria

A creator can open Isotope cold and produce a satisfying isometric scene within their first 10 minutes, without instruction. The sketching experience is described as fluid, not like CAD.

## Out of Scope

Full 3D modelling, animation, photorealistic rendering, free-camera navigation, multi-user collaboration.

---

## Current Focus

**Core interaction model — does it feel good to sketch with?**

Nothing else matters until this is answered. The hypotheses below are sequenced to validate the interaction model and control system before investing in features, AI, or visual polish.

---

## Hypotheses

| # | Statement | Status |
|---|-----------|--------|
| H1 | Fixed isometric perspective eliminates camera management overhead and increases creative throughput | proposed |
| H2 | Magnetic snap-to-grid feels assistive rather than restrictive | proposed |
| H3 | Sub-16ms input-to-render latency is the threshold for sketch feel (vs CAD feel) | proposed |
| H4 | Component metaphor maps to the mental model of design-tool-familiar creators | proposed |
| H5 | AI assistance must be non-blocking — any gesture interruption causes more harm than the help is worth | proposed |
| H6 | AI assistance at natural pause points (end-of-stroke, idle, explicit prompt) measurably accelerates scene composition without reducing sketch feel rating | proposed |

See [definitions.md](./definitions.md) for key terms.

---

## Navigation

- `definitions.md` — Glossary of Isotope-specific terms
- `docs/studio/isotope/` — All project documentation lives here

## Links

- Admin: `/admin/studio/a2f0d07f-dc89-423d-9311-b084215c6c60/edit`
- Web: `/studio/isotope`
