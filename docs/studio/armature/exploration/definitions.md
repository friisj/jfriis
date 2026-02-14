# Armature - Definitions

> Glossary of terms specific to this project. Maintain as concepts evolve.
> Updated 2026-02-14 after research phase.

---

## Core Terms

| Term | Definition | Example |
|------|-----------|---------|
| Armature | A posable skeletal framework used as a reference for drawing figures. Traditionally a wooden/wire mannequin; here, a digital equivalent. | The jointed wooden figures found in art supply stores |
| Rig | The skeletal hierarchy (bones + joints) that drives mesh deformation when posing a character. | A humanoid skeleton with ~20 bones controlling a mesh |
| Shape mode | The discrete interaction mode for modifying the figure's proportions and body type (e.g., limb length, torso width, body mass). Terminology pending — candidates: "Shape", "Body Shape", "Body", "Build". See research Area 1. | Adjusting sliders to make the figure taller, broader, or more muscular |
| Pose mode | The discrete interaction mode for rotating joints and positioning limbs to place the figure in a specific stance or gesture. | Dragging a hand to a new position; rotating an elbow joint |
| Hot-swap | Non-destructive switching between Shape and Pose modes. Both systems stay live; switching changes which accepts input, not which states exist. | Shape a figure, pose it, reshape it, return to the same pose — no data loss |
| Mesh deformation | How the visible surface (mesh) stretches and bends in response to bone/joint movement or morph target application. | Skin stretching around an elbow as the arm bends |
| Morph targets / Blend shapes | Pre-defined mesh deformations that can be blended via sliders to modify body shape. Applied before skinning per glTF 2.0 spec. | A "muscular" shape blended with a "tall" shape |
| Inverse kinematics (IK) | A posing method where you move an end effector (e.g., a hand) and the system calculates intermediate joint angles automatically. | Dragging a hand to a position and having the elbow/shoulder follow naturally |
| Forward kinematics (FK) | A posing method where you rotate each joint individually in the chain from root to tip. | Rotating the shoulder, then the elbow, then the wrist separately |
| Always-live layered stack | The architecture where shape params and pose params are always applied simultaneously at render time (morphs before skinning), with only the active input layer switching between modes. | Shape state (morph weights + bone scales) composed with pose state (joint rotations) every frame |
| Angle preservation | The invariant where joint rotations stay fixed when shape changes — hand/foot world positions may drift if limb lengths change. | Lengthening an arm keeps the elbow angle but the hand moves outward |
| Contact preservation | The invariant where selected end-effectors stay pinned in world space when shape changes — IK re-solves intermediate joints. | Lengthening an arm keeps the hand on the hip but the elbow adjusts |

---

## Related Concepts

| Concept | Relationship to This Project |
|---------|------------------------------|
| Three.js SkinnedMesh | The Three.js primitive for rendering a mesh controlled by a skeleton — core rendering approach |
| glTF / GLB | Standard 3D file format for the base character model and rig. glTF 2.0 spec defines morph-before-skin ordering that supports the layered stack architecture |
| TransformControls | Three.js gizmo control for rotating/translating bones — key interaction element for pose mode [13] |
| CCDIKSolver | Three.js official addon for CCD-based IK on SkinnedMesh — candidate for IK posing [14]. Known integration friction with non-MMD rigs [15] |
| Bone constraints | Rules limiting joint rotation ranges to anatomically plausible values |
| Mode slip | UX failure where user acts without realizing which mode is active. Mitigated by redundant visual indicators (NN/g [25]) |
| MakeHuman | Open-source parametric human generator; exports CC0 models. Candidate for v0 base model [19] |

---

*Add terms as they emerge during exploration. Precise definitions prevent confusion in later phases.*
