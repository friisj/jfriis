# Luv 3D Viewer — Shape Key Alignment & Chassis Tab

## Context
- 32 DB modules with 606 params (4-tier hierarchy: Frame→Volume→Surface→Dynamics)
- 52 injected shape keys (continuous basis axes across 5 body regions)
- character-control.ts hardcoded to 7 old module slugs
- No mapping from new expanded params to shape keys

## Steps

### Step 1: Shape Key Composition Registry
Create `lib/luv/shape-key-registry.ts` — central mapping of chassis params to shape key weights.

- **Enum compositions**: `{module}.{param}` → enum value → `Record<shapeKey, weight>`
- **Direct morphs**: range/measurement params → single shape key (weight = normalized value)
- **Material mappings**: color/enum params → material properties (keep existing logic)
- **Bone mappings**: body proportion enums → bone scale/position (keep existing logic)

Cover: nose (8 axes), skeletal (10), eyes+brows (12), mouth (10), body (12).

### Step 2: Dynamic Control API
Rewrite `character-control.ts` to:
- Import compositions from registry instead of hardcoded tables
- For each module, iterate param schemas and apply by type
- Support all 32 modules (geometry params get shape keys, others stay as gaps)

### Step 3: Update Schema Registry
`chassis-schemas/index.ts` becomes a thin wrapper that prefers DB schemas over code schemas.
The viewer page already fetches from DB — this step ensures the control API works with whatever schemas the DB provides.

### Step 4: Chassis Tab in Viewer
Add to `control-sidebar.tsx`:
- New 'Chassis' tab grouped by category (frame, body, face, coloring)
- Enum → `<select>`, color → `<input type="color">`, range → `<input type="range">`
- Changes update module params → `chassisToCharacterState()` → model updates

## Shape Key Inventory (52 basis axes)

**Nose (8):** bridge_width, bridge_depth, bridge_height, tip_height, tip_projection, nostril_width, nostril_height, size
**Skeletal (10):** jaw_width, jaw_angle, chin_projection, chin_height, chin_width, cheekbone_prominence, cheekbone_height, forehead_height, forehead_width, temple_width
**Eyes (7):** eye_width, eye_height, eye_tilt, eye_depth, eye_spacing, eyelid_fold, eyelid_crease_height
**Brows (5):** brow_height, brow_arch, brow_thickness, brow_spacing, brow_tilt
**Mouth (10):** mouth_width, mouth_upper_fullness, mouth_lower_fullness, mouth_upper_height, mouth_lower_height, mouth_corner_height, mouth_projection, mouth_cupid_bow, mouth_dimple_depth, mouth_size
**Body (12):** torso_width, waist_width, chest_depth, shoulder_width, hip_width, breast_size, breast_height, thigh_width, calf_width, upper_arm_width, forearm_width, overall_mass
