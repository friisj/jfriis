# Iris - Initial Research

> Landscape survey and foundational research for the project.

---

## Problem Space

No existing tool allows parametric, real-time generation of photorealistic irises with scientific accuracy. Medical imaging captures real irises but offers no generative control. Game/film VFX eyes prioritize efficiency over anatomical fidelity. AI image generators can produce eyes but with no structural understanding or parametric control over anatomy.

The gap: a tool that combines anatomical accuracy with generative flexibility, producing irises that are both scientifically grounded and artistically controllable.

## Prior Art

| Approach | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| Lefohn et al. (2003) "Ocularist's Approach" | Physically-based iris rendering, layered model | Static, offline rendering | Foundational shader architecture |
| Francois et al. iris shader (Shadertoy) | Real-time, procedural, visually convincing | Simplified anatomy, no parametric API | Proves procedural approach viable |
| Unreal Engine eye shader | Production-quality, subsurface scattering | Tied to UE ecosystem, limited parametric control | Reference for PBR eye rendering |
| Unity HDRP eye shader | Cross-platform, configurable | Less photorealistic than UE approach | Alternative reference |
| AI portrait generators (Midjourney, DALL-E) | Photorealistic at portrait scale | No anatomical control, inconsistent close-up | Potential integration target |
| Medical iris databases (CASIA, UBIRIS) | Real anatomical reference data | Not generative, privacy constraints | Validation reference |

## Key Questions

1. What is the minimum set of anatomical features needed for convincing iris rendering?
2. Can procedural shaders alone achieve photorealism, or is AI texture synthesis essential?
3. What parameterization best maps to natural iris variation (genetics, age, lighting)?
4. How do we handle corneal refraction and the liquid meniscus at the iris-cornea interface?
5. What's the right balance between real-time performance and visual fidelity?

## Initial Findings

*Populated as research progresses*

---

*This document captures the initial research phase. Update as exploration proceeds.*
