-- Implement chassis parameter audit recommendations (v2)
-- 8 new modules, 12 existing module enhancements, anus→perineum rename
-- Brings system from 23 modules / ~318 params to 31 modules / ~512 params

-- ============================================================================
-- 1. Rename anus → perineum
-- ============================================================================

UPDATE luv_chassis_modules
SET slug = 'perineum', name = 'Perineum', description = 'Perineal region — perianal color, texture, shape, and surrounding anatomy'
WHERE slug = 'anus';

-- ============================================================================
-- 2. Create 8 new modules (empty schemas, filled in step 3)
-- ============================================================================

INSERT INTO luv_chassis_modules (slug, name, category, description, sequence, parameters, parameter_schema)
VALUES
  ('skeletal-alignment', 'Skeletal Alignment', 'body', 'Spinal curvature, pelvic tilt, rib cage shape, scapular position', 24, '{}', '[]'),
  ('joints', 'Joints', 'body', 'Joint ROM, stability, flexibility, and appearance across all major joint chains', 25, '{}', '[]'),
  ('facial-profile', 'Facial Profile', 'face', 'Inter-feature harmony in profile, soft-tissue depth, aging markers', 26, '{}', '[]'),
  ('teeth-smile', 'Teeth & Smile', 'face', 'Dental aesthetics, smile arc, occlusion, gum line', 27, '{}', '[]'),
  ('expression-range', 'Expression Range', 'face', 'Facial expression capacity — FACS readiness, smile character, emotional tells', 28, '{}', '[]'),
  ('voice', 'Voice', 'expression', 'Vocal characteristics — pitch, tone, resonance, texture, speech patterns', 29, '{}', '[]'),
  ('movement-dynamics', 'Movement Dynamics', 'carriage', 'How the body moves through space — fluidity, gait mechanics, physical capacity', 30, '{}', '[]'),
  ('deformation-dynamics', 'Deformation Dynamics', 'body', 'Secondary motion, skin behavior, compression — how the body behaves in motion', 31, '{}', '[]');

-- ============================================================================
-- 3. Set parameter schemas for new modules
-- ============================================================================

-- skeletal-alignment: 8 params
UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"cervical_lordosis","label":"Cervical Lordosis","type":"enum","tier":"intermediate","options":["flat","normal","exaggerated"],"default":"normal","description":"Neck curvature"},
  {"key":"thoracic_kyphosis","label":"Thoracic Kyphosis","type":"enum","tier":"intermediate","options":["flat","normal","exaggerated"],"default":"normal","description":"Upper back curvature"},
  {"key":"lumbar_lordosis","label":"Lumbar Lordosis","type":"enum","tier":"intermediate","options":["flat","normal","exaggerated"],"default":"normal","description":"Lower back curvature — affects posterior projection"},
  {"key":"scoliosis","label":"Scoliosis","type":"enum","tier":"intermediate","options":["none","mild","moderate","S-curve","C-curve"],"default":"none"},
  {"key":"pelvic_tilt","label":"Pelvic Tilt","type":"enum","tier":"intermediate","options":["anterior","neutral","posterior"],"default":"neutral","description":"Profoundly affects posture, belly, and posterior appearance"},
  {"key":"rib_cage_shape","label":"Rib Cage Shape","type":"enum","tier":"intermediate","options":["normal","barrel","funnel","pigeon","flared"],"default":"normal","description":"Funnel = pectus excavatum, pigeon = pectus carinatum"},
  {"key":"scapular_position","label":"Scapular Position","type":"enum","tier":"advanced","options":["neutral","protracted","retracted","winging"],"default":"neutral","description":"Affects upper back silhouette"},
  {"key":"spinal_length","label":"Spinal Length","type":"measurement","tier":"clinical","description":"C7 to S1 — independent of total height","units":["cm"],"defaultUnit":"cm","min":40,"max":65,"step":0.5,"default":{"value":50,"unit":"cm"}}
]'::jsonb WHERE slug = 'skeletal-alignment';

-- joints: 24 params
UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"shoulder_rom","label":"Shoulder ROM","type":"enum","tier":"basic","options":["limited","average","full","hypermobile"],"default":"full","description":"Overhead reach capacity"},
  {"key":"shoulder_stability","label":"Shoulder Stability","type":"enum","tier":"intermediate","options":["tight","stable","slightly-loose","loose","subluxation-prone"],"default":"stable"},
  {"key":"shoulder_click","label":"Shoulder Click","type":"enum","tier":"advanced","options":["none","occasional","frequent"],"default":"none"},
  {"key":"carrying_angle","label":"Carrying Angle","type":"enum","tier":"intermediate","options":["narrow","average","wide","hyperextended"],"default":"wide","description":"Elbow angle when arms relaxed — typically wider in women"},
  {"key":"elbow_hyperextension","label":"Elbow Hyperextension","type":"enum","tier":"intermediate","options":["none","slight","moderate","significant"],"default":"none"},
  {"key":"wrist_flexibility","label":"Wrist Flexibility","type":"enum","tier":"intermediate","options":["stiff","average","flexible","hypermobile"],"default":"flexible"},
  {"key":"wrist_ulnar_prominence","label":"Wrist Ulnar Prominence","type":"enum","tier":"advanced","options":["smooth","subtle","visible","prominent"],"default":"subtle","description":"Bony bump on the outer wrist"},
  {"key":"hip_rom","label":"Hip ROM","type":"enum","tier":"basic","options":["limited","average","full","hypermobile"],"default":"full","description":"Split and turnout capacity"},
  {"key":"hip_click","label":"Hip Click","type":"enum","tier":"advanced","options":["none","occasional","frequent"],"default":"none","description":"Snapping hip — common in women"},
  {"key":"femoral_anteversion","label":"Femoral Anteversion","type":"enum","tier":"clinical","options":["neutral","mild-inward","significant-inward"],"default":"neutral","description":"Inward femur rotation — affects knee and toe alignment"},
  {"key":"knee_hyperextension","label":"Knee Hyperextension","type":"enum","tier":"intermediate","options":["none","slight","moderate","genu-recurvatum"],"default":"none","description":"Affects leg line in profile"},
  {"key":"patella_position","label":"Patella Position","type":"enum","tier":"advanced","options":["normal","laterally-tracking","high-riding"],"default":"normal"},
  {"key":"q_angle","label":"Q-Angle","type":"enum","tier":"clinical","options":["narrow","average","wide","very-wide"],"default":"wide","description":"Quadriceps angle — wider in women, affects knock-knee tendency"},
  {"key":"ankle_rom","label":"Ankle ROM","type":"enum","tier":"intermediate","options":["limited","average","full","hypermobile"],"default":"full"},
  {"key":"ankle_stability","label":"Ankle Stability","type":"enum","tier":"intermediate","options":["stable","slightly-loose","loose","sprain-prone"],"default":"stable"},
  {"key":"finger_joint_flexibility","label":"Finger Joint Flexibility","type":"enum","tier":"intermediate","options":["stiff","average","flexible","hypermobile","double-jointed"],"default":"flexible"},
  {"key":"finger_joint_appearance","label":"Finger Joint Appearance","type":"enum","tier":"advanced","options":["smooth","subtle-knuckle","bony","prominent-knuckle","knotted"],"default":"smooth"},
  {"key":"toe_flexibility","label":"Toe Flexibility","type":"enum","tier":"intermediate","options":["rigid","limited","average","flexible","prehensile"],"default":"average"},
  {"key":"toe_joint_appearance","label":"Toe Joint Appearance","type":"enum","tier":"advanced","options":["smooth","subtle","bony","prominent"],"default":"smooth"},
  {"key":"joint_laxity","label":"General Joint Laxity","type":"enum","tier":"intermediate","options":["none","mild","moderate","generalized-hypermobility"],"default":"none","description":"Beighton score correlate"},
  {"key":"joint_sound_tendency","label":"Joint Sound Tendency","type":"enum","tier":"advanced","options":["silent","occasional-pop","frequent-cracking","dramatic"],"default":"occasional-pop"},
  {"key":"head_turn_range","label":"Head Turn Range","type":"enum","tier":"intermediate","options":["limited","average","wide","owl-like"],"default":"average","description":"Cervical ROM"},
  {"key":"leg_length_discrepancy","label":"Leg Length Discrepancy","type":"enum","tier":"clinical","options":["none","less-than-5mm","5-10mm","greater-than-10mm"],"default":"none"},
  {"key":"tibial_torsion","label":"Tibial Torsion","type":"enum","tier":"clinical","options":["neutral","mild-inward","mild-outward"],"default":"neutral","description":"Shin bone rotation — affects foot alignment"}
]'::jsonb WHERE slug = 'joints';

-- facial-profile: 12 params
UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"profile_type","label":"Profile Type","type":"enum","tier":"basic","options":["straight","convex","concave"],"default":"straight","description":"Overall face profile classification"},
  {"key":"cervicomental_angle","label":"Cervicomental Angle","type":"enum","tier":"intermediate","options":["acute","average","obtuse","very-obtuse"],"default":"average","description":"Jawline-to-neck angle — defines jaw definition in profile"},
  {"key":"mentolabial_fold","label":"Mentolabial Fold","type":"enum","tier":"intermediate","options":["flat","shallow","moderate","deep"],"default":"shallow","description":"Groove between lower lip and chin"},
  {"key":"buccal_fat","label":"Buccal Fat","type":"enum","tier":"intermediate","options":["hollow","slim","average","full","very-full"],"default":"average","description":"Cheek fullness below the cheekbone"},
  {"key":"malar_fat_pad","label":"Malar Fat Pad","type":"enum","tier":"advanced","options":["high-full","high-moderate","descended","flat"],"default":"high-full","description":"Mid-face fat pad position — descends with age"},
  {"key":"tear_trough","label":"Tear Trough","type":"enum","tier":"advanced","options":["none","subtle","moderate","deep","very-deep"],"default":"none","description":"Groove from inner eye to mid-cheek — key aging marker"},
  {"key":"nasolabial_fold","label":"Nasolabial Fold","type":"enum","tier":"advanced","options":["none","subtle","moderate","deep","very-deep"],"default":"none","description":"Nose-to-mouth groove depth"},
  {"key":"marionette_lines","label":"Marionette Lines","type":"enum","tier":"advanced","options":["none","subtle","moderate","deep"],"default":"none","description":"Lines from mouth corners downward"},
  {"key":"jowls","label":"Jowls","type":"enum","tier":"advanced","options":["none","minimal","mild","moderate","significant"],"default":"none","description":"Tissue laxity below the jawline"},
  {"key":"facial_convexity_angle","label":"Facial Convexity Angle","type":"measurement","tier":"clinical","description":"Glabella-subnasale-pogonion angle (~165-175 degrees)","units":["degrees"],"defaultUnit":"degrees","min":150,"max":185,"step":0.5,"default":{"value":170,"unit":"degrees"}},
  {"key":"lower_face_height","label":"Lower Face Height","type":"measurement","tier":"clinical","description":"Subnasale to menton","units":["mm"],"defaultUnit":"mm","min":50,"max":85,"step":0.5,"default":{"value":65,"unit":"mm"}},
  {"key":"midface_height","label":"Midface Height","type":"measurement","tier":"clinical","description":"Glabella to subnasale","units":["mm"],"defaultUnit":"mm","min":50,"max":85,"step":0.5,"default":{"value":65,"unit":"mm"}}
]'::jsonb WHERE slug = 'facial-profile';

-- teeth-smile: 19 params
UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"tooth_color","label":"Tooth Color","type":"enum","tier":"basic","options":["bright-white","natural-white","ivory","yellow-tinted","gray-tinted","stained"],"default":"natural-white"},
  {"key":"tooth_size","label":"Tooth Size","type":"enum","tier":"basic","options":["small","average","large","very-large"],"default":"average"},
  {"key":"tooth_shape","label":"Tooth Shape","type":"enum","tier":"basic","options":["square","ovoid","triangular","rounded"],"default":"ovoid"},
  {"key":"dental_show_at_rest","label":"Dental Show at Rest","type":"enum","tier":"basic","options":["none","1-2mm","2-3mm","3-4mm"],"default":"1-2mm","description":"How much tooth shows with lips relaxed"},
  {"key":"dental_alignment","label":"Dental Alignment","type":"enum","tier":"intermediate","options":["perfect","minor-crowding","gap-teeth","slight-overlap","noticeably-uneven"],"default":"perfect"},
  {"key":"diastema","label":"Diastema","type":"enum","tier":"intermediate","options":["none","subtle","noticeable","prominent"],"default":"none","description":"Central gap between front teeth"},
  {"key":"smile_width","label":"Smile Width","type":"enum","tier":"intermediate","options":["narrow","average","wide","very-wide"],"default":"average"},
  {"key":"smile_arc","label":"Smile Arc","type":"enum","tier":"intermediate","options":["flat","consonant","reverse"],"default":"consonant","description":"How upper teeth follow the lower lip curve"},
  {"key":"occlusion","label":"Occlusion","type":"enum","tier":"intermediate","options":["normal","overbite","underbite","crossbite","open-bite"],"default":"normal"},
  {"key":"buccal_corridor","label":"Buccal Corridor","type":"enum","tier":"advanced","options":["none","narrow","moderate","wide"],"default":"narrow","description":"Dark space at smile corners"},
  {"key":"gum_color","label":"Gum Color","type":"color","tier":"advanced","default":"#E8A0A0"},
  {"key":"gum_line","label":"Gum Line","type":"enum","tier":"advanced","options":["even","uneven","high","low"],"default":"even"},
  {"key":"lateral_tooth_show","label":"Lateral Tooth Show","type":"enum","tier":"advanced","options":["6-teeth","8-teeth","10-teeth","12-plus"],"default":"8-teeth","description":"How many teeth visible in a full smile"},
  {"key":"canine_prominence","label":"Canine Prominence","type":"enum","tier":"advanced","options":["subtle","average","prominent","vampiric"],"default":"average"},
  {"key":"overjet","label":"Overjet","type":"enum","tier":"advanced","options":["negative","normal","mild","moderate","severe"],"default":"normal","description":"Horizontal overlap of upper over lower teeth"},
  {"key":"tooth_texture","label":"Tooth Texture","type":"enum","tier":"advanced","options":["smooth","natural","rough","translucent-edges"],"default":"natural"},
  {"key":"tooth_wear","label":"Tooth Wear","type":"enum","tier":"advanced","options":["none","minimal","moderate","significant"],"default":"none"},
  {"key":"gingival_architecture","label":"Gingival Architecture","type":"enum","tier":"clinical","options":["thick-flat","thin-scalloped","thick-scalloped"],"default":"thin-scalloped"},
  {"key":"midline_alignment","label":"Midline Alignment","type":"enum","tier":"clinical","options":["centered","shifted-left","shifted-right"],"default":"centered","description":"Dental midline vs facial midline"}
]'::jsonb WHERE slug = 'teeth-smile';

-- expression-range: 14 params
UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"brow_mobility","label":"Brow Mobility","type":"enum","tier":"basic","options":["low","moderate","expressive","very-expressive"],"default":"expressive"},
  {"key":"eye_expressiveness","label":"Eye Expressiveness","type":"enum","tier":"basic","options":["subtle","moderate","expressive","intense"],"default":"expressive"},
  {"key":"mouth_mobility","label":"Mouth Mobility","type":"enum","tier":"basic","options":["tight","average","expressive","very-mobile"],"default":"expressive"},
  {"key":"smile_type","label":"Smile Type","type":"enum","tier":"basic","options":["closed-lip","slight-open","open","wide","gummy","asymmetric"],"default":"open"},
  {"key":"smile_character","label":"Smile Character","type":"text","tier":"basic","description":"Quality of the smile — slow spreading warmth, sudden full beam, etc."},
  {"key":"resting_face","label":"Resting Face","type":"text","tier":"basic","description":"Default neutral expression — looks slightly amused, pensive, alert, etc."},
  {"key":"nostril_flare_range","label":"Nostril Flare Range","type":"enum","tier":"intermediate","options":["none","slight","moderate","dramatic"],"default":"slight"},
  {"key":"eye_crinkle_on_smile","label":"Eye Crinkle on Smile","type":"enum","tier":"intermediate","options":["none","slight","crows-feet","deep"],"default":"slight","description":"Duchenne marker — genuine smile indicator"},
  {"key":"lip_curl_range","label":"Lip Curl Range","type":"enum","tier":"intermediate","options":["minimal","moderate","expressive"],"default":"moderate"},
  {"key":"jaw_clench_visibility","label":"Jaw Clench Visibility","type":"enum","tier":"advanced","options":["hidden","subtle","visible","prominent"],"default":"subtle","description":"Masseter pop on clench"},
  {"key":"forehead_wrinkle_on_raise","label":"Forehead Wrinkle on Raise","type":"enum","tier":"advanced","options":["none","faint","visible","deep"],"default":"faint"},
  {"key":"platysma_on_strain","label":"Platysma on Strain","type":"enum","tier":"advanced","options":["hidden","subtle","visible","banding"],"default":"hidden","description":"Neck muscle visibility on tension"},
  {"key":"crying_pattern","label":"Crying Pattern","type":"text","tier":"advanced","description":"How the face changes with tears — chin trembles, eyes redden slowly, etc."},
  {"key":"anger_tells","label":"Anger Tells","type":"text","tier":"advanced","description":"Distinctive anger markers — jaw sets, nostrils flare, eyes narrow, etc."}
]'::jsonb WHERE slug = 'expression-range';

-- voice: 14 params
UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"pitch_range","label":"Pitch Range","type":"enum","tier":"basic","options":["contralto","alto","mezzo-soprano","soprano"],"default":"mezzo-soprano"},
  {"key":"tone_quality","label":"Tone Quality","type":"enum","tier":"basic","options":["breathy","warm","clear","bright","husky","smoky","crystalline","bell-like"],"default":"warm"},
  {"key":"volume_tendency","label":"Volume Tendency","type":"enum","tier":"basic","options":["whisper-quiet","soft-spoken","moderate","projected","loud"],"default":"moderate"},
  {"key":"speaking_pace","label":"Speaking Pace","type":"enum","tier":"basic","options":["very-slow","slow","measured","average","fast","rapid-fire"],"default":"average"},
  {"key":"resonance","label":"Resonance","type":"enum","tier":"intermediate","options":["thin","nasal","balanced","chest-voice","full","rich"],"default":"balanced"},
  {"key":"vocal_texture","label":"Vocal Texture","type":"enum","tier":"intermediate","options":["smooth","slightly-rough","raspy","gravelly","silky"],"default":"smooth"},
  {"key":"vocal_fry","label":"Vocal Fry","type":"enum","tier":"intermediate","options":["none","occasional","frequent","constant"],"default":"none"},
  {"key":"breathiness","label":"Breathiness","type":"enum","tier":"intermediate","options":["none","slight","moderate","pronounced"],"default":"slight"},
  {"key":"articulation","label":"Articulation","type":"enum","tier":"intermediate","options":["mumbled","relaxed","clear","precise","clipped"],"default":"clear"},
  {"key":"laugh","label":"Laugh","type":"text","tier":"advanced","description":"Description of the characteristic laugh"},
  {"key":"speech_patterns","label":"Speech Patterns","type":"text","tier":"advanced","description":"Cadence, rhythm, verbal tics"},
  {"key":"accent","label":"Accent","type":"text","tier":"advanced","description":"Regional or cultural speech coloring"},
  {"key":"emotional_voice_range","label":"Emotional Voice Range","type":"enum","tier":"advanced","options":["flat","limited","moderate","expressive","dramatic"],"default":"expressive"},
  {"key":"singing_capability","label":"Singing Capability","type":"enum","tier":"advanced","options":["none","basic","competent","skilled","trained","exceptional"],"default":"competent"}
]'::jsonb WHERE slug = 'voice';

-- movement-dynamics: 22 params (merged physio + robotics + kinesiology)
UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"movement_fluidity","label":"Movement Fluidity","type":"enum","tier":"basic","options":["mechanical","controlled","natural","fluid","dance-like","cat-like"],"default":"natural"},
  {"key":"movement_confidence","label":"Movement Confidence","type":"enum","tier":"basic","options":["hesitant","careful","confident","bold","commanding"],"default":"confident"},
  {"key":"physical_energy","label":"Physical Energy","type":"enum","tier":"basic","options":["languid","calm","moderate","energetic","frenetic","explosive"],"default":"moderate"},
  {"key":"coordination","label":"Coordination","type":"enum","tier":"intermediate","options":["clumsy","average","coordinated","precise","extraordinary"],"default":"coordinated"},
  {"key":"balance","label":"Balance","type":"enum","tier":"intermediate","options":["unsteady","average","good","excellent","preternatural"],"default":"good"},
  {"key":"agility","label":"Agility","type":"enum","tier":"intermediate","options":["clumsy","average","agile","very-agile","cat-like"],"default":"average"},
  {"key":"speed_quality","label":"Speed Quality","type":"enum","tier":"intermediate","options":["slow","measured","average","quick","mercurial"],"default":"average"},
  {"key":"strength_impression","label":"Strength Impression","type":"enum","tier":"intermediate","options":["fragile","delicate","average","strong","powerful"],"default":"average"},
  {"key":"body_awareness","label":"Body Awareness","type":"enum","tier":"intermediate","options":["low","average","good","excellent","dancer-level"],"default":"average","description":"Proprioception quality"},
  {"key":"center_of_mass","label":"Center of Mass","type":"enum","tier":"intermediate","options":["low","average","high"],"default":"average","description":"Low (hip-heavy) vs high (chest-heavy) — affects balance and momentum"},
  {"key":"step_length","label":"Step Length","type":"enum","tier":"intermediate","options":["short","average","long","very-long"],"default":"average"},
  {"key":"cadence","label":"Cadence","type":"enum","tier":"intermediate","options":["slow","measured","average","brisk","quick"],"default":"average"},
  {"key":"arm_swing","label":"Arm Swing","type":"enum","tier":"intermediate","options":["none","minimal","moderate","full","exaggerated"],"default":"moderate"},
  {"key":"hip_sway","label":"Hip Sway","type":"enum","tier":"intermediate","options":["none","subtle","moderate","pronounced","exaggerated"],"default":"subtle","description":"Lateral pelvic motion during walk"},
  {"key":"ground_contact","label":"Ground Contact","type":"enum","tier":"advanced","options":["heel-strike","midfoot","forefoot"],"default":"heel-strike"},
  {"key":"stride_symmetry","label":"Stride Symmetry","type":"enum","tier":"advanced","options":["symmetric","slight-limp","noticeable-asymmetry"],"default":"symmetric"},
  {"key":"hand_eye_coordination","label":"Hand-Eye Coordination","type":"enum","tier":"advanced","options":["poor","average","good","excellent","preternatural"],"default":"average"},
  {"key":"reaction_time","label":"Reaction Time","type":"enum","tier":"advanced","options":["slow","average","fast","remarkable"],"default":"average"},
  {"key":"movement_signature","label":"Movement Signature","type":"text","tier":"advanced","description":"Characteristic patterns — hip-led walk, touches hair when thinking"},
  {"key":"fidget_patterns","label":"Fidget Patterns","type":"text","tier":"advanced","description":"Habitual micro-movements at rest"},
  {"key":"spatial_awareness","label":"Spatial Awareness","type":"enum","tier":"advanced","options":["low","average","high","extraordinary"],"default":"high"},
  {"key":"gait_signature","label":"Gait Signature","type":"text","tier":"advanced","description":"Distinctive walking pattern for identification"}
]'::jsonb WHERE slug = 'movement-dynamics';

-- deformation-dynamics: 11 params
UPDATE luv_chassis_modules SET parameter_schema = '[
  {"key":"breast_dynamics","label":"Breast Dynamics","type":"enum","tier":"basic","options":["none","minimal","natural","bouncy","very-bouncy"],"default":"natural"},
  {"key":"posterior_dynamics","label":"Posterior Dynamics","type":"enum","tier":"basic","options":["none","minimal","natural","bouncy","jiggly"],"default":"natural"},
  {"key":"belly_dynamics","label":"Belly Dynamics","type":"enum","tier":"intermediate","options":["rigid","minimal","soft","fluid"],"default":"minimal"},
  {"key":"thigh_dynamics","label":"Thigh Dynamics","type":"enum","tier":"intermediate","options":["firm","natural","soft","ripple"],"default":"natural"},
  {"key":"upper_arm_dynamics","label":"Upper Arm Dynamics","type":"enum","tier":"intermediate","options":["firm","natural","soft","wave"],"default":"natural"},
  {"key":"skin_elasticity_map","label":"Skin Elasticity Map","type":"text","tier":"advanced","description":"Where skin is tight vs loose — tight over ribcage, loose at inner elbow"},
  {"key":"jiggle_zones","label":"Jiggle Zones","type":"text","tier":"advanced","description":"Areas with significant secondary motion — lower belly, inner thigh, bust"},
  {"key":"muscle_flex_visibility","label":"Muscle Flex Visibility","type":"enum","tier":"advanced","options":["none","subtle","moderate","dramatic"],"default":"subtle"},
  {"key":"tendon_visibility_on_flex","label":"Tendon Visibility on Flex","type":"enum","tier":"advanced","options":["hidden","subtle","visible","prominent"],"default":"subtle"},
  {"key":"skin_fold_zones","label":"Skin Fold Zones","type":"text","tier":"advanced","description":"Where skin creases on flexion — horizontal neck lines, belly fold when sitting"},
  {"key":"compression_behavior","label":"Compression Behavior","type":"text","tier":"advanced","description":"How body parts deform under pressure — thigh spreads when sitting"}
]'::jsonb WHERE slug = 'deformation-dynamics';

-- ============================================================================
-- 4. Enhance existing modules (append new params to existing schemas)
-- ============================================================================

-- feet: +17 params (podiatrist)
UPDATE luv_chassis_modules SET parameter_schema = parameter_schema || '[
  {"key":"foot_pronation","label":"Foot Pronation","type":"enum","tier":"intermediate","options":["neutral","overpronated","supinated"],"default":"neutral","description":"How the foot rolls during gait"},
  {"key":"metatarsal_arch","label":"Metatarsal Arch","type":"enum","tier":"intermediate","options":["collapsed","low","normal","high"],"default":"normal","description":"Transverse arch across the ball of foot"},
  {"key":"ball_width","label":"Ball Width","type":"enum","tier":"intermediate","options":["narrow","average","wide","splayed"],"default":"average","description":"Width at metatarsal heads"},
  {"key":"big_toe_shape","label":"Big Toe Shape","type":"enum","tier":"intermediate","options":["straight","slight-bunion","moderate-bunion","severe-bunion","tapered"],"default":"straight"},
  {"key":"little_toe_shape","label":"Little Toe Shape","type":"enum","tier":"intermediate","options":["straight","tucked","curled","tailors-bunion","vestigial"],"default":"straight"},
  {"key":"plantar_fat_pad","label":"Plantar Fat Pad","type":"enum","tier":"advanced","options":["thin","average","cushioned","thick"],"default":"average","description":"Sole cushioning thickness"},
  {"key":"heel_width","label":"Heel Width","type":"enum","tier":"advanced","options":["narrow","average","wide"],"default":"average"},
  {"key":"heel_skin","label":"Heel Skin","type":"enum","tier":"advanced","options":["smooth","soft","slightly-rough","calloused","cracked"],"default":"soft"},
  {"key":"toe_pad_shape","label":"Toe Pad Shape","type":"enum","tier":"advanced","options":["flat","rounded","bulbous","tapered"],"default":"rounded"},
  {"key":"second_toe_detail","label":"Second Toe Detail","type":"enum","tier":"advanced","options":["flush","slight-extension","hammer","claw"],"default":"flush","description":"Morton''s toe specifics"},
  {"key":"toe_hair","label":"Toe Hair","type":"enum","tier":"advanced","options":["none","sparse","light","moderate","hairy"],"default":"none"},
  {"key":"toe_webbing","label":"Toe Webbing","type":"enum","tier":"advanced","options":["minimal","average","joined-2nd-3rd","significant"],"default":"minimal"},
  {"key":"dorsal_tendons","label":"Dorsal Tendons","type":"enum","tier":"advanced","options":["hidden","subtle","visible","prominent"],"default":"subtle","description":"Extensor tendons on top of foot"},
  {"key":"plantar_creases","label":"Plantar Creases","type":"enum","tier":"advanced","options":["minimal","average","defined","deep"],"default":"average","description":"Sole crease pattern"},
  {"key":"metatarsal_heads","label":"Metatarsal Heads","type":"enum","tier":"clinical","options":["hidden","subtle","visible","prominent"],"default":"subtle","description":"Ball-of-foot bone visibility"},
  {"key":"ankle_to_arch_line","label":"Ankle-to-Arch Line","type":"enum","tier":"clinical","options":["concave","straight","convex"],"default":"concave","description":"Inner foot profile from ankle to arch"},
  {"key":"weight_bearing_pattern","label":"Weight Bearing Pattern","type":"enum","tier":"clinical","options":["even","heel-heavy","forefoot-heavy","lateral-edge"],"default":"even","description":"Visible in standing posture"}
]'::jsonb WHERE slug = 'feet';

-- hands: +8 params (rigger + forensic)
UPDATE luv_chassis_modules SET parameter_schema = parameter_schema || '[
  {"key":"finger_proportions","label":"Finger Proportions","type":"enum","tier":"intermediate","options":["even","pianist","stubby","tapered"],"default":"tapered","description":"Relative finger length pattern"},
  {"key":"palm_shape","label":"Palm Shape","type":"enum","tier":"intermediate","options":["square","rectangular","long-narrow","wide"],"default":"rectangular"},
  {"key":"finger_flexibility","label":"Finger Flexibility","type":"enum","tier":"advanced","options":["stiff","average","flexible","double-jointed"],"default":"flexible"},
  {"key":"thumb_shape","label":"Thumb Shape","type":"enum","tier":"advanced","options":["straight","hitchhiker","clubbed"],"default":"straight","description":"Hitchhiker = curves backward"},
  {"key":"knuckle_prominence","label":"Knuckle Prominence","type":"enum","tier":"advanced","options":["smooth","subtle","bony","prominent"],"default":"smooth"},
  {"key":"grip_strength","label":"Grip Strength","type":"enum","tier":"advanced","options":["delicate","light","average","strong","very-strong"],"default":"average"},
  {"key":"finger_dexterity","label":"Finger Dexterity","type":"enum","tier":"advanced","options":["low","average","high","extraordinary","pianist-grade"],"default":"average"},
  {"key":"hand_span","label":"Hand Span","type":"measurement","tier":"clinical","description":"Thumb tip to pinky tip when spread","units":["mm"],"defaultUnit":"mm","min":150,"max":250,"step":5,"default":{"value":190,"unit":"mm"}}
]'::jsonb WHERE slug = 'hands';

-- eyebrows: +4 params (MUA)
UPDATE luv_chassis_modules SET parameter_schema = parameter_schema || '[
  {"key":"arch_height","label":"Arch Height","type":"enum","tier":"intermediate","options":["low","medium","high","very-high"],"default":"medium","description":"Vertical position of the brow peak — separate from arch shape"},
  {"key":"tail_length","label":"Tail Length","type":"enum","tier":"intermediate","options":["short","medium","long"],"default":"medium","description":"Short ends at outer eye, long extends past"},
  {"key":"fullness_gradient","label":"Fullness Gradient","type":"enum","tier":"advanced","options":["even","front-heavy","tail-heavy","sparse-center"],"default":"even"},
  {"key":"hair_direction","label":"Hair Direction","type":"enum","tier":"advanced","options":["uniform-upward","feathered","mixed","unruly"],"default":"feathered"}
]'::jsonb WHERE slug = 'eyebrows';

-- posture: +6 params (physio + forensic)
UPDATE luv_chassis_modules SET parameter_schema = parameter_schema || '[
  {"key":"sitting_posture","label":"Sitting Posture","type":"enum","tier":"basic","options":["upright","relaxed","slouched","cross-legged","perched","lotus"],"default":"relaxed"},
  {"key":"dominant_side","label":"Dominant Side","type":"enum","tier":"basic","options":["left","right","ambidextrous"],"default":"right"},
  {"key":"breathing_pattern","label":"Breathing Pattern","type":"enum","tier":"intermediate","options":["diaphragmatic","chest-dominant","shallow","deep"],"default":"diaphragmatic","description":"Visible in torso movement"},
  {"key":"resting_muscle_tone","label":"Resting Muscle Tone","type":"enum","tier":"intermediate","options":["low","normal","high","variable"],"default":"normal","description":"Visible as body tension"},
  {"key":"recovery_posture","label":"Recovery Posture","type":"enum","tier":"advanced","options":["collapsed","draped","controlled","alert"],"default":"draped","description":"How the body settles after exertion"},
  {"key":"sleep_posture","label":"Sleep Posture","type":"enum","tier":"advanced","options":["side","back","front","fetal"],"default":"side"}
]'::jsonb WHERE slug = 'posture';

-- eyes: +7 params (MUA eyelid topology + ophthalmologist)
UPDATE luv_chassis_modules SET parameter_schema = parameter_schema || '[
  {"key":"eyelid_crease","label":"Eyelid Crease","type":"enum","tier":"intermediate","options":["none","low","medium","high","double"],"default":"medium","description":"Crease position — none = monolid"},
  {"key":"eyelid_space","label":"Eyelid Space","type":"enum","tier":"intermediate","options":["minimal","small","medium","large"],"default":"medium","description":"Visible lid when eyes open"},
  {"key":"hood_degree","label":"Hood Degree","type":"enum","tier":"intermediate","options":["none","slight","moderate","heavy"],"default":"none","description":"How much lid skin covers the crease"},
  {"key":"waterline_visibility","label":"Waterline Visibility","type":"enum","tier":"advanced","options":["hidden","visible","prominent"],"default":"visible"},
  {"key":"pupil_size","label":"Pupil Size","type":"enum","tier":"advanced","options":["small","average","large","very-large"],"default":"average","description":"Affects expression intensity, varies with light"},
  {"key":"blink_rate","label":"Blink Rate","type":"enum","tier":"advanced","options":["infrequent","average","frequent","rapid"],"default":"average"},
  {"key":"tear_film","label":"Tear Film","type":"enum","tier":"clinical","options":["dry","normal","watery","glistening"],"default":"normal","description":"Affects dewy or glassy eye appearance"}
]'::jsonb WHERE slug = 'eyes';

-- skin: +12 params (MUA + dermatologist)
UPDATE luv_chassis_modules SET parameter_schema = parameter_schema || '[
  {"key":"undereye_color","label":"Under-Eye Color","type":"enum","tier":"intermediate","options":["none","slight-shadow","blue-purple","brown","dark-circles"],"default":"none"},
  {"key":"lip_skin_texture","label":"Lip Skin Texture","type":"enum","tier":"intermediate","options":["smooth","natural","slightly-dry","dry","cracked"],"default":"smooth"},
  {"key":"skin_sensitivity","label":"Skin Sensitivity","type":"enum","tier":"intermediate","options":["robust","normal","sensitive","very-sensitive","reactive"],"default":"normal"},
  {"key":"periorbital_thickness","label":"Periorbital Thickness","type":"enum","tier":"advanced","options":["thin","average","thick"],"default":"average","description":"Skin thickness around the eyes — thin shows veins"},
  {"key":"photo_aging_vs_chrono","label":"Photo-Aging vs Chronological","type":"enum","tier":"advanced","options":["under-aged","matches-age","mild-photo-aging","moderate-photo-aging"],"default":"matches-age"},
  {"key":"skin_thickness_face","label":"Facial Skin Thickness","type":"enum","tier":"advanced","options":["thin","average","thick"],"default":"average"},
  {"key":"skin_thickness_body","label":"Body Skin Thickness","type":"enum","tier":"advanced","options":["thin","average","thick"],"default":"average"},
  {"key":"age_spot_tendency","label":"Age Spot Tendency","type":"enum","tier":"advanced","options":["none","minimal","some","noticeable","significant"],"default":"none"},
  {"key":"stretch_mark_distribution","label":"Stretch Mark Distribution","type":"text","tier":"advanced","description":"Where stretch marks appear — inner thighs, hips, breasts"},
  {"key":"capillary_fragility","label":"Capillary Fragility","type":"enum","tier":"clinical","options":["low","average","high"],"default":"low","description":"Bruising tendency, visible broken capillaries"},
  {"key":"dermographism","label":"Dermographism","type":"enum","tier":"clinical","options":["none","mild","moderate"],"default":"none","description":"Skin that reddens or welts when pressed"},
  {"key":"wound_healing","label":"Wound Healing","type":"enum","tier":"clinical","options":["fast","average","slow"],"default":"average","description":"Affects how old scars appear"}
]'::jsonb WHERE slug = 'skin';

-- bust: +6 params (surgeon + couture)
UPDATE luv_chassis_modules SET parameter_schema = parameter_schema || '[
  {"key":"bra_size","label":"Bra Size Reference","type":"text","tier":"basic","description":"Standard bra size as reference descriptor"},
  {"key":"across_chest","label":"Across Chest","type":"measurement","tier":"intermediate","description":"Armpit to armpit across front","units":["cm","in"],"defaultUnit":"cm","min":28,"max":45,"step":0.5,"default":{"value":34,"unit":"cm"}},
  {"key":"breast_base_width","label":"Breast Base Width","type":"enum","tier":"advanced","options":["narrow","average","wide","very-wide"],"default":"average","description":"Width where breast contacts chest wall"},
  {"key":"sternal_notch_to_nipple","label":"Sternal Notch to Nipple","type":"measurement","tier":"clinical","description":"Key surgical planning distance","units":["cm"],"defaultUnit":"cm","min":15,"max":30,"step":0.5,"default":{"value":20,"unit":"cm"}},
  {"key":"nipple_to_fold","label":"Nipple to Fold","type":"measurement","tier":"clinical","description":"Nipple to inframammary fold","units":["cm"],"defaultUnit":"cm","min":3,"max":18,"step":0.5,"default":{"value":7,"unit":"cm"}},
  {"key":"intermammary_distance","label":"Intermammary Distance","type":"measurement","tier":"clinical","description":"Distance between nipples","units":["cm"],"defaultUnit":"cm","min":15,"max":30,"step":0.5,"default":{"value":20,"unit":"cm"}}
]'::jsonb WHERE slug = 'bust';

-- frame: +6 params (surgeon ratios + couture + kinesiology)
UPDATE luv_chassis_modules SET parameter_schema = parameter_schema || '[
  {"key":"dress_size","label":"Dress Size Reference","type":"text","tier":"basic","description":"Approximate standard sizing shorthand"},
  {"key":"cardiovascular_fitness","label":"Cardiovascular Fitness","type":"enum","tier":"intermediate","options":["sedentary","low","moderate","fit","athletic","elite"],"default":"moderate"},
  {"key":"endurance","label":"Endurance","type":"enum","tier":"intermediate","options":["low","limited","average","good","high","marathon-level"],"default":"average"},
  {"key":"power_to_weight","label":"Power-to-Weight","type":"enum","tier":"advanced","options":["low","average","high","explosive"],"default":"average"},
  {"key":"arm_span_to_height","label":"Arm Span to Height","type":"range","tier":"clinical","description":"Ratio typically ~1.0; marfanoid if >1.05","min":0.9,"max":1.15,"step":0.01,"default":1.0},
  {"key":"sitting_height_ratio","label":"Sitting Height Ratio","type":"range","tier":"clinical","description":"Sitting height / standing height","min":0.45,"max":0.60,"step":0.01,"default":0.52}
]'::jsonb WHERE slug = 'body-proportions';

-- shoulders-neck: +2 params (couture)
UPDATE luv_chassis_modules SET parameter_schema = parameter_schema || '[
  {"key":"across_back","label":"Across Back","type":"measurement","tier":"intermediate","description":"Armpit to armpit across back","units":["cm","in"],"defaultUnit":"cm","min":28,"max":48,"step":0.5,"default":{"value":36,"unit":"cm"}},
  {"key":"armscye_depth","label":"Armscye Depth","type":"measurement","tier":"advanced","description":"Depth of armhole","units":["cm","in"],"defaultUnit":"cm","min":15,"max":28,"step":0.5,"default":{"value":20,"unit":"cm"}}
]'::jsonb WHERE slug = 'shoulders-neck';

-- torso: +1 param (couture)
UPDATE luv_chassis_modules SET parameter_schema = parameter_schema || '[
  {"key":"back_length","label":"Back Length","type":"measurement","tier":"intermediate","description":"Nape of neck to natural waist","units":["cm","in"],"defaultUnit":"cm","min":35,"max":50,"step":0.5,"default":{"value":40,"unit":"cm"}}
]'::jsonb WHERE slug = 'torso';

-- hips-pelvis: +1 param (couture)
UPDATE luv_chassis_modules SET parameter_schema = parameter_schema || '[
  {"key":"rise","label":"Rise","type":"measurement","tier":"intermediate","description":"Waist to crotch — determines pant rise","units":["cm","in"],"defaultUnit":"cm","min":22,"max":35,"step":0.5,"default":{"value":27,"unit":"cm"}}
]'::jsonb WHERE slug = 'hips-pelvis';

-- upper-legs: +2 params (couture)
UPDATE luv_chassis_modules SET parameter_schema = parameter_schema || '[
  {"key":"inseam","label":"Inseam","type":"measurement","tier":"intermediate","description":"Crotch to floor","units":["cm","in"],"defaultUnit":"cm","min":65,"max":95,"step":0.5,"default":{"value":76,"unit":"cm"}},
  {"key":"outseam","label":"Outseam","type":"measurement","tier":"clinical","description":"Waist to floor along outer leg","units":["cm","in"],"defaultUnit":"cm","min":90,"max":125,"step":0.5,"default":{"value":105,"unit":"cm"}}
]'::jsonb WHERE slug = 'upper-legs';

-- ============================================================================
-- 5. Reload PostgREST schema cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';
