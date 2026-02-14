# Armature - Research Findings

> Landscape survey, technical options analysis, and architectural research.
> Research conducted 2026-02-14. Sources indexed at bottom.

---

## Problem Space

Artists need quick, flexible figure reference for drawing and illustration. The current options create friction:

- **Full 3D suites** (Blender, ZBrush, DAZ Studio): Powerful but heavy. Steep learning curve, slow to launch, overkill for "I need a reference pose."
- **Static reference images** (Pinterest boards, pose books): No adjustability. Can't match the exact proportions or angle needed.
- **Simple posable tools** (Posemaniacs, Magic Poser, JustSketchMe): Better, but most lack meaningful body shaping. The figure is what it is.
- **Physical mannequins**: Limited pose range, fixed proportions, no undo.

The gap: a tool that's as quick to use as a simple poser, but lets you shape the body you're actually drawing.

## Prior Art

| Approach | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| **JustSketchMe** | Browser-based, clean UI, pose presets | Limited body shaping, subscription model | Closest competitor — shows market demand |
| **Magic Poser** | Good pose control, multiple figures | Mobile-first, body locked to presets | Validates pose manipulation patterns |
| **Posemaniacs** | Free, huge pose library | Static images, no interaction | Shows need but not the solution |
| **DAZ Studio** | Deep body customization, high fidelity | Desktop app, massive learning curve, heavy | Gold standard for body shaping, wrong UX weight class |
| **Blender (MB-Lab)** | Open source, parametric body generation | Requires Blender knowledge, not browser-based | Proves parametric shaping is viable |
| **Clip Studio Paint** | "Change body shape" per-part adjustments, pose materials | Not standalone, embedded in paint app | Validates shape+pose workflow for illustrators |
| **MakeHuman** | Slider-driven, CC0 export, interpolation engine | Desktop app, not browser-based | Proves slider-driven shaping UX; viable v0 model source |
| **Three.js examples (skinning)** | Browser-native, good performance | Demo-grade, no UX for artists | Proves the tech stack works |

---

## Area 1: Shaping Mode Terminology

"Anatomy" overpromises medical/scientific accuracy. Industry survey shows tools use plain language: DAZ uses "Shaping Presets" [3], Clip Studio uses "Change body shape" [4], MakeHuman uses slider descriptions [5].

| Term | Strengths | Weaknesses | Risk | Verdict |
|------|-----------|------------|------|---------|
| **Body Shape** | High clarity for illustrators; matches Clip Studio's language [4]. Pairs cleanly: "Body Shape & Pose" | Slightly longer label | Low: UI brevity only | **Viable** |
| **Shape** | Short; maps to morph/blend-shape mental model; aligns with DAZ "Shaping" [3] | Can be generic in 3D apps ("shape" of anything) | Low–Medium: occasional ambiguity | **Viable** |
| **Body** | Extremely direct; strong in two-tab system ("Body / Pose") | Can invite feature creep ("body editor" expectations: face, hair, clothing) | Medium: scope pressure | **Viable** |
| **Build** | Communicates proportions/physique; friendly pairing ("Build & Pose") | Less standard; can skew toward "character creator" vibes | Medium: expectation creep | **Viable** |
| **Sculpt** | Strong verb; evokes "edit the form" | Overpromises: implies brush-based sculpting/topology editing (Blender Sculpt Mode [7]) | High: users expect a sculpt tool | **Marginal** |

**Recommendation ranking:**
1. Body Shape (best clarity + scope honesty)
2. Shape (best brevity, good pairing with Pose)
3. Body (clear but higher scope pressure)
4. Build (acceptable but stylized; watch creep)

**Critical unknown:** In a single-figure context, "Shape" reads clearly. In a future multi-object scene, it could be misread as generic object shaping. Resolve with hallway testing on actual UI.

**Decision needed:** Term selection for the shaping mode.

---

## Area 2: Body Shaping Implementation

### Technical invariant

glTF 2.0 specifies morph displacements (POSITION, NORMAL, TANGENT) are applied **before** skinning transforms [1]. This gives a canonical "shape first, then pose" composition rule at the spec level, which directly supports non-destructive hot-swap.

### Constraints

- glTF spec: implementations should support at least 8 morphed attributes; may use only the 8 highest-weight if more present [8]
- Three.js on WebGL 2: floating-point textures for morph targets (effectively unlimited up to texture size). WebGL 1: limited to ~4–8 active morph targets; zero-influence targets don't count [9]
- Binary glTF: base64 data URIs add ~33% size + decode time; multiple external resources add requests — both relevant to <3s load goal [2]

| Approach | Strengths | Weaknesses | Risk | Verdict |
|----------|-----------|------------|------|---------|
| **Morph targets (pre-authored)** | Best predictable visual quality; clean mapping to "body sliders"; spec-level shape→pose composition [1] | Authoring cost grows with slider count; asset size grows with per-vertex deltas; must manage active target budgets on low-end GPU paths [1][9] | Medium: pipeline + asset tuning | **Viable** |
| **Procedural bone scaling** | Lightweight state; fast runtime; covers macro proportion changes with few params | Can cause distortion; devs report artifact issues preserving radius/shape during bone lengthening [10] | Medium–High: artifacts undermine "anatomically useful" goal | **Viable (macro only)** |
| **Lattice / cage / FFD** | "Grab and pull" global edits without authoring many morphs | glTF export/import not straightforward; users report lattice deformation not playing after export to Three.js even after baking [11] | High: custom deformer + pipeline risk | **Marginal** |
| **Hybrid: macro bones + corrective morphs** | Bones handle proportion; morphs restore silhouette/volume at joints and body mass. Still composes with skinning predictably [1] | Requires rule system to prevent contradictory sliders (bone length vs. limb bulk) | Medium: design complexity, but bounded | **Viable (strong)** |
| **Custom JS FFD** | Off-the-shelf prototypes exist [12]; useful for "feel" experiments | Not production-hardened; doesn't solve pipeline alignment with skinned characters | High: maintenance + correctness | **Marginal** |

**Recommendation ranking:**
1. Hybrid (macro bones + corrective morphs) — best balance of flexibility and quality
2. Morph targets alone (if slider set kept intentionally small)
3. Bone scaling alone (only if stylization is acceptable and tightly constrained)
4. Lattice/FFD (only if "grab-shape" is a signature differentiator worth major scope)

**Critical unknown:** Shape control budget under combined constraints of sub-3s load and reliable 60fps. Must prototype with realistic worst-case device baseline.

**Decision needed:** Shaping implementation approach.

---

## Area 3: Pose Manipulation

### Three.js ecosystem

- **TransformControls**: Standard Three.js gizmo for transforming objects, modeled after DCC tool interactions [13]
- **CCDIKSolver**: Official addon, CCD-based IK for SkinnedMesh [14]. Integration friction reported — implementers have asked for generic SkinnedMesh examples beyond MMD usage [15]
- Clip Studio supports importing pose materials (full body, hands, sequences) [16]

| Approach | Strengths | Weaknesses | Risk | Verdict |
|----------|-----------|------------|------|---------|
| **FK joint rotation with gizmos** | Predictable, precise; easiest to implement; matches DCC models [13] | Slower for full-body posing; less intuitive for illustrators without helpers (mirroring, presets, constraints) | Medium UX risk for non-3D users | **Viable** |
| **IK end-effectors (drag targets)** | High speed, intuitive for "pose sketching"; maps to how artists think ("place hand here") | Needs joint limits, twist management, good defaults; can feel unstable with weak constraints | Medium: solver quality drives trust | **Viable** |
| **Hybrid IK/FK** | Best balance: IK for blocking, FK for refinement; maps to pro rigs but can be simplified | More state complexity; requires clear UI signifiers | Medium: UI clarity effort | **Viable (strong)** |
| **Pose library + light editing** | Very fast; aligns with "quick reference" positioning. Clip Studio supports this workflow [16] | Without strong editing tools, feels like browsing not creating | Low technical, medium product risk | **Viable** |

**Recommendation ranking:**
1. Hybrid IK/FK (artist speed + refinement)
2. IK end-effectors (minimal UI, high speed)
3. Pose library + tweaks (best for "reference" workflows)
4. FK-only gizmos (only if strong affordances and helpers added)

**Critical unknown:** Whether target audience prefers "drag the wrist" (IK) or "rotate joints" (FK) as primary input. Requires prototype testing with illustrators.

**Decision needed:** Pose input approach.

---

## Area 4: Shape + Pose Coexistence

### Core tension

Some poses become geometrically different when limb lengths and body volumes change. The question is what invariant to preserve:

- **Angle preservation**: Keep joint rotations identical; hand/foot world positions drift when limb lengths change
- **Contact preservation**: Keep selected end-effectors pinned; solve the rest via IK when shape changes

glTF morph ordering means morph targets don't inherently break posing (applied before skinning [1]). The harder edge case is bone scaling, which alters IK geometry and skinning behavior — implementers report coordinate/delta pitfalls ("freaky monster" outcomes) [17].

| Approach | Strengths | Weaknesses | Risk | Verdict |
|----------|-----------|------------|------|---------|
| **Always-live layered stack** (shape + pose params always applied; UI edits one at a time) | Cleanest non-destructive model; aligns with glTF morph-before-skin [1]. Mode switch requires no baking | Angle preservation means contacts drift when proportions change | Medium UX risk if users expect pinned contacts | **Viable** |
| **Pinned contacts + re-solve** (selectively preserve world-space targets) | Best perceived hot-swap behavior ("hand stays on hip") | Solver edge cases can feel like bugs; requires pin/lock UX concept | Medium–High: complexity and predictability | **Viable (bounded)** |
| **Mode-gated constraints** (disable contact locks while shaping, or warn) | Reduces surprising solver jumps; simpler mental model | Adds friction; can feel like the tool "fights" the hot-swap promise | Medium product risk | **Viable** |
| **Bake shape into new rest mesh** (apply morphs to vertices, rebuild skin) | Makes pose stable relative to new rest shape | Violates non-destructive spirit unless complex reversible baking maintained; heavy engineering | High scope creep | **Rejected** |

**Recommendation ranking:**
1. Always-live layered stack (baseline architecture)
2. Pinned contacts + re-solve (only when user explicitly pins)
3. Mode-gated constraints (fallback if testing shows confusion)
4. Bake rest mesh (avoid)

**Critical unknown:** What users expect as default invariant — angle vs. contact. Clip Studio supports both body-shape editing and pose materials [18], reinforcing artists combine these operations. The "right" behavior under limb-length changes depends on how often users rely on contacts (hand-on-hip, foot planted). Requires user testing.

**Decision needed:** Default preservation invariant (angle vs. contact).

---

## Area 5: Base Model Strategy

### Licensing realities

| Source | License | Redistribution | Notes |
|--------|---------|---------------|-------|
| **MakeHuman** | CC0 on exported models [19] | Free, commercial OK | Explicit FAQ: can sell exported models |
| **Mixamo** | Royalty-free [21] | Personal, commercial, non-profit | Must verify redistribution specifics |
| **Ready Player Me** | CC 4.0 (non-commercial as framed) [23] | Non-commercial only | Conflicts with commercial goals |
| **MB-Lab** | AGPL 3 on generated models [20] | AGPL distribution required | Incompatible with closed-source |

| Approach | Strengths | Weaknesses | Risk | Verdict |
|----------|-----------|------------|------|---------|
| **MakeHuman export (CC0)** | Fast start; CC0 supports redistribution/modification [19] | Mesh/rig may not be optimized for deformation stack; may require cleanup | Medium: asset pipeline time | **Viable** |
| **Custom commissioned model** | Perfect fit: topology, weights, morphs, rig all designed for exact UI and constraints | Up-front cost and schedule dependency | Medium: production risk, but technically clean | **Viable (strong)** |
| **Mixamo characters** | Quick access to rigged characters; royalty-free [21] | Not designed for body shaping sliders; shaping limited without re-authoring | Medium: licensing + tech fit | **Viable (guarded)** |
| **Ready Player Me** | Convenient GLB delivery, standardized skeleton [22] | Non-commercial CC 4.0 terms [23] | High: licensing/product risk | **Marginal** |
| **MB-Lab derived** | High-quality anatomy tooling, standardized skeleton [24] | AGPL 3 — incompatible with closed-source [20] | High: legal risk | **Rejected** |

**Recommendation ranking:**
1. Custom commissioned base (ideal long-term)
2. MakeHuman CC0 export for v0/v1 (validate UX fast, then replace) [19]
3. Mixamo as optional import/prototype path [21]
4. Ready Player Me (only if non-commercial compatible) [23]

**Critical unknown:** Minimum viable mesh fidelity needed for "anatomically useful to artists" while staying light for browser perf. Packaging choices matter — base64 embedding adds size and decode overhead [2]. Requires prototyping with real GLB payloads on representative devices.

**Decision needed:** Base model strategy for v0 prototype.

---

## Area 6: Discrete Mode Architecture & Hot-Swap UX

### Design decision (firm)

Two discrete modes — Shape and Pose — one active at a time. Hot-swap must be non-destructive: shape a figure, pose it, reshape it, return to the same pose state.

### Mode-slip research

NN/g documents that modes cause **mode slips** (users act without realizing which mode is active) and **low discoverability** of mode-specific features [25]. Mitigation requires:
- Clear visibility of current mode
- At least two redundant indicators (e.g., highlighted selector + cursor change + contextual panel) [25]

### Prior art in established tools

- **Photoshop**: Cursor icon changes, active tool darkened, contextual panel shows mode-relevant options — multiple parallel indicators [25]. Quick Mask Mode uses visible overlay + explicit exit behavior [26]
- **Blender**: Mode selector + mode-specific UI panels; shortcut opens pie menu of modes; toolbars/panels change per mode [27]
- **Figma**: Top-level tabs (Design/Prototype) with keyboard toggle (Shift+E). Third mode (Dev Mode) added later with toggle + shortcut (Shift+D) without breaking paradigm [28][29]

### Mode behavior baseline

To avoid mode slips, never fully hide the other mode's existence [25]:
- **In Pose mode**: Pose tools prominent; shaping controls collapsed or summarized (current preset name + "Edit" affordance)
- **In Shape mode**: Shaping sliders prominent; pose tools summarized (current pose name + "Edit Pose" affordance)

### Hot-swap architecture

Most robust baseline: **both systems stay live, only one accepts input**. Switching modes changes active input handlers and UI, not which states exist. Avoids lossy bake/restore cycles and supports instant toggling.

| Approach | Strengths | Weaknesses | Risk | Verdict |
|----------|-----------|------------|------|---------|
| **Top-level segmented control (two tabs) + always-live state** (Figma-like) | High discoverability; visually obvious; easy keyboard shortcut (like Figma's Shift+E) [28]. Always-live state supports non-destructive hot-swap | Switching costs a click unless you invest in shortcuts; needs viewport signifiers too | Low–Medium: mode slips if signifiers weak | **Viable (strong baseline)** |
| **Tool-based mode selection (Shape Tool / Pose Tool)** (Photoshop-like) | Familiar; supports multiple redundant indicators (cursor, highlight, contextual panel) [25] | Users may perceive "many tools," inviting proliferation and complexity | Medium: UI sprawl | **Viable** |
| **Contextual switching** (click bone → Pose; click body region → Shape) with explicit override | Extremely fast; maps to intent | High mode-slip risk if switching happens unexpectedly [25]. Requires very strong signifiers and confirmation affordance initially | Medium–High: confusion risk | **Viable (guarded)** |
| **Momentary hold-to-switch** (hold key to temporarily enter other mode) | Fast for experts; supports micro-iterations | Low discoverability; keyboard-only; weak on touch [25] | Medium: usability trap if primary | **Viable (accelerator only)** |

### Undo/redo

| Pattern | Strengths | Weaknesses |
|---------|-----------|------------|
| **Unified undo timeline** | Matches user expectation of "undo what I just did" regardless of mode; reduces "undo did nothing" confusion | Must display action labels ("Pose: rotate elbow", "Shape: torso width") for clarity |
| **Per-mode undo stacks** | Reduces cross-mode confusion | Violates common expectations during rapid shape/pose iteration |

**Recommendation:** Unified undo timeline with labeled actions.

### Third mode question

Camera/View is the natural third mode candidate. Scope-safe alternative: treat camera navigation as a temporary gesture (right-drag / two-finger pan) rather than a persistent mode, avoiding mode system expansion.

Mode persistence: remember last mode globally (default). If multi-figure support comes later, consider per-figure persistence.

**Recommendation ranking:**
1. Top-level two-mode tabs + always-live state + unified undo (explicit, extensible, supports accelerators) [30]
2. Tool-based mode selection with redundant indicators [25]
3. Contextual switching with explicit override (fast but needs heavy signifiers and onboarding) [25]
4. Momentary hold-to-switch (layer on top of primary, not standalone) [25]

**Critical unknown:** Which mode-switch pattern best balances speed and safety for illustrators. Requires usability test that intentionally induces mode slips (rapid reshape/repose cycles).

**Decision needed:** Mode-switching UX pattern.

---

## Decisions Required Before Prototyping

| # | Decision | Options | Research Recommendation |
|---|----------|---------|------------------------|
| 1 | Shaping mode name | Body Shape / Shape / Body / Build | Body Shape or Shape |
| 2 | Shaping implementation | Hybrid bones+morphs / Pure morphs / Bone scaling | Hybrid |
| 3 | Pose input method | Hybrid IK/FK / IK only / Pose library / FK only | Hybrid IK/FK |
| 4 | Default preservation invariant | Angle / Contact / Mode-gated | Angle (always-live stack) |
| 5 | Base model for v0 | MakeHuman CC0 / Custom / Mixamo | MakeHuman for v0 |
| 6 | Mode-switching UX | Tabs / Tool-based / Contextual / Momentary | Tabs + keyboard shortcut |

## Must-Prototype-to-Resolve

These cannot be answered by research alone:

1. **Shape control budget** — morph target count vs. performance on real devices under sub-3s load + 60fps constraints
2. **Angle vs. contact preservation** — what users expect when limb lengths change under an existing pose
3. **IK vs. FK preference** — whether illustrators prefer drag-the-wrist or rotate-joints as primary input
4. **Minimum viable mesh fidelity** — the lowest detail level that's still "anatomically useful" for artist reference

---

## Sources

1. glTF 2.0 Specification — https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
2. KHR_binary_glTF — https://kcoley.github.io/glTF/extensions/1.0/Khronos/KHR_binary_glTF/
3. DAZ Studio Shaping Documentation — https://docs.daz3d.com/public/software/dazstudio/4/userguide/chapters/shaping/start
4. Clip Studio: Adjusting body shape — https://help.clip-studio.com/en-us/manual_en/660_3d/Adjusting_a_3D_drawing_figure_body_shape.htm
5. MakeHuman: The sliders — https://static.makehumancommunity.org/oldsite/documentation/the_sliders.html
7. Blender Sculpt Mode — https://wiki.blender.jp/Doc:2.6/Manual/Modeling/Meshes/Editing/Sculpt_Mode
8. glTF 2.0 Specification (morph targets) — https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
9. Three.js: glTF morph animation retention limits — https://discourse.threejs.org/t/gltf-morph-animation-retention-limits/41762
10. Three.js: SkinnedMesh scaling — https://discourse.threejs.org/t/skinnedmesh-scaling/17033
11. Three.js: Import lattice deformation from Blender — https://discourse.threejs.org/t/import-lattice-deformation-from-blender/8691
12. glennchun/free-form-deformation — https://github.com/glennchun/free-form-deformation
13. Three.js: TransformControls docs — https://threejs.org/docs/pages/TransformControls.html
14. Three.js: CCDIKSolver docs — https://threejs.org/docs/pages/CCDIKSolver.html
15. Three.js: CCDIKSolver with generic SkinnedMesh — https://discourse.threejs.org/t/example-of-how-to-use-ccdiksolver-with-a-generic-skinnedmesh/9571
16. Clip Studio: Posing 3D drawing figures — https://help.clip-studio.com/en-us/manual_en/660_3d/Posing_3D_drawing_figures.htm
17. Three.js: Sharing skeleton between skinned meshes — https://discourse.threejs.org/t/sharing-a-skeleton-between-different-skinned-meshes/61189
18. Clip Studio: Adjusting body shape (pose materials) — https://help.clip-studio.com/en-us/manual_en/660_3d/Adjusting_a_3D_drawing_figure_body_shape.htm
19. MakeHuman FAQ: Selling models — https://static.makehumancommunity.org/oldsite/faq/can_i_sell_models_created_with_makehuman.html
20. MB-Lab License — https://mb-lab-docs.readthedocs.io/en/latest/license.html
21. Mixamo FAQ — https://helpx.adobe.com/ca/creative-cloud/faq/mixamo-faq.html
22. Ready Player Me: How it works — https://docs.readyplayer.me/ready-player-me/what-is-ready-player-me
23. Ready Player Me: Licensing — https://docs.readyplayer.me/ready-player-me/support/terms-of-use
24. MB-Lab: Pose — https://mb-lab-docs.readthedocs.io/en/latest/pose.html
25. NN/g: Modes in User Interfaces — https://www.nngroup.com/articles/modes/
26. Photoshop: Quick Mask — https://helpx.adobe.com/ca/photoshop/using/create-temporary-quick-mask.html
27. Blender: Edit Mode Basics — https://www.katsbits.com/codex/edit-mode-basics/
28. Figma: Guide to prototyping — https://help.figma.com/hc/en-us/articles/360040314193-Guide-to-prototyping-in-Figma
29. Figma: Guide to Dev Mode — https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode
30. Figma: Guide to prototyping (mode switching) — https://help.figma.com/hc/en-us/articles/360040314193-Guide-to-prototyping-in-Figma
