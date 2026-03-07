# Chassis Parameter Audit: Multi-Specialist Critique (v2)

**Current inventory**: 23 modules, ~318 parameters across face (7), body (12), coloring (2), extremities (1), carriage (1).

This report surveys the parameter space through 13 specialist lenses, identifies gaps, and proposes additions. A redundancy audit at the end resolves overlaps between specialist proposals.

---

## Current Module Map

| Category | Module | Params | Grade |
|----------|--------|--------|-------|
| Face | eyes | 22 | Specialist |
| Face | mouth | 18 | Specialist |
| Face | nose | 17 | Specialist |
| Face | skeletal | 21 | Specialist |
| Face | ears | 6 | Basic |
| Face | eyebrows | 6 | Basic |
| Face | facial-details | 6 | Basic |
| Body | frame (body-proportions) | 8 | Adequate |
| Body | shoulders-neck | 10 | Good |
| Body | bust | 17 | Specialist |
| Body | torso | 16 | Specialist |
| Body | hips-pelvis | 10 | Good |
| Body | posterior | 14 | Specialist |
| Body | groin | 12 | Specialist |
| Body | anus | 6 | Adequate |
| Body | upper-legs | 10 | Good |
| Body | lower-legs | 10 | Good |
| Body | feet | 14 | Good* |
| Body | arms | 10 | Good |
| Coloring | skin | 20 | Specialist |
| Coloring | hair | 21 | Specialist |
| Extremities | hands | 6 | Basic |
| Carriage | posture | 6 | Basic |

\* Feet is overgraded — see Podiatrist section.

---

## 1. Plastic Surgeon

**Perspective**: Facial harmony, proportional analysis, body contouring. Thinks in ratios, angles, and ideal-to-actual deviation.

### Already well-covered
- Facial thirds, facial index, bizygomatic/bigonial width (skeletal)
- Nasolabial angle, nasofrontal angle, tip projection (nose)
- Lip ratios, vermilion border, cupid's bow (mouth)
- Canthal tilt, interpupillary distance, palpebral dimensions (eyes)
- Breast ptosis, projection, underbust differential (bust)

### Missing — new module: `facial-profile`

The existing face modules describe features in isolation. This module captures how they relate in profile view, plus soft-tissue depth and aging markers that cross feature boundaries.

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `profile_type` | enum | basic | Straight, convex, concave — overall face profile classification |
| `cervicomental_angle` | enum | intermediate | Jawline-to-neck angle — defines jaw definition in profile (90–130°) |
| `mentolabial_fold` | enum | intermediate | Depth of the groove between lower lip and chin |
| `buccal_fat` | enum | intermediate | Fullness of the cheek below the cheekbone |
| `malar_fat_pad` | enum | advanced | Position and fullness of the mid-face fat pad — descends with age |
| `tear_trough` | enum | advanced | Depth of the groove from inner eye to mid-cheek — key aging marker |
| `nasolabial_fold` | enum | advanced | Depth of the nose-to-mouth groove |
| `marionette_lines` | enum | advanced | Lines from mouth corners downward |
| `jowls` | enum | advanced | Tissue laxity below the jawline |
| `facial_convexity_angle` | measurement | clinical | Glabella–subnasale–pogonion angle (~165–175°) |
| `lower_face_height` | measurement | clinical | Subnasale to menton |
| `midface_height` | measurement | clinical | Glabella to subnasale |

**Bust additions**

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `breast_base_width` | bust | advanced | Width of where breast contacts chest wall |
| `sternal_notch_to_nipple` | bust | clinical | Key surgical planning distance (~19–21cm) |
| `nipple_to_fold` | bust | clinical | Nipple to inframammary fold |
| `intermammary_distance` | bust | clinical | Distance between nipples — typically ≈ ½ biacromial width |

**Body ratio additions**

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `arm_span_to_height` | frame | clinical | Typically ≈1.0; marfanoid if >1.05 |
| `sitting_height_ratio` | frame | clinical | Sitting height / standing height |

### Verdict
Face modules are surgeon-grade for individual features but lack **inter-feature proportional analysis** and aging markers. Bust is close but missing surgical planning landmarks.

---

## 2. Orthopedic Specialist

**Perspective**: Skeletal alignment, joint mechanics, structural integrity. Thinks in degrees of angulation, load-bearing axes, and developmental variants.

### Already covered
- Leg alignment valgus/varus (lower-legs)
- Shoulder-to-hip ratio (shoulders-neck)
- General frame and build (frame)

### Missing — new module: `skeletal-alignment`

Spinal curvature and pelvic position — the structural foundation everything else hangs on.

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `cervical_lordosis` | enum | intermediate | Neck curvature — flat, normal, exaggerated |
| `thoracic_kyphosis` | enum | intermediate | Upper back curvature — flat, normal, exaggerated, Scheuermann's |
| `lumbar_lordosis` | enum | intermediate | Lower back curvature — flat, normal, exaggerated (hyperlordotic) |
| `scoliosis` | enum | intermediate | Lateral curvature — none, mild, moderate, S-curve, C-curve |
| `pelvic_tilt` | enum | intermediate | Anterior, neutral, posterior — profoundly affects posture and posterior projection |
| `rib_cage_shape` | enum | intermediate | Normal, barrel, funnel (pectus excavatum), pigeon (pectus carinatum), flared |
| `scapular_position` | enum | advanced | Neutral, protracted, retracted, winging — affects upper back silhouette |
| `spinal_length` | measurement | clinical | C7 to S1 — independent of total height |

### Missing — new module: `joints`

The current system has scattered joint references (knee shape in upper-legs, ankle shape in lower-legs, elbow in arms, wrist in arms) but no systematic joint-by-joint coverage of appearance, stability, and range of motion.

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| **Shoulder** | | | |
| `shoulder_rom` | enum | basic | Limited, average, full, hypermobile — overhead reach capacity |
| `shoulder_stability` | enum | intermediate | Tight, stable, slightly-loose, loose, subluxation-prone |
| `shoulder_click` | enum | advanced | None, occasional, frequent — popping/crepitus |
| **Elbow** | | | |
| `carrying_angle` | enum | intermediate | Narrow, average, wide, hyperextended — typically wider in women (10–15°) |
| `elbow_hyperextension` | enum | intermediate | None, slight, moderate, significant |
| `elbow_appearance` | enum | advanced | Smooth, dimpled, bony, soft, wrinkled — already in arms but lacks ROM |
| **Wrist** | | | |
| `wrist_flexibility` | enum | intermediate | Stiff, average, flexible, hypermobile |
| `wrist_ulnar_prominence` | enum | advanced | Smooth, subtle, visible, prominent — the bony bump on the outer wrist |
| **Hip** | | | |
| `hip_rom` | enum | basic | Limited, average, full, hypermobile — split/turnout capacity |
| `hip_click` | enum | advanced | None, occasional, frequent — common in women (snapping hip) |
| `femoral_anteversion` | enum | clinical | Neutral, mild-inward, significant-inward — affects knee/toe alignment |
| **Knee** | | | |
| `knee_hyperextension` | enum | intermediate | None, slight, moderate, genu-recurvatum — affects leg line in profile |
| `knee_appearance` | enum | intermediate | Bony, slim, average, rounded, dimpled — expand existing basic enum |
| `patella_position` | enum | advanced | Normal, laterally-tracking, high-riding (patella alta) |
| `q_angle` | enum | clinical | Narrow, average, wide, very-wide — quadriceps angle, wider in women |
| **Ankle** | | | |
| `ankle_rom` | enum | intermediate | Limited, average, full, hypermobile — dorsiflexion/plantarflexion |
| `ankle_stability` | enum | intermediate | Stable, slightly-loose, loose, sprain-prone |
| **Finger joints** | | | |
| `finger_joint_flexibility` | enum | intermediate | Stiff, average, flexible, hypermobile, double-jointed |
| `finger_joint_appearance` | enum | advanced | Smooth, subtle-knuckle, bony, prominent-knuckle, knotted |
| **Toe joints** | | | |
| `toe_flexibility` | enum | intermediate | Rigid, limited, average, flexible, prehensile |
| `toe_joint_appearance` | enum | advanced | Smooth, subtle, bony, prominent |
| **General** | | | |
| `joint_laxity` | enum | intermediate | None, mild, moderate, generalized-hypermobility (Beighton correlate) |
| `joint_sound_tendency` | enum | advanced | Silent, occasional-pop, frequent-cracking, dramatic |
| `leg_length_discrepancy` | enum | clinical | None, <5mm, 5–10mm, >10mm — affects gait |
| `tibial_torsion` | enum | clinical | Neutral, mild-inward, mild-outward — affects foot alignment |

### Verdict
**Major gap filled**. The original ortho section was spine-heavy and missed joints entirely. The `joints` module provides systematic coverage of appearance, ROM, stability, and quirks for every major joint chain. Combined with `skeletal-alignment`, these two modules provide the structural foundation that surface anatomy sits on.

---

## 3. Physiotherapist

**Perspective**: Movement quality, muscle function, flexibility, functional capacity. Thinks in range of motion, motor patterns, and compensation strategies.

### Already covered
- Default stance, gait, shoulder carriage, gesticulation (posture — basic)
- Muscle definition per region (various body modules)

### Missing — enhance `posture` + new module: `movement-dynamics`

**Posture enhancements**

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `sitting_posture` | enum | basic | Upright, relaxed, slouched, cross-legged, perched, lotus |
| `breathing_pattern` | enum | intermediate | Diaphragmatic, chest-dominant, shallow, deep — visible in torso movement |
| `resting_muscle_tone` | enum | intermediate | Low, normal, high, variable — visible as body tension |
| `dominant_side` | enum | basic | Left, right, ambidextrous |
| `recovery_posture` | enum | advanced | How the body settles after exertion — collapsed, draped, controlled, alert |
| `sleep_posture` | enum | advanced | Side, back, front, fetal — affects body impression descriptions |

**New module: `movement-dynamics`**

Merges the physio "movement" and robotics "kinematics" concerns into one module. How the body moves through space — quality, capacity, and gait mechanics.

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `movement_fluidity` | enum | basic | Mechanical, controlled, natural, fluid, dance-like, cat-like |
| `movement_confidence` | enum | basic | Hesitant, careful, confident, bold, commanding |
| `physical_energy` | enum | basic | Languid, calm, moderate, energetic, frenetic, explosive |
| `coordination` | enum | intermediate | Clumsy, average, coordinated, precise, extraordinary |
| `balance` | enum | intermediate | Unsteady, average, good, excellent, preternatural |
| `speed_quality` | enum | intermediate | Slow, measured, average, quick, mercurial |
| `strength_impression` | enum | intermediate | Fragile, delicate, average, strong, powerful |
| `center_of_mass` | enum | intermediate | Low (hip-heavy), average, high (chest-heavy) — affects balance and momentum |
| `step_length` | enum | intermediate | Short, average, long, very-long |
| `cadence` | enum | intermediate | Slow, measured, average, brisk, quick |
| `arm_swing` | enum | intermediate | None, minimal, moderate, full, exaggerated |
| `hip_sway` | enum | intermediate | None, subtle, moderate, pronounced, exaggerated |
| `ground_contact` | enum | advanced | Heel-strike, midfoot, forefoot |
| `stride_symmetry` | enum | advanced | Symmetric, slight-limp, noticeable-asymmetry |
| `movement_signature` | text | advanced | Characteristic patterns — "hip-led walk, touches hair when thinking" |
| `fidget_patterns` | text | advanced | Habitual micro-movements at rest |
| `spatial_awareness` | enum | advanced | Low, average, high, extraordinary |
| `gait_signature` | text | advanced | Distinctive walking pattern for identification |

**Regional flexibility** (add to `joints` module)

Rather than a single `overall_flexibility` enum, the joints module above covers ROM per joint. The physio contribution is ensuring it's there and systematic rather than adding a separate flexibility module. See joints module in section 2.

**Physical capacity params** (add to `frame` or `movement-dynamics`)

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `cardiovascular_fitness` | frame | intermediate | Sedentary, low, moderate, fit, athletic, elite |
| `endurance` | frame | intermediate | Low, limited, average, good, high, marathon-level |
| `agility` | movement-dynamics | intermediate | Clumsy, average, agile, very-agile, cat-like |
| `body_awareness` | movement-dynamics | intermediate | Low, average, good, excellent, dancer/gymnast-level |

### Verdict
Posture module is severely underdeveloped at 6 params. Movement is entirely absent. Merging physio and robotics perspectives into `movement-dynamics` gives one coherent module for locomotion, quality, and capacity. Regional flexibility is addressed joint-by-joint in the ortho `joints` module rather than as a separate system.

---

## 4. Make-up Artist

**Perspective**: Skin surface at close range, facial feature topology for enhancement, color theory, photography response.

### Already covered
- Undertone, depth, luminosity, texture, pore visibility (skin)
- Lip color, shape, fullness, vermilion border (mouth)
- Brow shape, thickness (eyebrows)

### Missing

**New module: `teeth-smile`**

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `tooth_color` | enum | basic | Bright-white, natural-white, ivory, yellow-tinted, gray-tinted, stained |
| `tooth_size` | enum | basic | Small, average, large, very-large |
| `tooth_shape` | enum | basic | Square, ovoid, triangular, rounded |
| `dental_show_at_rest` | enum | basic | None, 1–2mm, 2–3mm, 3–4mm — how much tooth shows with lips relaxed |
| `dental_alignment` | enum | intermediate | Perfect, minor-crowding, gap-teeth, slight-overlap, noticeably-uneven |
| `diastema` | enum | intermediate | None, subtle, noticeable, prominent (central gap) |
| `smile_width` | enum | intermediate | Narrow, average, wide, very-wide |
| `smile_arc` | enum | intermediate | Flat, consonant, reverse — how upper teeth follow the lower lip curve |
| `buccal_corridor` | enum | advanced | None, narrow, moderate, wide — dark space at smile corners |
| `gum_color` | color | advanced | Varies from pink to brown depending on melanin |
| `gum_line` | enum | advanced | Even, uneven, high, low |
| `lateral_tooth_show` | enum | advanced | How many teeth visible in smile — 6, 8, 10, 12+ |
| `canine_prominence` | enum | advanced | Subtle, average, prominent, vampiric |
| `occlusion` | enum | intermediate | Normal, overbite, underbite, crossbite, open-bite |
| `overjet` | enum | advanced | Negative, normal, mild, moderate, severe |
| `tooth_texture` | enum | advanced | Smooth, natural, rough, translucent-edges |
| `tooth_wear` | enum | advanced | None, minimal, moderate, significant |
| `gingival_architecture` | enum | clinical | Thick-flat, thin-scalloped, thick-scalloped |
| `midline_alignment` | enum | clinical | Centered, shifted-left, shifted-right |

*(Consolidates MUA and Orthodontist proposals — see redundancy audit.)*

**Eye enhancements**

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `eyelid_crease` | eyes | intermediate | None (monolid), low, medium, high, double — critical for eye makeup |
| `eyelid_space` | eyes | intermediate | Minimal, small, medium, large — visible lid when eyes open |
| `hood_degree` | eyes | intermediate | None, slight, moderate, heavy — how much lid skin covers the crease |
| `waterline_visibility` | eyes | advanced | Hidden, visible, prominent — affects liner application |

**Skin enhancements**

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `undereye_color` | skin | intermediate | None, slight-shadow, blue-purple, brown, dark-circles |
| `lip_skin_texture` | skin | intermediate | Smooth, natural, slightly-dry, dry, cracked |
| `periorbital_thickness` | skin | advanced | Thin (veins visible), average, thick |

**Eyebrow enhancements** (currently 6 params — needs upgrade)

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `arch_height` | eyebrows | intermediate | Low, medium, high, very-high — separate from arch shape |
| `tail_length` | eyebrows | intermediate | Short (ends at outer eye), medium, long (extends past) |
| `fullness_gradient` | eyebrows | advanced | Even, front-heavy, tail-heavy, sparse-center |
| `hair_direction` | eyebrows | advanced | Uniform-upward, feathered, mixed, unruly |

*(Note: `brow_bone_projection` dropped — already covered by `brow_ridge` in skeletal module.)*

### Verdict
Teeth/smile is a major omission. Eyelid topology is insufficient for makeup context. Eyebrows need specialist upgrade.

---

## 5. 3D Character Modeler / Animator / Rigger

**Perspective**: Mesh deformation, blend shapes, weight painting, secondary dynamics, LOD.

### Already covered
- Detailed static anatomy across all modules
- Fat distribution, muscle definition per region

### Missing — new module: `deformation-dynamics`

How the body behaves in motion — secondary dynamics, skin behavior, compression.

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `breast_dynamics` | enum | basic | None, minimal, natural, bouncy, very-bouncy |
| `posterior_dynamics` | enum | basic | None, minimal, natural, bouncy, jiggly |
| `belly_dynamics` | enum | intermediate | Rigid, minimal, soft, fluid |
| `thigh_dynamics` | enum | intermediate | Firm, natural, soft, ripple |
| `upper_arm_dynamics` | enum | intermediate | Firm, natural, soft, wave |
| `skin_elasticity_map` | text | advanced | Where skin is tight vs loose — "tight over ribcage, loose at inner elbow" |
| `jiggle_zones` | text | advanced | Areas with significant secondary motion — "lower belly, inner thigh, bust" |
| `muscle_flex_visibility` | enum | advanced | None, subtle, moderate, dramatic |
| `tendon_visibility_on_flex` | enum | advanced | Hidden, subtle, visible, prominent |
| `skin_fold_zones` | text | advanced | Where skin creases on flexion — "horizontal neck lines, belly fold when sitting" |
| `compression_behavior` | text | advanced | How body parts deform under pressure — "thigh spreads when sitting" |

### Missing — new module: `expression-range`

Not individual expressions, but the face's *capacity* to express. FACS readiness.

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `brow_mobility` | enum | basic | Low, moderate, expressive, very-expressive |
| `eye_expressiveness` | enum | basic | Subtle, moderate, expressive, intense |
| `mouth_mobility` | enum | basic | Tight, average, expressive, very-mobile |
| `smile_type` | enum | basic | Closed-lip, slight-open, open, wide, gummy, asymmetric |
| `smile_character` | text | basic | "Slow spreading warmth" vs "sudden full beam" |
| `resting_face` | text | basic | Description of the neutral expression — "looks slightly amused" |
| `nostril_flare_range` | enum | intermediate | None, slight, moderate, dramatic |
| `eye_crinkle_on_smile` | enum | intermediate | None, slight, crow's-feet, deep — Duchenne marker |
| `lip_curl_range` | enum | intermediate | Minimal, moderate, expressive — snarl, sneer capacity |
| `jaw_clench_visibility` | enum | advanced | Hidden, subtle, visible, prominent — masseter pop |
| `forehead_wrinkle_on_raise` | enum | advanced | None, faint, visible, deep |
| `platysma_on_strain` | enum | advanced | Hidden, subtle, visible, banding — neck muscle on tension |
| `crying_pattern` | text | advanced | How the face changes with tears — "chin trembles, eyes redden slowly" |
| `anger_tells` | text | advanced | Distinctive anger markers — "jaw sets, nostrils flare, eyes narrow" |

*(Note: `cheek_dimple_on_smile` dropped — `dimples` already in mouth module covers this. `emotional_blush_zones` dropped — `blush_zones` already in skin module covers this.)*

**Hand enhancements** (for rigging/detail)

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `finger_proportions` | hands | intermediate | Even, pianist (long ring/middle), stubby, tapered |
| `finger_flexibility` | hands | advanced | Stiff, average, flexible, double-jointed |
| `thumb_shape` | hands | advanced | Straight, hitchhiker (curved back), clubbed |
| `palm_shape` | hands | intermediate | Square, rectangular, long-narrow, wide |
| `knuckle_prominence` | hands | advanced | Smooth, subtle, bony, prominent |
| `hand_span` | hands | clinical | Thumb tip to pinky tip when spread (mm) |
| `grip_strength` | hands | advanced | Delicate, light, average, strong, very-strong |
| `finger_dexterity` | hands | advanced | Low, average, high, extraordinary, pianist/surgeon-grade |

### Verdict
Deformation dynamics is critical — a static parameter set produces static characters. Expression range defines the difference between a mask and a face. Hands need the same upgrade treatment the other basic-grade modules get.

---

## 6. Podiatrist

**Perspective**: Foot biomechanics, toe anatomy, plantar surface, gait-related foot characteristics. The current feet module has decent surface coverage but misses biomechanical depth and individual toe detail.

### Already covered
- Size, width, arch, toe pattern, toe length, toe spacing (feet)
- Nail shape/color/condition, sole color, heel shape, instep height (feet)
- Toe alignment, foot veins (feet)

### Missing — enhance `feet` module

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `foot_pronation` | feet | intermediate | Neutral, overpronated, supinated — how the foot rolls during gait |
| `metatarsal_arch` | feet | intermediate | Collapsed, low, normal, high — transverse arch across the ball of foot |
| `ball_width` | feet | intermediate | Narrow, average, wide, splayed — width at metatarsal heads |
| `plantar_fat_pad` | feet | advanced | Thin, average, cushioned, thick — affects sole comfort and appearance |
| `heel_width` | feet | advanced | Narrow, average, wide |
| `heel_skin` | feet | advanced | Smooth, soft, slightly-rough, calloused, cracked |
| `toe_pad_shape` | feet | advanced | Flat, rounded, bulbous, tapered — shape of the fleshy toe tip |
| `big_toe_shape` | feet | intermediate | Straight, slight-bunion, moderate-bunion, severe-bunion, tapered |
| `little_toe_shape` | feet | intermediate | Straight, tucked, curled, tailor's-bunion, vestigial |
| `second_toe_detail` | feet | advanced | Flush, slight-extension, hammer, claw — Morton's toe specifics |
| `toe_hair` | feet | advanced | None, sparse, light, moderate, hairy |
| `toe_webbing` | feet | advanced | Minimal, average, joined-2nd-3rd, significant |
| `dorsal_tendons` | feet | advanced | Hidden, subtle, visible, prominent — extensor tendons on top of foot |
| `plantar_creases` | feet | advanced | Minimal, average, defined, deep — sole of foot crease pattern |
| `metatarsal_heads` | feet | clinical | Hidden, subtle, visible, prominent — ball-of-foot bone visibility |
| `ankle_to_arch_line` | feet | clinical | Concave, straight, convex — inner foot profile from ankle to arch |
| `weight_bearing_pattern` | feet | clinical | Even, heel-heavy, forefoot-heavy, lateral-edge — visible in standing |

### Verdict
Feet was overrated at "Specialist" with 14 params. The original module covers surface aesthetics (nails, color, general shape) but entirely misses biomechanical structure, individual toe anatomy, plantar surface, and the foot's dynamic interaction with the ground. With 17 additions it reaches 31 params — comparable to the detailed face modules.

---

## 7. Humanoid Robotics Expert

**Perspective**: Kinematic chains, degrees of freedom, center of mass, actuator limits, locomotion dynamics.

### Already covered
- Height, weight, limb proportions (frame, arms, legs)
- Gait, stance (posture)

### Proposals consolidated

Most robotics concerns are now addressed in other sections:
- **Locomotion mechanics** → merged into `movement-dynamics` (section 3)
- **Joint ROM** → covered in `joints` module (section 2)
- **Center of mass** → in `movement-dynamics`
- **Grip/dexterity** → in `hands` enhancements (section 5)

The robotics expert's unique remaining contribution is **sensor/perception parameters** that don't fit elsewhere:

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `eye_tracking_speed` | eyes | clinical | Slow, average, fast, very-fast — saccade speed |
| `head_turn_range` | joints | intermediate | Limited, average, wide, owl-like — cervical ROM |
| `reaction_time` | movement-dynamics | advanced | Slow, average, fast, remarkable |

### Verdict
Robotics perspective is primarily valuable as a systems-integration lens — ensuring that joint ROM, center of mass, and locomotion are parameterized consistently. With the `joints` and `movement-dynamics` modules absorbing most concerns, the standalone kinematics module is no longer needed.

---

## 8. Dermatologist (deep skin science)

**Perspective**: Beyond the current skin module — aging markers, regional variation, pathology indicators.

### Already covered
- Fitzpatrick, melanin distribution, erythema, sebum, translucency, elasticity (skin)

### Missing — add to `skin` module

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `skin_sensitivity` | enum | intermediate | Robust, normal, sensitive, very-sensitive, reactive |
| `photo_aging_vs_chrono` | enum | advanced | Under-aged, matches-age, mild-photo-aging, moderate — sun damage vs age |
| `skin_thickness_face` | enum | advanced | Thin (translucent), average, thick — differs from body |
| `skin_thickness_body` | enum | advanced | Thin, average, thick |
| `age_spot_tendency` | enum | advanced | None, minimal, some, noticeable, significant |
| `stretch_mark_distribution` | text | advanced | Where stretch marks appear — "inner thighs, hips, breasts" |
| `capillary_fragility` | enum | clinical | Low, average, high — bruising tendency, visible broken capillaries |
| `dermographism` | enum | clinical | None, mild, moderate — skin that reddens/welts when pressed |
| `wound_healing` | enum | clinical | Fast, average, slow — affects how old scars appear |

### Verdict
Skin module is already strong. These additions round out aging, sensitivity, and regional thickness.

---

## 9. Couture Designer / Fashion Draper

**Perspective**: How fabric falls on the body. Precise measurements, ease, garment-body interaction.

### Already covered
- Most circumference measurements (bust, underbust, waist, hip, thigh, calf, ankle)
- Torso length, arm length
- Build, height, weight

### Missing — add to relevant body modules

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `rise` | hips-pelvis | intermediate | Waist to crotch — determines pant rise |
| `back_length` | torso | intermediate | Nape of neck to natural waist |
| `across_back` | shoulders-neck | intermediate | Armpit to armpit across back |
| `across_chest` | bust | intermediate | Armpit to armpit across front |
| `armscye_depth` | shoulders-neck | advanced | Depth of armhole |
| `neck_to_bust` | bust | clinical | Center front neck to bust point |
| `bra_size` | bust | basic | Reference descriptor derived from bust/underbust diff |
| `dress_size` | frame | basic | Approximate standard sizing shorthand |
| `inseam` | upper-legs | intermediate | Crotch to floor |
| `outseam` | upper-legs | clinical | Waist to floor along outer leg |

### Verdict
Many measurements already present. These additions cover essential garment construction landmarks.

---

## 10. Ophthalmologist

**Perspective**: Eye anatomy beyond cosmetic appearance. Function and photographic behavior.

### Already covered
- Iris color, pattern, size; sclera color; limbal ring; eye depth; heterochromia (eyes)

### Missing — add to `eyes` module

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `pupil_size` | eyes | advanced | Small, average, large, very-large |
| `tear_film` | eyes | clinical | Dry, normal, watery, glistening — affects "dewy" or "glassy" eye look |
| `blink_rate` | eyes | advanced | Infrequent, average, frequent, rapid |

*(Note: `pupil_reactivity` and `corneal_clarity` dropped — too clinical for character generation, minimal visual impact.)*

### Verdict
Minor additions. Eye module is already specialist-grade.

---

## 11. Voice Coach / Speech Pathologist

**Perspective**: Voice is as defining as appearance for character identity.

### Already covered
- Nothing. Zero voice parameters.

### Missing — new module: `voice`

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `pitch_range` | enum | basic | Contralto, alto, mezzo-soprano, soprano (or low, medium-low, medium, medium-high, high) |
| `tone_quality` | enum | basic | Breathy, warm, clear, bright, husky, smoky, crystalline, bell-like |
| `volume_tendency` | enum | basic | Whisper-quiet, soft-spoken, moderate, projected, loud |
| `speaking_pace` | enum | basic | Very-slow, slow, measured, average, fast, rapid-fire |
| `resonance` | enum | intermediate | Thin, nasal, balanced, chest-voice, full, rich |
| `texture` | enum | intermediate | Smooth, slightly-rough, raspy, gravelly, silky |
| `vocal_fry` | enum | intermediate | None, occasional, frequent, constant |
| `breathiness` | enum | intermediate | None, slight, moderate, pronounced |
| `articulation` | enum | intermediate | Mumbled, relaxed, clear, precise, clipped |
| `laugh` | text | advanced | Description of the characteristic laugh |
| `speech_patterns` | text | advanced | Cadence, rhythm, verbal tics |
| `accent` | text | advanced | Regional/cultural speech coloring |
| `emotional_voice_range` | enum | advanced | Flat, limited, moderate, expressive, dramatic |
| `singing_capability` | enum | advanced | None, basic, competent, skilled, trained, exceptional |

### Verdict
Second biggest module-level omission after teeth. Voice is critical for character identity and dialogue generation.

---

## 12. Kinesiologist / Sports Scientist

**Perspective**: Performance capacity, physical capabilities, athletic potential.

### Already covered
- Build, somatotype, body fat (frame)
- Muscle definition across body modules

### Proposals consolidated

Most kinesiology concerns are now addressed in `movement-dynamics` (section 3) and `frame`. Unique remaining contributions:

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `power_to_weight` | frame | advanced | Low, average, high, explosive |
| `pain_tolerance` | frame | advanced | Low, average, high, remarkable |
| `recovery_speed` | frame | advanced | Slow, average, fast, remarkable |
| `hand_eye_coordination` | movement-dynamics | advanced | Poor, average, good, excellent, preternatural |

### Verdict
Physical capacity parameters describe what the body *can do*, useful for generating action descriptions. Most absorbed into consolidated modules.

---

## 13. Forensic Anthropologist

**Perspective**: Identification markers, unique features.

### Proposals consolidated

All forensic parameters are now placed in their natural home modules:
- `dominant_side` → posture (section 3)
- `gait_signature` → movement-dynamics (section 3)
- `sleep_posture` → posture (section 3)
- Fingerprint pattern → too clinical, dropped (no visual generation value)

---

## Redundancy Audit

Resolved overlaps between specialist proposals:

| Redundancy | Resolution |
|------------|------------|
| `brow_bone_projection` (MUA→eyebrows) vs `brow_ridge` (skeletal) | **Drop** from eyebrows. Already in skeletal. |
| `gesture_style` (movement) vs `gesticulation` (posture) | **Drop** gesture_style. Posture already has it. |
| `cheek_dimple_on_smile` (expression-range) vs `dimples` (mouth) | **Drop** from expression-range. Mouth covers it. |
| `dominant_side` (posture) vs `handedness` (forensic→hands) | **Keep in posture only**. More about body habits than hand anatomy. |
| `foot_pronation` (ortho→skeletal-alignment) vs `arch` (feet) | **Move to feet module**. Pronation is a foot characteristic, not spinal. |
| `emotional_blush_zones` (expression-range) vs `blush_zones` (skin) | **Drop** from expression-range. Skin covers it. |
| `dental_show_at_rest` (facial-profile) vs teeth-smile | **Move to teeth-smile**. That's where dental params live. |
| `grip_strength` + `finger_dexterity` (kinematics) | **Move to hands**. They're hand characteristics. |
| `hip_sway` (kinematics) vs gait territory | **Keep in movement-dynamics**. It's locomotion, not static posture. |
| `joint_rom_*` (kinematics) vs ortho | **Consolidated into joints module**. One place for all joint ROM. |
| `agility` (kinesiology) vs `coordination` (movement-dynamics) | **Keep both**. Agility = physical quickness, coordination = precision. Distinct. |
| `kinematics` module vs `movement` module | **Merged into `movement-dynamics`**. One module for all locomotion. |
| `elbow_appearance` (joints) vs `elbow` (arms) | **Drop from joints**. Arms already covers elbow appearance. Joint module covers ROM only. |
| `knee_appearance` (joints) vs `knee` (upper-legs) | **Drop from joints**. Upper-legs covers knee appearance. |

---

## Summary: Proposed New Modules

| Module | Category | Params | Priority | Rationale |
|--------|----------|--------|----------|-----------|
| `teeth-smile` | face | 19 | **Critical** | Completely missing. Smile defines a face. |
| `voice` | expression | 14 | **Critical** | Completely missing. Defines character identity. |
| `expression-range` | face | 14 | **High** | Static face ≠ character. Expression capacity is essential. |
| `movement-dynamics` | carriage | 18 | **High** | How the body moves is as important as how it looks. |
| `deformation-dynamics` | body | 11 | **High** | Bodies at rest ≠ bodies in motion. Secondary dynamics define realism. |
| `skeletal-alignment` | body | 8 | **High** | Spinal curvature, pelvic tilt — structural foundation. |
| `joints` | body | 22 | **High** | Systematic joint ROM, stability, appearance, flexibility. |
| `facial-profile` | face | 12 | **Medium** | Inter-feature harmony, aging markers, tissue depth. |

**Total new params from new modules: ~118**

## Summary: Enhancements to Existing Modules

| Module | Current | Add | New Total | Priority |
|--------|---------|-----|-----------|----------|
| `feet` | 14 | 17 | 31 | **High** (podiatrist gap) |
| `hands` | 6 | 8 | 14 | **High** (needs specialist upgrade) |
| `eyebrows` | 6 | 4 | 10 | **High** (needs specialist upgrade) |
| `posture` | 6 | 6 | 12 | **High** (needs specialist upgrade) |
| `eyes` | 22 | 7 | 29 | High (eyelid topology + ophth) |
| `skin` | 20 | 12 | 32 | Medium (aging, sensitivity, MUA) |
| `bust` | 17 | 6 | 23 | Medium (surgical + couture) |
| `frame` | 8 | 6 | 14 | Medium (ratios, sizing, capacity) |
| `shoulders-neck` | 10 | 2 | 12 | Low |
| `torso` | 16 | 1 | 17 | Low |
| `hips-pelvis` | 10 | 1 | 11 | Low |
| `upper-legs` | 10 | 2 | 12 | Low |
| `movement-dynamics` (from kinesiology) | — | 4 | +4 | — (already counted above) |

**Total new params from enhancements: ~76**

---

## Grand Total

| | Modules | Params |
|-|---------|--------|
| **Current** | 23 | 318 |
| **New modules** | +8 | +118 |
| **Enhancements** | — | +76 |
| **Proposed total** | **31** | **~512** |

A fully exhaustive pass (every measurement variant, every clinical detail, every simulation parameter) would approach 800–1000+. This proposal targets the most impactful additions — the ones that change how generation prompts read.

---

## Implementation Priority

**Phase 1 — Critical omissions** (3 new modules, 3 upgrades)
- `teeth-smile` — no teeth at all is untenable
- `voice` — character without voice is incomplete
- `expression-range` — face that can't express is a mask
- Upgrade `eyebrows` to specialist grade (6→10)
- Upgrade `hands` to specialist grade (6→14)
- Upgrade `feet` to specialist grade (14→31)

**Phase 2 — Movement, structure, and dynamics** (3 new modules, 1 upgrade)
- `movement-dynamics` — how the body moves through space
- `deformation-dynamics` — how the body deforms in motion
- `skeletal-alignment` + `joints` — structural foundation
- Upgrade `posture` to specialist grade (6→12)

**Phase 3 — Refinement** (1 new module, remaining upgrades)
- `facial-profile` — inter-feature analysis, aging
- Remaining module enhancements (eyes, bust, skin, frame, etc.)

---

## Potential Distillation Strategies (future feature)

The full parameter set is for the *definition* layer. Generation prompts don't need all 512 parameters. Distillation approaches:

1. **Tier filtering**: Basic tier alone (~140 params) produces coherent output
2. **Module relevance**: A headshot prompt only needs face + coloring modules
3. **Delta-from-default**: Only include parameters that deviate from defaults
4. **Archetype presets**: Preset values across all modules, user tweaks departures
5. **Narrative distillation**: AI reads full parameter set, produces a 200-word prose description
6. **Context-sensitive**: Full-body standing → all body; close-up portrait → face + coloring only
