# Chassis Parameter Audit: Multi-Specialist Critique

**Current inventory**: 23 modules, ~318 parameters across face (7), body (12), coloring (2), extremities (1), carriage (1).

This report surveys the parameter space through 12 specialist lenses, identifies gaps, and proposes additions. Parameters already present are noted; new parameters are proposed with module placement and tier.

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
| Body | feet | 14 | Specialist |
| Body | arms | 10 | Good |
| Coloring | skin | 20 | Specialist |
| Coloring | hair | 21 | Specialist |
| Extremities | hands | 6 | Basic |
| Carriage | posture | 6 | Basic |

---

## 1. Plastic Surgeon

**Perspective**: Facial harmony, proportional analysis, body contouring. Thinks in ratios, angles, and ideal-to-actual deviation.

### Already well-covered
- Facial thirds, facial index, bizygomatic/bigonial width (skeletal)
- Nasolabial angle, nasofrontal angle, tip projection (nose)
- Lip ratios, vermilion border, cupid's bow (mouth)
- Canthal tilt, interpupillary distance, palpebral dimensions (eyes)
- Breast ptosis, projection, underbust differential (bust)

### Missing

**Face — new module: `facial-profile`** (or add to skeletal)

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `profile_type` | enum | basic | Straight, convex, concave — overall face profile classification |
| `cervicomental_angle` | enum | intermediate | Jawline-to-neck angle — defines jaw definition in profile (90–130°) |
| `mentolabial_fold` | enum | intermediate | Depth of the groove between lower lip and chin |
| `buccal_fat` | enum | intermediate | Fullness of the cheek below the cheekbone — removal is a trending procedure |
| `malar_fat_pad` | enum | advanced | Position and fullness of the mid-face fat pad — descends with age |
| `tear_trough` | enum | advanced | Depth of the groove from inner eye to mid-cheek — key aging marker |
| `nasolabial_fold` | enum | advanced | Depth of the nose-to-mouth groove |
| `marionette_lines` | enum | advanced | Lines from mouth corners downward |
| `jowls` | enum | advanced | Tissue laxity below the jawline |
| `dental_show_at_rest` | enum | advanced | How much tooth shows with lips relaxed — 1–3mm is youthful |
| `facial_convexity_angle` | measurement | clinical | Glabella–subnasale–pogonion angle (~165–175°) |
| `lower_face_height` | measurement | clinical | Subnasale to menton |
| `midface_height` | measurement | clinical | Glabella to subnasale |

**Bust additions**

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `breast_base_width` | bust | advanced | Width of where the breast contacts the chest wall |
| `sternal_notch_to_nipple` | bust | clinical | Key surgical planning distance (~19–21cm) |
| `nipple_to_fold` | bust | clinical | Nipple to inframammary fold — defines ptosis |
| `intermammary_distance` | bust | clinical | Distance between nipples — typically ≈ ½ biacromial width |

**Body ratio additions**

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `arm_span_to_height` | frame | clinical | Typically ≈1.0; marfanoid if >1.05 |
| `sitting_height_ratio` | frame | clinical | Sitting height / standing height — trunk-to-leg proportion |

### Verdict
Current face modules are surgeon-grade for individual features but lack **inter-feature proportional analysis** (facial profile, tissue depth markers, aging indicators). Bust is close but missing surgical planning landmarks.

---

## 2. Orthopedic Specialist

**Perspective**: Skeletal alignment, joint mechanics, structural integrity. Thinks in degrees of angulation, load-bearing axes, and developmental variants.

### Already covered
- Leg alignment valgus/varus (lower-legs)
- Shoulder-to-hip ratio (shoulders-neck)
- General frame and build (frame)

### Missing — new module: `skeletal-alignment`

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `cervical_lordosis` | enum | intermediate | Neck curvature — flat, normal, exaggerated |
| `thoracic_kyphosis` | enum | intermediate | Upper back curvature — flat, normal, exaggerated, Scheuermann's |
| `lumbar_lordosis` | enum | intermediate | Lower back curvature — flat, normal, exaggerated (hyperlordotic) |
| `scoliosis` | enum | intermediate | Lateral curvature — none, mild, moderate, S-curve, C-curve |
| `pelvic_tilt` | enum | intermediate | Anterior, neutral, posterior — profoundly affects posture and posterior projection |
| `rib_cage_shape` | enum | intermediate | Normal, barrel, funnel (pectus excavatum), pigeon (pectus carinatum), flared |
| `scapular_position` | enum | advanced | Neutral, protracted, retracted, winging — affects upper back silhouette |
| `carrying_angle` | enum | advanced | Elbow angle when arms relaxed — typically wider in women (10–15°) |
| `joint_laxity` | enum | advanced | None, mild, moderate, hypermobile (Beighton score correlate) — affects all joints |
| `femoral_anteversion` | enum | clinical | Inward rotation of the femur — affects knee and toe alignment |
| `tibial_torsion` | enum | clinical | Rotation of the shin bone — affects foot alignment |
| `q_angle` | measurement | clinical | Quadriceps angle at knee — wider in women (15–20°), affects knock-knee |
| `leg_length_discrepancy` | enum | clinical | None, <5mm, 5–10mm, >10mm — surprisingly common, affects gait |
| `foot_pronation` | enum | intermediate | Neutral, overpronated, supinated — affects walking and ankle appearance |
| `spinal_length` | measurement | clinical | C7 to S1 — independent of total height |

### Verdict
**Major gap**. The current system describes surface anatomy well but has almost no skeletal alignment parameters. Pelvic tilt alone changes how the posterior, belly, and lower back all appear. Spinal curvature affects silhouette dramatically. A dedicated alignment module would bridge this.

---

## 3. Physiotherapist

**Perspective**: Movement quality, muscle function, flexibility, functional capacity. Thinks in range of motion, motor patterns, and compensation strategies.

### Already covered
- Default stance, gait, shoulder carriage (posture — basic)
- Muscle definition per region (various body modules)

### Missing — enhance `posture` module + new module: `movement`

**Posture enhancements**

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `sitting_posture` | enum | basic | Upright, relaxed, slouched, cross-legged, perched, lotus |
| `breathing_pattern` | enum | intermediate | Diaphragmatic, chest-dominant, shallow, deep — visible in torso movement |
| `resting_muscle_tone` | enum | intermediate | Low, normal, high, variable — visible as body tension |
| `recovery_posture` | enum | advanced | How the body settles after exertion — collapsed, draped, controlled, alert |
| `dominant_side` | enum | basic | Left, right, ambidextrous — affects asymmetric habits |

**New module: `movement`**

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `overall_flexibility` | enum | basic | Stiff, limited, average, flexible, hypermobile, contortionist |
| `movement_fluidity` | enum | basic | Mechanical, controlled, natural, fluid, dance-like, cat-like |
| `movement_confidence` | enum | basic | Hesitant, careful, confident, bold, commanding |
| `coordination` | enum | intermediate | Clumsy, average, coordinated, precise, extraordinary |
| `balance` | enum | intermediate | Unsteady, average, good, excellent, preternatural |
| `physical_energy` | enum | intermediate | Languid, calm, moderate, energetic, frenetic, explosive |
| `speed_quality` | enum | intermediate | Slow, measured, average, quick, mercurial |
| `strength_impression` | enum | intermediate | Fragile, delicate, average, strong, powerful, superhuman |
| `movement_signature` | text | advanced | Characteristic movement patterns — "hip-led walk, touches hair when thinking" |
| `fidget_patterns` | text | advanced | Habitual micro-movements at rest |
| `gesture_style` | enum | advanced | Minimal, restrained, moderate, expressive, theatrical, dancer-like |
| `spatial_awareness` | enum | advanced | Low, average, high, extraordinary — affects grace and collision avoidance |

### Verdict
Posture module is severely underdeveloped at 6 params. Movement is entirely absent — for a character engine, how the body moves is as defining as how it looks. A character who moves like water vs one who moves like a marionette will produce completely different generation prompts.

---

## 4. Make-up Artist

**Perspective**: Skin surface at close range, facial feature topology for enhancement, color theory application, photography lighting response.

### Already covered
- Undertone, depth, luminosity, texture, pore visibility (skin)
- Lip color, shape, fullness, vermilion border (mouth)
- Brow shape, thickness (eyebrows)

### Missing

**New module: `teeth-smile`**

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `tooth_color` | enum | basic | Bright white, natural white, ivory, yellow-tinted, gray-tinted, stained |
| `tooth_size` | enum | basic | Small, average, large, very-large |
| `tooth_shape` | enum | basic | Square, ovoid, triangular, rounded |
| `dental_alignment` | enum | intermediate | Perfect, minor-crowding, gap-teeth, slight-overlap, noticeably-uneven |
| `diastema` | enum | intermediate | None, subtle, noticeable, prominent (central gap) |
| `smile_width` | enum | intermediate | Narrow, average, wide, very-wide |
| `smile_arc` | enum | intermediate | Flat, consonant, reverse — how the upper teeth follow the lower lip curve |
| `buccal_corridor` | enum | advanced | None, narrow, moderate, wide — dark space at smile corners |
| `gum_color` | color | advanced | Varies from pink to brown depending on melanin |
| `gum_line` | enum | advanced | Even, uneven, high, low |
| `lip_to_tooth_ratio` | enum | advanced | How much tooth shows during a natural smile |
| `lateral_tooth_show` | enum | advanced | How many teeth visible in a smile — 6, 8, 10, 12+ |

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
| `lip_texture` | skin | intermediate | Smooth, natural, slightly-dry, dry, cracked — affects lipstick adhesion |
| `periorbital_thickness` | skin | advanced | Thin (veins visible), average, thick — affects concealer needs |

**Eyebrow enhancements** (currently only 6 params — needs upgrade)

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `arch_height` | eyebrows | intermediate | Low, medium, high, very-high — separate from shape |
| `tail_length` | eyebrows | intermediate | Short (ends at outer eye), medium, long (extends past) |
| `fullness_gradient` | eyebrows | advanced | Even, front-heavy, tail-heavy, sparse-center |
| `hair_direction` | eyebrows | advanced | Uniform upward, feathered, mixed, unruly |
| `brow_bone_projection` | eyebrows | advanced | Flat, subtle, moderate, prominent — affects shadow/highlight |

### Verdict
**Teeth/smile is a major omission** — it's one of the most defining features of a face and completely absent. The MUA perspective also reveals that eyelid topology is insufficient for anyone who wants to describe eye makeup application. Eyebrows need the same specialist treatment the other face modules got.

---

## 5. 3D Character Modeler / Animator / Rigger

**Perspective**: Mesh deformation, blend shapes, IK/FK rigging, weight painting, secondary dynamics, LOD considerations.

### Already covered
- Detailed static anatomy across all modules
- Some movement parameters in posture
- Fat distribution, muscle definition per region

### Missing — new module: `deformation-dynamics`

This module would inform simulation/generation systems about how the body behaves in motion.

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `breast_dynamics` | enum | basic | None, minimal, natural, bouncy, very-bouncy — secondary motion character |
| `posterior_dynamics` | enum | basic | None, minimal, natural, bouncy, jiggly |
| `belly_dynamics` | enum | intermediate | Rigid, minimal, soft, fluid — affects breathing and movement |
| `thigh_dynamics` | enum | intermediate | Firm, natural, soft, ripple |
| `upper_arm_dynamics` | enum | intermediate | Firm, natural, soft, wave |
| `skin_elasticity_map` | text | advanced | Where skin is tight vs loose — "tight over ribcage, loose at inner elbow" |
| `jiggle_zones` | text | advanced | Areas with significant secondary motion — "lower belly, inner thigh, bust" |
| `muscle_flex_visibility` | enum | advanced | None, subtle, moderate, dramatic — how much muscles change shape on use |
| `tendon_visibility_on_flex` | enum | advanced | Hidden, subtle, visible, prominent — wrist/ankle/foot tendons on movement |
| `skin_fold_zones` | text | advanced | Where skin creases on flexion — "horizontal neck lines, wrist creases, belly fold when sitting" |
| `compression_behavior` | text | advanced | How body parts deform under pressure — "thigh spreads significantly when sitting" |

**New module: `expression-range`**

For FACS (Facial Action Coding System) readiness — not individual expressions, but the *capacity* of the face to express.

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `brow_mobility` | enum | basic | Low, moderate, expressive, very-expressive — range of brow movement |
| `eye_expressiveness` | enum | basic | Subtle, moderate, expressive, intense |
| `mouth_mobility` | enum | basic | Tight, average, expressive, very-mobile |
| `smile_type` | enum | basic | Closed-lip, slight-open, open, wide, gummy, asymmetric |
| `smile_character` | text | basic | "Slow spreading warmth" vs "sudden full beam" |
| `resting_face` | text | basic | Description of the neutral expression — "looks slightly amused" |
| `nostril_flare_range` | enum | intermediate | None, slight, moderate, dramatic |
| `cheek_dimple_on_smile` | enum | intermediate | None, one-side, both, deep |
| `eye_crinkle_on_smile` | enum | intermediate | None, slight, crow's-feet, deep — Duchenne marker |
| `lip_curl_range` | enum | intermediate | Minimal, moderate, expressive — snarl, sneer capacity |
| `jaw_clench_visibility` | enum | advanced | Hidden, subtle, visible, prominent — masseter pop |
| `forehead_wrinkle_on_raise` | enum | advanced | None, faint, visible, deep |
| `platysma_on_strain` | enum | advanced | Hidden, subtle, visible, banding — neck muscle on tension |
| `emotional_blush_zones` | text | advanced | Where flushing occurs with emotion — "cheeks and chest" |
| `crying_pattern` | text | advanced | How the face changes with tears — "chin trembles, eyes redden slowly" |
| `anger_tells` | text | advanced | Distinctive anger markers — "jaw sets, nostrils flare, eyes narrow" |

**Rigging/proportion parameters to add to existing modules**

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `finger_proportions` | hands | intermediate | Even, pianist (long ring/middle), stubby, tapered |
| `finger_flexibility` | hands | advanced | Stiff, average, flexible, double-jointed |
| `thumb_shape` | hands | advanced | Straight, hitchhiker (curved back), clubbed |
| `palm_shape` | hands | intermediate | Square, rectangular, long-narrow, wide |
| `hand_span` | hands | clinical | Thumb tip to pinky tip when spread (mm) |
| `knuckle_prominence` | hands | advanced | Smooth, subtle, bony, prominent |

### Verdict
**Deformation dynamics is critical** for any generation system — a static parameter set produces static-looking characters. The distinction between "firm athletic thighs" and "soft thighs that spread when sitting" is the difference between a mannequin and a person. Expression range is equally critical — the face at rest is one image, but the face's *capacity* for expression defines the character.

---

## 6. Humanoid Robotics Expert

**Perspective**: Kinematic chains, degrees of freedom, center of mass, actuator limits, sensor placement, locomotion dynamics.

### Already covered
- Height, weight, limb proportions (frame, arms, legs)
- Gait, stance, balance (posture)

### Missing — new module: `kinematics`

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `center_of_mass` | enum | basic | Low (hip-heavy), average, high (chest-heavy) — affects balance |
| `step_length` | enum | intermediate | Short, average, long, very-long |
| `cadence` | enum | intermediate | Slow, measured, average, brisk, quick — steps per minute character |
| `arm_swing` | enum | intermediate | None, minimal, moderate, full, exaggerated |
| `head_turn_range` | enum | intermediate | Limited, average, wide, owl-like |
| `hip_sway` | enum | intermediate | None, subtle, moderate, pronounced, exaggerated — lateral pelvic motion during walk |
| `stride_symmetry` | enum | advanced | Symmetric, slight-limp, noticeable-asymmetry |
| `ground_contact` | enum | advanced | Heel-strike, midfoot, forefoot — foot landing pattern |
| `reach_envelope` | text | advanced | Descriptive reach capabilities — "can touch floor without bending knees" |
| `grip_strength` | enum | advanced | Delicate, light, average, strong, very-strong |
| `finger_dexterity` | enum | advanced | Low, average, high, extraordinary, pianist/surgeon-grade |
| `joint_rom_shoulders` | enum | clinical | Limited, average, full, hypermobile — overhead reach capacity |
| `joint_rom_hips` | enum | clinical | Limited, average, full, hypermobile — split capacity |
| `joint_rom_spine` | enum | clinical | Rigid, average, flexible, very-flexible — backbend/twist capacity |

### Verdict
Current system describes the humanoid at rest. Robotics perspective adds how it moves through space — step dynamics, joint limits, center of mass. Valuable for generating action descriptions and animation prompts.

---

## 7. Dermatologist (deep skin science)

**Perspective**: Beyond the current skin module — aging markers, regional variation, pathology indicators that affect appearance.

### Already covered
- Fitzpatrick, melanin distribution, erythema, sebum, translucency, elasticity (skin)

### Missing — add to `skin` module

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `photo_aging_vs_chrono` | enum | advanced | Under-aged, matches-age, mild-photo-aging, moderate-photo-aging — sun damage vs age |
| `capillary_fragility` | enum | clinical | Low, average, high — tendency to bruise, visible broken capillaries |
| `skin_sensitivity` | enum | intermediate | Robust, normal, sensitive, very-sensitive, reactive |
| `dermographism` | enum | clinical | None, mild, moderate — skin that reddens/welts when touched |
| `wound_healing` | enum | clinical | Fast, average, slow — affects how old scars look |
| `skin_thickness_face` | enum | advanced | Thin (translucent), average, thick — differs from body |
| `skin_thickness_body` | enum | advanced | Thin, average, thick |
| `age_spot_tendency` | enum | advanced | None, minimal, some, noticeable, significant |
| `stretch_mark_distribution` | text | advanced | Where stretch marks appear — "inner thighs, hips, breasts" |

### Verdict
Skin module is already strong. These additions round out the dermatological picture, particularly age-related skin changes and regional thickness variation (critical for translucency and vein visibility).

---

## 8. Couture Designer / Fashion Draper

**Perspective**: How fabric falls on the body. Thinks in precise measurements, ease, and how garments interact with form.

### Already covered
- Most circumference measurements (bust, underbust, waist, hip, thigh, calf, ankle)
- Torso length, arm length
- Build, height, weight

### Missing — add to relevant body modules

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `rise` | hips-pelvis | intermediate | Waist to crotch — determines pant rise |
| `back_length` | torso | intermediate | Nape of neck to natural waist — bodice pattern critical |
| `across_back` | shoulders-neck | intermediate | Armpit to armpit across back |
| `across_chest` | bust | intermediate | Armpit to armpit across front |
| `armscye_depth` | shoulders-neck | advanced | Depth of armhole — how low a sleeveless cut can go |
| `neck_to_bust` | bust | clinical | Center front neck to bust point — draping landmark |
| `bra_size` | bust | basic | Derived from bust/underbust diff, but useful as a reference descriptor |
| `dress_size` | frame | basic | Approximate standard sizing — useful as shorthand reference |
| `inseam` | upper-legs | intermediate | Crotch to floor — leg length for garment purposes |
| `outseam` | upper-legs | clinical | Waist to floor along outer leg |

### Verdict
The system has many measurements already but is missing several that are essential for describing how clothes fit. Rise, back length, and inseam are basic garment construction measurements that also help describe body proportions.

---

## 9. Ophthalmologist

**Perspective**: Detailed eye anatomy beyond cosmetic appearance. How the eye actually functions and appears under examination.

### Already covered
- Iris color, pattern, size; sclera color; limbal ring; eye depth; heterochromia (eyes)
- Under-eye area, lash details (eyes)

### Missing — add to `eyes` module

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `pupil_size` | eyes | advanced | Small, average, large, very-large — affects expression intensity, varies with light |
| `pupil_reactivity` | eyes | clinical | Slow, average, fast — how quickly the pupil responds to light changes |
| `tear_film` | eyes | clinical | Dry, normal, watery, glistening — affects how "dewy" or "glassy" eyes look |
| `corneal_clarity` | eyes | clinical | Crystal-clear, normal, slight-haze — affects depth of eye appearance |
| `blink_rate` | eyes | advanced | Infrequent, average, frequent, rapid — affects expression and engagement reads |

### Verdict
Minor additions. The eye module is already specialist-grade; these fill in functional/dynamic characteristics that affect photographic appearance.

---

## 10. Orthodontist / Prosthodontist

**Perspective**: Dental aesthetics, occlusion, and how the dental structure shapes the lower face.

### Already covered
- Lip shape, mouth width, gum show (mouth)
- Dental show at rest (proposed in plastic surgeon section)

### Missing — **strongly recommends new `teeth-smile` module** (see MUA section above)

Additional parameters beyond the MUA list:

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `occlusion` | enum | intermediate | Normal, overbite, underbite, crossbite, open-bite |
| `overjet` | enum | advanced | Negative, normal, mild, moderate, severe — horizontal tooth overlap |
| `tooth_texture` | enum | advanced | Smooth, natural, rough, translucent-edges |
| `tooth_wear` | enum | advanced | None, minimal, moderate, significant — from age or bruxism |
| `gingival_architecture` | enum | clinical | Thick-flat, thin-scalloped, thick-scalloped — affects smile aesthetics |
| `midline_alignment` | enum | clinical | Centered, shifted-left, shifted-right — dental midline vs facial midline |
| `canine_prominence` | enum | advanced | Subtle, average, prominent, vampiric — affects smile character |

### Verdict
**Teeth/smile is the single biggest module-level omission in the entire system.** A smile can define a face. Currently zero parameters address dental aesthetics.

---

## 11. Voice Coach / Speech Pathologist

**Perspective**: The voice is as defining as appearance for character identity.

### Already covered
- Nothing. Zero voice parameters exist.

### Missing — new module: `voice`

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `pitch_range` | enum | basic | Alto, mezzo-soprano, soprano, contralto (or low, medium-low, medium, medium-high, high) |
| `tone_quality` | enum | basic | Breathy, warm, clear, bright, husky, smoky, crystalline, bell-like |
| `volume_tendency` | enum | basic | Whisper-quiet, soft-spoken, moderate, projected, loud |
| `speaking_pace` | enum | basic | Very-slow, slow, measured, average, fast, rapid-fire |
| `resonance` | enum | intermediate | Thin, nasal, balanced, chest-voice, full, rich |
| `texture` | enum | intermediate | Smooth, slightly-rough, raspy, gravelly, silky |
| `vocal_fry` | enum | intermediate | None, occasional, frequent, constant |
| `breathiness` | enum | intermediate | None, slight, moderate, pronounced |
| `articulation` | enum | intermediate | Mumbled, relaxed, clear, precise, clipped |
| `laugh` | text | advanced | Description of the characteristic laugh |
| `speech_patterns` | text | advanced | Cadence, rhythm, verbal tics, catchphrases |
| `accent` | text | advanced | Regional/cultural speech coloring |
| `emotional_voice_range` | enum | advanced | Flat, limited, moderate, expressive, dramatic — how much voice changes with emotion |
| `singing_capability` | enum | advanced | None, basic, competent, skilled, trained, exceptional |

### Verdict
**Second biggest module-level omission after teeth.** Voice is arguably more important than many body parameters for character identity. For a character generation engine, voice descriptions are critical for producing consistent dialogue and narration.

---

## 12. Kinesiologist / Sports Scientist

**Perspective**: Performance capacity, physical capabilities, athletic potential.

### Already covered
- Build, somatotype, body fat (frame)
- Muscle definition across body modules
- Posture and gait (posture)

### Missing — enhance `movement` module (proposed above) or add to `frame`

| Parameter | Type | Tier | Notes |
|-----------|------|------|-------|
| `cardiovascular_fitness` | enum | intermediate | Sedentary, low, moderate, fit, athletic, elite |
| `power_to_weight` | enum | advanced | Low, average, high, explosive — affects jumping, sprinting description |
| `pain_tolerance` | enum | advanced | Low, average, high, remarkable — affects how character responds to injury |
| `recovery_speed` | enum | advanced | Slow, average, fast, remarkable |
| `endurance` | enum | intermediate | Low, limited, average, good, high, marathon-level |
| `agility` | enum | intermediate | Clumsy, average, agile, very-agile, cat-like |
| `hand_eye_coordination` | enum | advanced | Poor, average, good, excellent, preternatural |
| `body_awareness` | enum | intermediate | Low, average, good, excellent, dancer/gymnast-level — proprioception |

### Verdict
These parameters describe physical *capacity* — what the body can do, not just what it looks like. Useful for generating action descriptions and understanding how the character would respond to physical challenges.

---

## Additional Specialist: Forensic Anthropologist

**Perspective**: Identification markers, unique features, aging indicators.

| Parameter | Module | Tier | Notes |
|-----------|--------|------|-------|
| `handedness` | hands | basic | Left, right, ambidextrous |
| `finger_print_pattern` | hands | clinical | Loop, whorl, arch — purely aesthetic detail |
| `voice_print_character` | voice | clinical | Distinctive features of the voice that serve as identification |
| `gait_signature` | movement | advanced | Distinctive walking pattern — "slight hip hitch, left foot slightly outturned" |
| `sleep_posture` | posture | advanced | Side, back, front, fetal — affects body impression marks in generation |

---

## Summary: Proposed New Modules

| Module | Category | Params | Priority | Rationale |
|--------|----------|--------|----------|-----------|
| `teeth-smile` | face | ~19 | **Critical** | Completely missing. Smile defines a face. |
| `voice` | expression | ~14 | **Critical** | Completely missing. Defines character identity. |
| `expression-range` | face | ~16 | **High** | Static face ≠ character. Expression capacity is essential. |
| `movement` | carriage | ~12 | **High** | How the body moves is as important as how it looks. |
| `deformation-dynamics` | body | ~11 | **High** | Bodies at rest ≠ bodies in motion. Secondary dynamics define realism. |
| `skeletal-alignment` | body | ~15 | **High** | Posture's structural foundation. Pelvic tilt alone changes everything. |
| `facial-profile` | face | ~13 | **Medium** | Inter-feature harmony, aging markers, tissue depth. |
| `kinematics` | carriage | ~14 | **Medium** | Locomotion dynamics, joint limits, gait mechanics. |

**Total new params from new modules: ~114**

## Summary: Enhancements to Existing Modules

| Module | Current | Add | New Total | Priority |
|--------|---------|-----|-----------|----------|
| `eyes` | 22 | 5 | 27 | High (eyelid topology) |
| `eyebrows` | 6 | 5 | 11 | High (needs specialist upgrade) |
| `hands` | 6 | 6 | 12 | High (needs specialist upgrade) |
| `posture` | 6 | 5 | 11 | High (needs specialist upgrade) |
| `bust` | 17 | 5 | 22 | Medium (surgical landmarks) |
| `skin` | 20 | 9 | 29 | Medium (aging, sensitivity) |
| `frame` | 8 | 4 | 12 | Medium (ratios, sizing) |
| `mouth` | 18 | 0 | 18 | — (proposals went to teeth-smile) |
| `shoulders-neck` | 10 | 2 | 12 | Low |
| `torso` | 16 | 1 | 17 | Low |
| `hips-pelvis` | 10 | 1 | 11 | Low |
| `upper-legs` | 10 | 2 | 12 | Low |
| `ears` | 6 | 0 | 6 | — (adequate for current scope) |
| `facial-details` | 6 | 0 | 6 | — (adequate for current scope) |

**Total new params from enhancements: ~45**

---

## Grand Total

| | Modules | Params |
|-|---------|--------|
| **Current** | 23 | 318 |
| **New modules** | +8 | +114 |
| **Enhancements** | — | +45 |
| **Proposed total** | **31** | **~477** |

This is conservative. Each specialist could easily double their recommendations. A fully exhaustive system (every measurement, every variant, every clinical detail) would approach 800–1000+ parameters. The current proposal targets the most impactful additions — the ones that would change how generation prompts read.

---

## Implementation Priority

**Phase 1 — Critical omissions** (3 new modules, 2 upgrades)
- `teeth-smile` — no teeth at all is untenable
- `voice` — character without voice is incomplete
- `expression-range` — face that can't express is a mask
- Upgrade `eyebrows` to specialist grade
- Upgrade `hands` to specialist grade

**Phase 2 — Movement and dynamics** (3 new modules, 1 upgrade)
- `movement` — how the body moves
- `deformation-dynamics` — how the body deforms
- `skeletal-alignment` — structural foundation of posture
- Upgrade `posture` to specialist grade

**Phase 3 — Refinement** (2 new modules, remaining upgrades)
- `facial-profile` — inter-feature analysis
- `kinematics` — locomotion dynamics
- Remaining module enhancements (eyes, bust, skin, frame, etc.)

---

## Potential Distillation Strategies (future feature)

The full parameter set is for the *definition* layer. Generation prompts don't need all 477+ parameters. Distillation approaches:

1. **Tier filtering**: Basic tier alone (~120 params) produces coherent output
2. **Module relevance**: A headshot prompt only needs face + coloring modules
3. **Delta-from-default**: Only include parameters that deviate from defaults
4. **Archetype presets**: "Athletic anime" = preset values across all modules, user tweaks departures
5. **Narrative distillation**: AI reads full parameter set, produces a 200-word prose description
6. **Context-sensitive**: Full-body standing → all body modules; close-up portrait → face + coloring only
