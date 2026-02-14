# Armature - Initial Research

> Landscape survey and foundational research for the project.

---

## Problem Space

Artists need quick, flexible figure reference for drawing and illustration. The current options create friction:

- **Full 3D suites** (Blender, ZBrush, DAZ Studio): Powerful but heavy. Steep learning curve, slow to launch, overkill for "I need a reference pose."
- **Static reference images** (Pinterest boards, pose books): No adjustability. Can't match the exact proportions or angle needed.
- **Simple posable tools** (Posemaniacs, Magic Poser, JustSketchMe): Better, but most lack meaningful anatomy modification. The figure is what it is.
- **Physical mannequins**: Limited pose range, fixed proportions, no undo.

The gap: a tool that's as quick to use as a simple poser, but lets you shape the body you're actually drawing.

## Prior Art

| Approach | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| **JustSketchMe** | Browser-based, clean UI, pose presets | Limited anatomy modification, subscription model | Closest competitor — shows market demand |
| **Magic Poser** | Good pose control, multiple figures | Mobile-first, anatomy locked to presets | Validates pose manipulation patterns |
| **Posemaniacs** | Free, huge pose library | Static images, no interaction | Shows need but not the solution |
| **DAZ Studio** | Deep anatomy customization, high fidelity | Desktop app, massive learning curve, heavy | Gold standard for anatomy modification, wrong UX weight class |
| **Blender (ManuelBastioniLab/MB-Lab)** | Open source, parametric body generation | Requires Blender knowledge, not browser-based | Proves parametric anatomy is viable |
| **Three.js examples (skinning)** | Browser-native, good performance | Demo-grade, no UX for artists | Proves the tech stack works |

## Key Questions

1. **Interaction model**: How should anatomy modification and pose manipulation coexist? Separate modes? Unified? Context-dependent?
2. **Base model**: Build a custom low-poly rig, or start from an existing glTF humanoid? What level of mesh detail is "enough"?
3. **Anatomy approach**: Blend shapes (morph targets) vs. procedural bone scaling vs. a hybrid? What gives the best results with manageable complexity?
4. **Pose UX**: IK, FK, or both? Gizmos, drag handles, or joint-clicking? What feels most natural for artists (not animators)?
5. **Performance**: What's the polygon/bone budget for smooth interaction on mid-range hardware in a browser?
6. **Scope boundary**: Where does "posable mannequin" end and "character creator" begin? How do we stay on the right side of that line?

## Initial Findings

*Populated as research progresses.*

---

*This document captures the initial research phase. Update as exploration proceeds.*
