# Isotope — Definitions

Glossary of terms used in Isotope project documentation. Precision here prevents conceptual drift across iterations.

---

## Core Concepts

### Fixed Perspective
The canonical isometric viewpoint used throughout Isotope — a dimetric projection at a fixed angle (typically 2:1 pixel ratio). Creators cannot rotate the camera. This is a deliberate constraint, not a limitation. See H1.

### Sketch Feel
The subjective quality of an interaction model that makes digital drawing feel analogous to sketching on paper: low latency, forgiving input, immediate visual feedback, no modal interruptions. The opposite of "CAD feel" (precise, deliberate, mode-heavy). The primary quality gate for Isotope.

### CAD Feel
The opposing force to sketch feel. Characterised by: slow or modal input, visible error correction, precision over gesture, workflow interruptions. Any interaction that introduces CAD feel is a bug in Isotope's experience.

### Magnetic Snap
A snapping system where the cursor is pulled toward grid intersections or element edges with a configurable attraction radius. Distinct from hard snap (cursor locks to grid absolutely) and no snap (free-form). The goal is the cursor moving with the creator, not against them. See H2.

### Snap Threshold
The pixel radius within which magnetic snap activates. Below the threshold, the cursor moves freely. At or above it, the snap force engages. Tuning the threshold is the primary control system calibration task.

### Component
A named, reusable scene element — analogous to a component in Figma or a class in CSS. Components can be instanced multiple times, edited in place, and nested. The component model is what makes Isotope feel like building an interface rather than painting a picture. See H4.

### Layer
The vertical stacking order of components in a scene. Higher layers render in front. Layers are discrete (not continuous z-index) and are managed explicitly by the creator. Not the same as Photoshop layers — closer to a deck of cards with named sections.

### Scene
The full isometric composition — the canvas that a creator is building. A scene contains one or more components arranged across layers.

### Composition
The act of placing, arranging, and layering components in a scene. Composition is the primary creative activity in Isotope.

---

## AI Concepts

### AI Augmentation
The AI capabilities in Isotope — shape completion, component suggestions, style transfer. Augmentation means AI assists an existing creative act; it does not initiate or replace it.

### Non-Blocking AI
An AI interaction that does not interrupt the sketching gesture. Non-blocking AI is triggered explicitly (gesture, shortcut, deliberate pause) and never appears during an active stroke. See H5.

### Shape Completion
An AI feature that predicts and completes a partially-drawn isometric shape (e.g. finishes a box, a roof, a column). Triggered at the end of a stroke or on explicit request.

### Component Suggestion
An AI feature that recommends a named component based on what is being drawn (e.g. "this looks like a window — save as Window?"). Non-blocking; appears as a ghost suggestion the creator can accept or dismiss.

---

## Performance Concepts

### Input-to-Render Latency
The time from a pointer input event (mousedown, touchmove, stylus pressure) to the corresponding pixel appearing on screen. The target for sketch feel is <16ms (60fps). See H3.

### Frame Budget
16.67ms per frame at 60fps. The performance constraint within which all stroke rendering, scene composition, and AI processing must complete.

### Target Hardware
Mid-range modern hardware — baseline is an M1 MacBook Air. Performance claims are anchored to this profile.

---

## Validation Terms

### First-Use Observation
A structured session where a creator is given Isotope for the first time with no instruction, observed attempting a defined task. The primary method for validating interaction model hypotheses.

### Sketch Feel Rating
A subjective post-session score (1–5) for "did this feel like sketching or like CAD?" Collected via debrief. Anchored: 1 = pure CAD, 5 = pure sketch.
