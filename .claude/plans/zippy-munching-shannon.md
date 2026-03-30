# Luv 3D Viewer — Phase 2: Skeletal-First Composition Alignment

## What shipped (PR #241)
- Shape key composition registry (`shape-key-registry.ts`) — ~60 enum compositions
- Dynamic control API — iterates all 32 DB modules, applies by param type
- Chassis tab in viewer sidebar — tier-filtered controls per module
- Tech review fixes — heterochromia guard, bone scales, tier type, tests

## Problem
Compositions were authored against the **old 7-module param set**, not the expanded 606-param schemas. The 25 new modules (ears, teeth-smile, facial-details, facial-profile, hands, feet, etc.) have no compositions. Even the original modules gained new params during expansion (e.g., `nose` went from 5→17 params) that aren't covered.

## Approach: Skeletal-first, incremental
Audit each module's params against available shape keys. Add compositions where shape keys exist. For params that need new shape keys, add defs to `shape-key-defs/` and re-run `augment-model.mjs`. Prioritize by visual impact.

## Steps

### Step 5: Audit skeletal module (21 params → 10 shape keys)
The skeletal module is the foundation — face_shape, jawline, cheekbones, chin, forehead all have shape keys but several new params lack compositions:
- `face_length` — needs compositions using chin_height + forehead_height
- `jaw_width` — needs composition (has shape key `luv_jaw_width`)
- `forehead_slope` — needs composition using forehead_height
- `orbital_depth` — needs composition using eye_depth
- `zygomatic_width` — needs composition using cheekbone_prominence
- `mandibular_angle` — needs composition using jaw_angle
- `chin_projection` — needs composition (has shape key `luv_chin_projection`)
- `brow_ridge` — needs composition using brow_height + eye_depth
- Already covered: face_shape, cheekbones, jawline, chin, forehead, temple_width

Add missing compositions to `ENUM_COMPOSITIONS` in `shape-key-registry.ts`. Query DB for actual enum options per param.

### Step 6: Audit eyes + eyebrows modules (30 + 18 params → 12 shape keys)
New params needing compositions:
- `eyes.canthal_tilt` → luv_eye_tilt
- `eyes.palpebral_fissure` → luv_eye_height
- `eyes.epicanthic_fold` → luv_eyelid_fold
- `eyes.eye_depth` → luv_eye_depth
- `eyes.iris_pattern`, `lash_density`, `lash_curl` — no shape key (visual only)
- `eyebrows.taper`, `arch_position`, `length` — compose from existing brow keys

### Step 7: Audit nose module (17 params → 8 shape keys)
New params:
- `nose.dorsum` — compose from bridge_depth + bridge_height
- `nose.alar_width` — compose from nostril_width
- `nose.tip_rotation` — compose from tip_height
- `nose.septum_show` — compose from nostril_height
- `nose.nasofrontal_angle`, `nasolabial_angle` — need new shape keys or approximations
- `nose.skin_thickness` — no shape key (material property?)

### Step 8: Audit mouth module (18 params → 10 shape keys)
New params:
- `mouth.lip_fullness` — compose from upper/lower fullness
- `mouth.cupids_bow` — compose from cupid_bow
- `mouth.commissure_angle` — compose from corner_height
- `mouth.philtrum_length` — compose from upper_height
- `mouth.lip_texture`, `vermilion_border` — no shape key
- `mouth.gum_show`, `mouth_width_mm` — measurement, skip

### Step 9: Audit body modules (shoulders-neck, bust, torso, hips-pelvis, posterior, arms, upper-legs, lower-legs)
These modules have many params but only 12 body shape keys. Map the geometric params:
- `shoulders-neck.shoulder_mass` → luv_shoulder_width + luv_upper_arm_width
- `bust.size_descriptor`, `bust.projection`, `bust.position` → luv_breast_size + luv_breast_height
- `torso.waist_definition`, `torso.tummy` → luv_waist_width + luv_chest_depth
- `hips-pelvis.hip_shape`, `pelvic_width` → luv_hip_width
- `posterior.size` → luv_hip_width approximation
- `arms.upper_arm_shape`, `arms.forearm` → luv_upper_arm_width + luv_forearm_width
- `upper-legs.shape` → luv_thigh_width
- `lower-legs.calf_shape` → luv_calf_width

### Step 10: Persist chassis tab edits to DB
Currently param changes in the Chassis tab are local state only. Add save functionality:
- Debounced write to `luv_chassis_modules` via Supabase
- Or explicit "Save" button per module
- Version bump on save (existing versioning system)

## Not in scope (future sessions)
- New shape key defs for params with no existing basis axes
- Canonical Luv preset sculpting
- GLB optimization / Supabase Storage upload
- Ears, teeth-smile, facial-details, facial-profile, hands, feet compositions (no shape keys exist)
- T4 Dynamics modules (posture, movement, expression-range, voice, physiology) — behavioral, not geometric
