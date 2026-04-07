# Bonkhold

> Asset generation pipeline exploration for a top-down melee survival game.

## Status

- **Phase:** Exploration
- **Temperature:** Warm
- **Started:** 2026-04-05

## Overview

Bonkhold is a multiplayer survival game developed externally — combining Rust's full-loot stakes with A Link to the Past's combat readability. This studio project focuses specifically on exploring and spiking digital asset generation pipelines, methods, styles, and results. Jon is contributing creative content to the broader project.

The game world features three distinct visual layers that assets must serve: **Norse** (temporary player-built construction and fortifications), **Roman** (permanent keeps, roads, tunnels, and infrastructure), and **Deep** (endgame spaces with the strongest loot and mystery). Asset generation needs to maintain top-down readability while conveying environmental depth and architectural distinction between these layers.

The core challenge is discovering which generation pipelines produce assets that are visually legible at gameplay zoom, stylistically cohesive across layers, and expressive enough to communicate the game's authored-world design.

## Hypotheses

- **H1:** AI-augmented asset generation pipelines can produce top-down game assets that maintain visual readability across distinct architectural layers (Norse, Roman, Deep) while achieving a consistent art style suitable for multiplayer survival gameplay.
  - **Validation:** Generated assets are visually distinguishable by layer, readable at gameplay zoom levels, and stylistically cohesive when placed together in a scene composition.

## Game Context

### Design Pillars
1. Every encounter matters (full-loot PvP)
2. Skill wins fights (top-down melee readability)
3. Fight over authored places (claimable structures)
4. PvP feeds PvE feeds PvP (territory controls dungeon access)
5. Nothing is permanent (monthly wipes)

### Visual Layers
- **Norse:** Temporary player additions — tools, repairs, fortifications
- **Roman:** Permanent infrastructure — keeps, roads, tunnels, walls
- **Deep:** Endgame spaces — strongest loot, strongest mystery

### References
- Rust, A Link to the Past, Adventures of Elliot (HD-2D), Dark Age of Camelot

## Project Structure

### Documentation
- `/docs/studio/bonkhold/README.md` - This file
- `/docs/studio/bonkhold/exploration/` - Research and conceptual docs
- `/docs/studio/bonkhold/exploration/definitions.md` - Glossary
- `/docs/studio/bonkhold/exploration/research.md` - Pipeline research

### Code (when prototype phase begins)
- `/components/studio/prototypes/bonkhold/` - Prototype components

## Next Steps

1. Survey existing asset generation approaches (tiled, procedural, AI-augmented)
2. Define asset categories and requirements per visual layer
3. Spike initial generation pipelines
4. Evaluate output readability and style cohesion

---

**Started:** 2026-04-05
**Status:** Exploration
