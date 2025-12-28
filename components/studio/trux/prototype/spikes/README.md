# Trux Spikes

This directory contains discrete experimental spikes for validating core Trux hypotheses.

## Structure

Each spike is a standalone page that can be accessed via `/studio/trux/spikes/{id}`:

- `index.tsx` - Navigation index listing all spikes
- `spike-0.1.tsx` - Matter.js Suspension Feel
- `spike-0.2.tsx` - Mid-Air Rotation Control
- `spike-1.1.tsx` - Procedural Terrain Generation
- `spike-1.2.tsx` - Terrain as Matter.js Bodies
- `spike-1.3.tsx` - Auto-Scrolling Camera
- `spike-1.4.tsx` - Crash Detection
- `spike-2.1.tsx` - Vehicle Customization Impact
- `spike-2.2.tsx` - Tuning → Gameplay Feedback Loop
- `spike-3.1.tsx` - Monochrome Aesthetic
- `spike-3.2.tsx` - Playtest & Tune

## Spike Protocol

Before starting:
1. Read the hypothesis and success criteria from ROADMAP.md
2. Set a timer for the specified duration
3. Build minimum code to test the hypothesis

During:
1. Focus only on validation, not code quality
2. Record observations as you go
3. Don't over-engineer

After:
1. Evaluate against success criteria (pass/fail)
2. Document results in implementation-notes.md
3. Update spike status in index.tsx
4. Decide: proceed, pivot, or abandon

## Status Tracking

Update spike status in `index.tsx`:
- `pending` - Not started
- `in-progress` - Currently working on
- `passed` - Hypothesis validated
- `failed` - Hypothesis rejected, pivot needed
