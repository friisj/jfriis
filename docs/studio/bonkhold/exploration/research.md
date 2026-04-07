# Bonkhold - Initial Research

> Landscape survey and foundational research for asset generation pipelines.

---

## Problem Space

Bonkhold's hand-authored island needs assets across three visually distinct layers (Norse, Roman, Deep) that maintain top-down readability while conveying environmental depth. The challenge: finding generation pipelines that produce assets which are legible at gameplay zoom, stylistically cohesive, and expressive enough to differentiate architectural eras.

Traditional hand-drawn asset creation is slow and expensive. AI-augmented pipelines could accelerate iteration — but game assets have strict technical requirements (tiling, consistent scale, palette coherence) that general-purpose image generation often violates.

## Prior Art

| Approach | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| Traditional pixel art | Perfect control, proven readability | Slow, expensive, hard to iterate | Baseline quality target |
| Stable Diffusion + ControlNet | Flexible style, rapid iteration | Inconsistent tiling, scale drift | High — primary pipeline candidate |
| Midjourney concept art | Strong aesthetic, good for mood boards | Not directly game-ready, no tiling | Medium — style exploration |
| Procedural generation (WFC) | Perfect tiling, infinite variation | Limited artistic expression | Medium — post-processing stage |
| Aseprite + AI assist | Artist-in-the-loop, pixel-perfect | Slower than pure generation | High — hybrid pipeline candidate |

## Key Questions

1. Which generation models handle top-down perspective most reliably?
2. Can style consistency be maintained across the three visual layers while keeping them distinguishable?
3. What's the minimum human intervention needed to make generated assets game-ready?
4. How do tiling constraints interact with generation quality?
5. What prompt engineering patterns produce the best top-down game assets?
6. Can a single pipeline serve all three layers, or does each need a different approach?

## Initial Findings

*Populated as research progresses.*

---

*This document captures the initial research phase. Update as exploration proceeds.*
