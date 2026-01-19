# APPENDIX: Parametric Human Character System (PHCS)

## Document Status

**Version**: 1.0-draft
**Last Updated**: 2026-01-18
**Integration Target**: Stable Character Management System

This appendix defines the **Parametric Human Character System (PHCS)** specification and its integration with the Stable tool's parametric data model.

---

## 1. Overview

### Product Name
Parametric Human Character System (PHCS)

### Summary
PHCS is a **measurement-grounded, parametric representation of human character identity** that aggregates anthropometric, medical/aesthetic, and anatomical frameworks into a structured specification ("AnatomySpec").

**Scope**: PHCS defines the **identity layer only** - skeletal structure, facial morphology, and body proportions. Contextual presentation (expression, pose, garments, etc.) is handled by the asset system.

The system provides:
- A canonical parameter model for anatomical identity
- Identity persistence across contexts, renders, and media
- Validation against real-world anthropometric data
- Foundation for composition with contextual asset modifiers

The system explicitly decouples **anatomical identity** from **contextual presentation, rendering style, medium, or model**.

### Integration with Stable
PHCS defines the structure and semantics of the `parametric_data` JSONB field in Stable's `stable_characters` table. It provides the "nucleus" around which all character assets, relationships, and representations orbit.

---

## 2. Goals & Non-Goals

### Goals
- Define a **portable, versioned parametric model** of a human character
- Enable **realistic, measurement-based character variation**
- Provide **visual validation** of parameters via a web-based 3D viewer (future)
- Generate **quantitative conditioning context** for diffusion/video models
- Ensure **consistency across models, shots, and media**

### Non-Goals
- Real-time animation playback or game-engine-level interaction
- High-fidelity lookdev (advanced shaders, lighting, hair simulation)
- Physics-based body or muscle simulation
- Training or fine-tuning generative models

---

## 3. Target Users

- Technical artists / character TDs
- Creative technologists working with diffusion/video models
- Tooling engineers building generative pipelines
- Studios managing recurring characters across media
- Researchers exploring structured human representations

**Primary User**: Jon Friis (personal creative tool for synthetic character design)

---

## 4. Core Conceptual Model

### 4.1 Human Description Stack

The system aggregates multiple real-world and digital frameworks:

#### A. Anthropometric & Ergonomic Layer
- Absolute and relative body measurements
- Proportions derived from clothing, ergonomics, and population datasets
- Provides scale, plausibility bounds, and ratio-based constraints

**Data Sources**:
- ANSUR II (U.S. Army anthropometric survey)
- ISO 7250 (basic human body measurements)
- Clothing industry size standards
- Medical anthropometry databases

#### B. Medical / Aesthetic Morphology Layer
- Facial landmarks and proportional relationships
- Objective descriptors of facial and body morphology
- Expression bases inspired by FACS (Facial Action Coding System) or ARKit-style coefficients

**Frameworks**:
- FACS (Facial Action Coding System)
- Apple ARKit blendshapes
- Medical craniofacial measurement standards

#### C. Identity vs Context Distinction

**PHCS AnatomySpec contains ONLY identity-defining parameters**:
- Bone structure and skeletal proportions
- Facial morphology (jaw shape, nose structure, eye spacing)
- Body proportions (limb ratios, torso length)
- Height and build

**Contextual parameters are handled as Assets**, not in AnatomySpec:
- Expression (facial muscle activation) → Expression assets
- Pose (skeletal rig state) → Pose assets
- Posture (habitual stance) → Posture assets
- Garments, hair, makeup, skin state → Corresponding asset types

This separation enables:
- **Identity persistence** across renders, media, and time
- **Asset reusability** (same expression applies to multiple characters)
- **Composition flexibility** (mix and match contextual modifiers)

See [COMPOSITION-ARCHITECTURE.md](./COMPOSITION-ARCHITECTURE.md) for complete composition model.

---

## 5. AnatomySpec (Character Identity Model)

### 5.1 Purpose
AnatomySpec is the **single source of truth** for a character's anatomical identity - the unchanging skeletal structure, facial morphology, and body proportions that define WHO the character is.

**Note**: Previously called "CharacterSpec", now renamed "AnatomySpec" to clarify that it contains only anatomical identity, not presentation/context.

### 5.2 Format
- **Encoding**: JSON
- **Versioning**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Compatibility**: Engine-agnostic, framework-neutral
- **Validation**: JSON Schema with custom constraint rules

### 5.3 Complete Schema Structure

```json
{
  "meta": {
    "version": "1.0.0",
    "units": "metric",
    "topologyId": "human_base_v3",
    "createdAt": "2026-01-18T12:00:00Z",
    "updatedAt": "2026-01-18T12:00:00Z",
    "author": "stable_tool",
    "validationMode": "warn"
  },

  "identity": {
    "body": {
      "height": {
        "value": 1.78,
        "unit": "m",
        "type": "absolute",
        "source": "measured"
      },
      "shoulderWidth": {
        "value": 0.42,
        "unit": "m",
        "type": "absolute"
      },
      "waistCircumference": {
        "value": 0.82,
        "unit": "m",
        "type": "absolute"
      },
      "hipWidth": {
        "value": 0.38,
        "unit": "m",
        "type": "absolute"
      },
      "inseam": {
        "value": 0.82,
        "unit": "m",
        "type": "absolute"
      },
      "armSpan": {
        "value": 1.80,
        "unit": "m",
        "type": "absolute"
      },
      "neckCircumference": {
        "value": 0.38,
        "unit": "m",
        "type": "absolute"
      },
      "chestCircumference": {
        "value": 0.98,
        "unit": "m",
        "type": "absolute"
      },
      "proportions": {
        "legToTorsoRatio": {
          "value": 1.12,
          "type": "ratio",
          "note": "legs 12% longer than torso"
        },
        "shoulderToHipRatio": {
          "value": 1.11,
          "type": "ratio",
          "note": "shoulder width 11% greater than hip width"
        }
      }
    },

    "face": {
      "skull": {
        "width": {
          "value": 0.145,
          "unit": "m",
          "type": "absolute"
        },
        "height": {
          "value": 0.220,
          "unit": "m",
          "type": "absolute"
        },
        "depth": {
          "value": 0.180,
          "unit": "m",
          "type": "absolute"
        }
      },
      "features": {
        "jawWidth": {
          "value": 0.18,
          "unit": "m",
          "type": "absolute"
        },
        "chinProjection": {
          "value": 0.015,
          "unit": "m",
          "type": "absolute",
          "note": "projection beyond vertical facial plane"
        },
        "noseBridgeHeight": {
          "value": -0.04,
          "type": "normalized",
          "range": [-1, 1],
          "basis": "population_mean",
          "note": "-0.04 = slightly below average prominence"
        },
        "eyeSpacing": {
          "value": 0.065,
          "unit": "m",
          "type": "absolute",
          "note": "interpupillary distance"
        },
        "cheekboneProminence": {
          "value": 0.12,
          "type": "normalized",
          "range": [-1, 1],
          "basis": "population_mean"
        },
        "browRidgeProminence": {
          "value": -0.08,
          "type": "normalized",
          "range": [-1, 1],
          "basis": "population_mean"
        }
      },
      "proportions": {
        "facialThirds": {
          "upperThird": 0.34,
          "middleThird": 0.33,
          "lowerThird": 0.33,
          "note": "vertical division: hairline to brow, brow to nose, nose to chin"
        },
        "facialFifths": {
          "note": "horizontal division: face width divided into 5 eye-widths",
          "valid": true
        }
      }
    },

    "demographics": {
      "ageRange": {
        "min": 25,
        "max": 35,
        "note": "apparent age range for this character"
      },
      "populationReferences": [
        {
          "dataset": "ANSUR_II_male",
          "percentile": 65,
          "measurements": ["height", "shoulderWidth"]
        }
      ],
      "notes": "Reference populations used for plausibility validation only. Individual variation may exceed dataset bounds."
    }
  },

  "constraints": {
    "biometricBounds": {
      "armSpanToHeight": {
        "min": 0.95,
        "max": 1.05,
        "note": "Vitruvian ratio ±5%"
      },
      "neckCircumferenceToHeight": {
        "min": 0.18,
        "max": 0.25,
        "note": "typical range for adults"
      },
      "legLengthToHeight": {
        "min": 0.45,
        "max": 0.53,
        "note": "inseam as proportion of total height"
      }
    },
    "facialConstraints": {
      "eyeSpacingToFaceWidth": {
        "min": 0.40,
        "max": 0.48,
        "note": "IPD relative to bitragion width"
      }
    }
  },

  "validation": {
    "status": "valid",
    "warnings": [],
    "errors": [],
    "lastValidated": "2026-01-18T12:00:00Z"
  }
}
```

---

## 6. Parameter Specification

### 6.1 Parameter Types

#### A. Absolute Parameters
- **Definition**: Real-world measurements with explicit units
- **Units**: Metric (meters, centimeters, degrees)
- **Examples**: height (1.78m), shoulder width (0.42m), head pitch (1.0°)
- **Validation**: Must fall within human-plausible ranges

#### B. Normalized Parameters
- **Definition**: Relative values scaled to population distribution
- **Range**: Typically [-1, 1] or [0, 1]
- **Basis**: Population mean (0), ±1σ or ±2σ
- **Examples**: nose bridge height, cheekbone prominence
- **Interpretation**:
  - 0 = population mean
  - +1 = 1-2 standard deviations above mean
  - -1 = 1-2 standard deviations below mean

#### C. Ratio Parameters
- **Definition**: Proportional relationships between measurements
- **Examples**: leg-to-torso ratio, shoulder-to-hip ratio
- **Validation**: Must satisfy geometric constraints

#### D. Categorical Parameters
- **Definition**: Discrete qualitative states
- **Examples**: habitual posture ("slouched", "neutral", "upright")
- **Validation**: Must be from predefined set

### 6.2 Normalization Standards

```json
{
  "normalizationBasis": {
    "population": "ANSUR_II_combined",
    "scalingMethod": "z-score",
    "targetRange": [-1, 1],
    "clampingPolicy": "allow_outliers",
    "note": "Values outside [-1, 1] indicate statistical outliers (>2σ)"
  }
}
```

---

## 7. Topology Specification

### 7.1 Supported Topologies

#### human_base_v3 (Default)
- **Mesh**: 8,500 vertices, 17,000 triangles
- **Rig**: 73-bone skeleton (Mixamo-compatible)
- **Blendshapes**: 52 FACS-based facial shapes
- **UV Layout**: Single 2K texture atlas
- **Target Use**: Web viewer, lightweight conditioning

#### human_detailed_v1 (Future)
- **Mesh**: 45,000 vertices, 90,000 triangles
- **Rig**: 120-bone skeleton with facial bones
- **Blendshapes**: 120+ ARKit-compatible shapes
- **UV Layout**: Multi-tile 4K textures
- **Target Use**: High-fidelity export, film production

### 7.2 Topology Versioning

**Migration Policy**:
- **Minor version updates** (v3.0 → v3.1): Additive changes, backward compatible
- **Major version updates** (v3 → v4): Breaking changes, manual migration required

**Parameter Compatibility**:
- Core identity parameters transfer between topologies
- Topology-specific parameters (blendshape counts) may require mapping

---

## 8. Conditioning Artifacts (Export Outputs)

### 8.1 Purpose
CharacterSpec can generate quantitative outputs for use as conditioning inputs to generative models (ControlNet, AnimateDiff, etc.)

### 8.2 Supported Artifact Types

#### A. Depth Maps
```json
{
  "type": "depth_map",
  "format": "png",
  "resolution": [512, 768],
  "depth_range": [0, 255],
  "encoding": "grayscale",
  "camera": {
    "fov": 50,
    "position": [0, 1.6, 2.5],
    "target": [0, 1.6, 0]
  }
}
```

#### B. Pose Keypoints
```json
{
  "type": "openpose_keypoints",
  "format": "json",
  "skeleton": "coco_17",
  "keypoints": [
    {"id": 0, "name": "nose", "x": 256, "y": 180, "confidence": 1.0},
    {"id": 1, "name": "neck", "x": 256, "y": 220, "confidence": 1.0}
    // ... 15 more keypoints
  ]
}
```

#### C. Segmentation Masks
```json
{
  "type": "segmentation_mask",
  "format": "png",
  "resolution": [512, 768],
  "classes": {
    "0": "background",
    "1": "head",
    "2": "torso",
    "3": "left_arm",
    "4": "right_arm",
    "5": "left_leg",
    "6": "right_leg"
  },
  "encoding": "indexed_color"
}
```

#### D. Normal Maps
```json
{
  "type": "normal_map",
  "format": "png",
  "resolution": [512, 768],
  "space": "tangent",
  "encoding": "rgb",
  "note": "RGB channels encode XYZ normal vector"
}
```

### 8.3 Generation Pipeline

1. **CharacterSpec → 3D Scene**: Load topology, apply parameters
2. **3D Scene → Renderer**: Position camera, set lighting
3. **Renderer → Artifacts**: Generate depth/pose/segmentation/normal outputs
4. **Artifacts → Storage**: Save to Stable assets system

---

## 9. Validation & Constraints

### 9.1 Validation Modes

- **strict**: Reject any parameter outside defined bounds
- **warn**: Accept with warnings logged to `validation.warnings`
- **permissive**: Accept all values, no validation

### 9.2 Constraint Types

#### A. Biometric Bounds
Physical plausibility constraints based on human anatomy

```json
{
  "armSpanToHeight": {
    "min": 0.95,
    "max": 1.05,
    "severity": "error",
    "message": "Arm span should be 95-105% of height (Vitruvian ratio)"
  }
}
```

#### B. Geometric Constraints
Mathematical relationships that must hold

```json
{
  "shoulderWidthLessThanHeight": {
    "rule": "body.shoulderWidth.value < identity.body.height.value",
    "severity": "error"
  }
}
```

#### C. Dependency Constraints
Parameter interdependencies

```json
{
  "facialThirdsSumToOne": {
    "rule": "sum(face.proportions.facialThirds.*) == 1.0",
    "tolerance": 0.01,
    "severity": "warn"
  }
}
```

### 9.3 Validation Output

```json
{
  "validation": {
    "status": "valid_with_warnings",
    "errors": [],
    "warnings": [
      {
        "parameter": "identity.body.armSpan",
        "constraint": "armSpanToHeight",
        "message": "Arm span is 101% of height (within bounds but unusual)",
        "severity": "info"
      }
    ],
    "lastValidated": "2026-01-18T12:00:00Z",
    "validatedBy": "phcs_validator_v1.0"
  }
}
```

---

## 10. Integration with Stable

### 10.1 Data Model Mapping

AnatomySpec lives in Stable's `parametric_data` JSONB field as part of the composition model:

```typescript
// Stable's character table
interface Character {
  id: string;
  name: string;
  description: string | null;
  parametric_data: StableParametricData; // <-- Composition model
  created_at: string;
  updated_at: string;
}

// Stable's parametric data structure (composition of identity specs + defaults)
interface StableParametricData {
  // Core anatomical identity (PHCS v1.0)
  anatomy_spec: AnatomySpec;

  // Future identity specs (modular)
  personality_spec?: PersonalitySpec;  // Future
  voice_spec?: VoiceSpec;              // Future
  behavior_spec?: BehaviorSpec;        // Future

  // Default asset references (for neutral presentation)
  defaults: {
    expression_id?: string;   // FK to stable_assets (e.g., "neutral")
    pose_id?: string;         // FK to stable_assets (e.g., "relaxed standing")
    skin_state_id?: string;   // FK to stable_assets (e.g., "base tone")
    garment_id?: string;      // FK to stable_assets (optional)
    hair_style_id?: string;   // FK to stable_assets (optional)
  };

  // Non-parametric notes
  visual_notes?: Record<string, unknown>;
  narrative?: Record<string, unknown>;

  // Metadata
  spec_version: string;
  last_validated: string;
}
```

### 10.1a Composition Model

See [COMPOSITION-ARCHITECTURE.md](./COMPOSITION-ARCHITECTURE.md) for complete details.

**Character Generation Workflow**:

```typescript
// 1. Get character identity
const character = await getCharacter(id);
const identity = character.parametric_data.anatomy_spec;

// 2. Get default assets (or contextual overrides)
const defaults = character.parametric_data.defaults;
const expression = await getAsset(defaults.expression_id);  // "neutral"
const pose = await getAsset(defaults.pose_id);              // "relaxed standing"
const skinState = await getAsset(defaults.skin_state_id);   // "base tone"

// 3. Compose complete character state
const composedState = {
  identity: identity,
  expression: expression,
  pose: pose,
  skinState: skinState,
};

// 4. Generate conditioning artifacts
const artifacts = await generateConditioningArtifacts(composedState, {
  cameraAngle: 'front',
  resolution: [512, 768]
});

// 5. Store artifacts as assets
await createAsset({
  character_id: character.id,
  asset_type: 'generative_output',
  name: 'Front View Depth Map',
  data: { artifact_type: 'depth_map', ... },
  file_url: artifacts.depthMap.url,
  tags: ['conditioning', 'depth_map']
});
```

### 10.2 Asset Relationship

PHCS-generated conditioning artifacts are stored as Stable assets:

```typescript
// Example: Store depth map as asset
const depthMapAsset: CreateAssetInput = {
  character_id: character.id,
  asset_type: 'generative_output',
  name: 'Front View Depth Map',
  data: {
    artifact_type: 'depth_map',
    generated_from_spec: true,
    spec_version: '1.0.0',
    camera_angle: 'front',
    resolution: [512, 768]
  },
  file_url: 'https://storage.supabase.co/...',
  file_type: 'image/png',
  tags: ['conditioning', 'depth_map', 'front_view']
};
```

### 10.3 Workflow Integration

#### A. Character Creation
1. User creates character in Stable
2. User fills out PHCS parameters via structured form (Phase 4)
3. System validates CharacterSpec
4. System stores in `parametric_data.phcs_spec`

#### B. Conditioning Generation
1. User triggers "Generate Conditioning Artifacts" action
2. System reads `phcs_spec` from character
3. System generates depth/pose/segmentation/normal maps
4. System stores outputs as Stable assets
5. User downloads artifacts for use in ComfyUI/A1111/etc.

#### C. Character Iteration
1. User updates PHCS parameters
2. System re-validates CharacterSpec
3. System optionally regenerates conditioning artifacts
4. System maintains version history (future feature)

---

## 11. Style & Presentation Boundary

### 11.1 What PHCS AnatomySpec Covers (Identity Only)
- Skeletal structure and bone proportions
- Facial morphology (skull shape, jaw structure, feature positions)
- Body measurements and proportions (height, limb ratios)
- Morphological variation (nose shape, jaw width, cheekbone prominence)

### 11.2 What PHCS Does NOT Cover
These are handled separately in Stable's asset system:

#### A. Contextual Presentation (CRITICAL: Now Assets)
- **Expression**: Facial muscle activation (FACS coefficients) → Expression assets
- **Pose**: Skeletal rig state (joint rotations) → Pose assets
- **Posture**: Habitual stance configuration → Posture assets

**Storage**: `stable_assets` table with `asset_type` = 'expression', 'pose', or 'posture'

#### B. Appearance & Style
- Skin tone, texture, complexion → Skin state assets
- Hair style, color, length → Hair style assets
- Makeup, cosmetics → Makeup assets
- Eye color, scars, tattoos → Visual notes or reference images

**Storage**: `stable_assets` (skin_state, hair_style, makeup) or `parametric_data.visual_notes`

#### C. Clothing & Accessories
- Garments, outfits, costumes → Garment assets
- Jewelry, glasses, hats → Accessory assets
- Props held or worn → Prop assets

**Storage**: `stable_assets` with `asset_type` = 'garment'

#### D. Contextual Elements
- Lighting, environment
- Camera angle (except for artifact generation)
- Rendering style (photorealistic vs. stylized)

**Storage**: Stored in generation prompts (assets) or scene definitions (future)

### 11.3 Integration Example

```json
{
  "parametric_data": {
    // Identity layer (AnatomySpec)
    "anatomy_spec": {
      "meta": { "version": "1.0.0", "topologyId": "human_base_v3" },
      "identity": {
        "body": { "height": { "value": 1.78, "unit": "m" }, /* ... */ },
        "face": { "skull": { /* ... */ }, "features": { /* ... */ } }
      },
      "constraints": { /* ... */ }
    },

    // Default assets (neutral presentation)
    "defaults": {
      "expression_id": "uuid-neutral-expression",
      "pose_id": "uuid-relaxed-standing",
      "skin_state_id": "uuid-medium-warm-healthy",
      "garment_id": null,      // No default garment
      "hair_style_id": null    // No default hair style
    },

    // Non-parametric notes
    "visual_notes": {
      "eye_color": "hazel_green",
      "distinguishing_marks": "small_scar_left_eyebrow",
      "general_impression": "approachable, athletic build"
    },

    "narrative": {
      "backstory": "...",
      "role": "protagonist",
      "relationships": { /* ... */ }
    },

    // Metadata
    "spec_version": "1.0.0",
    "last_validated": "2026-01-18T12:00:00Z"
  }
}
```

**Corresponding Assets** (in `stable_assets` table):

```json
// Expression asset (universal - available to all characters)
{
  "id": "uuid-neutral-expression",
  "character_id": null,  // Universal asset
  "asset_type": "expression",
  "name": "Neutral Expression",
  "data": {
    "type": "facs_coefficients",
    "coefficients": {
      "smile": 0.0,
      "browRaise": 0.0,
      "jawOpen": 0.0
    }
  }
}

// Pose asset (universal)
{
  "id": "uuid-relaxed-standing",
  "character_id": null,
  "asset_type": "pose",
  "name": "Relaxed Standing",
  "data": {
    "type": "skeletal_rig_state",
    "joints": {
      "pelvisTilt": { "value": 0.0, "unit": "degrees" },
      "spineCurve": { "value": 5.0, "unit": "degrees" },
      "headPitch": { "value": 0.0, "unit": "degrees" }
    }
  }
}

// Skin state asset (character-specific)
{
  "id": "uuid-medium-warm-healthy",
  "character_id": "character-uuid-here",
  "asset_type": "skin_state",
  "name": "Base Skin Tone",
  "data": {
    "type": "skin_configuration",
    "tone": "medium_warm",
    "texture": "smooth",
    "condition": "healthy",
    "reference": "Fitzpatrick_Type_IV"
  }
}
```

---

## 12. Implementation Roadmap

### Phase 0: Prototype & Validation (Pre-Stable Integration)
**Goal**: Validate parameter expressiveness with real characters

1. Define minimal CharacterSpec v0.1
   - Core body parameters (5-10 measurements)
   - Core face parameters (5-10 features)
   - Basic expression/pose
2. Create 2-3 test characters manually (JSON files)
3. Build proof-of-concept validation script
4. Gather feedback on parameter coverage

**Deliverables**:
- CharacterSpec v0.1 JSON Schema
- 3 example character JSON files
- Python validation script
- Gap analysis document

### Phase 1: Stable Integration (Aligns with Stable Phase 1)
**Goal**: Store and validate PHCS specs in Stable

1. Finalize CharacterSpec v1.0 schema
2. Add JSON Schema to codebase
3. Create TypeScript types for CharacterSpec
4. Build JSON editor UI in Stable
5. Implement client-side validation

**Deliverables**:
- `lib/types/phcs.ts` with full TypeScript types
- `lib/validation/phcs-validator.ts` validation logic
- `app/(private)/tools/stable/[id]/edit` with JSON editor
- Documentation for all parameters

### Phase 2: Structured Form UI (Aligns with Stable Phase 4)
**Goal**: Replace JSON editor with purpose-built UI

1. Design form layout (tabs: Body, Face, Expression, Pose)
2. Build parameter input components (sliders, number inputs, categoricals)
3. Add real-time validation feedback
4. Implement constraint visualization (e.g., show Vitruvian ratio graphically)
5. Add parameter presets library

**Deliverables**:
- `components/stable/parametric-form/` component library
- Interactive UI with live validation
- Preset library (athletic, petite, tall, etc.)

### Phase 3: 3D Viewer (Future)
**Goal**: Visual validation of parameters

1. Select 3D framework (Three.js recommended)
2. Acquire or create base topology mesh
3. Implement parameter → mesh deformation
4. Build orbit camera controls
5. Add side-by-side comparison mode

**Deliverables**:
- `components/stable/phcs-viewer/` 3D viewer component
- Parameter-driven mesh deformation system
- Camera controls and lighting

### Phase 4: Conditioning Artifacts (Future)
**Goal**: Generate outputs for generative pipelines

1. Implement depth map renderer
2. Implement pose keypoint extractor
3. Implement segmentation mask generator
4. Implement normal map renderer
5. Add batch export for multiple angles

**Deliverables**:
- Artifact generation API endpoints
- Asset storage integration
- Batch export UI

---

## 13. Technical Architecture

### 13.1 Data Flow

```
User Input (UI Form)
  ↓
CharacterSpec (JSON)
  ↓
Validation Layer (JSON Schema + Custom Rules)
  ↓
Stable Database (parametric_data JSONB)
  ↓
[Future] 3D Viewer (WebGL rendering)
  ↓
[Future] Artifact Generator (depth/pose/segmentation)
  ↓
Stable Assets (stored files)
```

### 13.2 Technology Stack

- **Storage**: PostgreSQL JSONB (via Supabase)
- **Validation**: JSON Schema + custom TypeScript validators
- **UI**: React + Tailwind (Next.js)
- **3D Rendering** (Future): Three.js or Babylon.js
- **Artifact Generation** (Future): Python service (FastAPI) or serverless function

### 13.3 Performance Considerations

- **CharacterSpec Size**: ~10-20 KB JSON (negligible)
- **Validation**: Client-side, <10ms for full spec
- **3D Viewer**: Target 60 FPS with base topology
- **Artifact Generation**: Server-side, 1-5 seconds per artifact

---

## 14. Open Questions & Future Research

### 14.1 Parameter Coverage
- Are 50-100 parameters sufficient for identity-defining variation?
- What level of granularity is needed for realistic diversity?
- How do we handle edge cases (amputees, congenital variations)?

### 14.2 Validation Strictness
- Should default mode be `warn` or `strict`?
- How do we balance realism with creative freedom?
- Should validation adapt based on character type (realistic vs. stylized)?

### 14.3 Demographic Representation
- How do we ensure diverse representation without stereotyping?
- What population datasets are most appropriate?
- Should the system support non-binary morphological blending?

### 14.4 Integration with External Tools
- What export formats are most useful? (FBX, GLTF, USD?)
- Should PHCS support two-way sync with external character tools?
- How do we handle round-trip editing (Stable → Blender → Stable)?

---

## 15. References & Standards

### Anthropometric Data Sources
- **ANSUR II**: U.S. Army Anthropometric Survey (2012)
- **ISO 7250-1:2017**: Basic human body measurements for technological design
- **ISO/TR 7250-2:2010**: Statistical summaries of body measurements

### Facial Morphology
- **FACS**: Facial Action Coding System (Ekman & Friesen, 1978)
- **Apple ARKit**: Face tracking blend shapes specification
- **Anthropometric Facial Proportions**: Farkas et al. (1994)

### Digital Character Standards
- **Mixamo Skeleton**: Industry-standard character rig
- **GLTF 2.0**: Modern 3D asset format
- **USD (Universal Scene Description)**: Pixar's interchange format

### Generative Model Conditioning
- **ControlNet**: Zhang et al. (2023)
- **OpenPose**: Cao et al. (2019)
- **MiDaS**: Depth estimation models

---

## 16. Glossary

**CharacterSpec**: The complete JSON representation of a character's parametric data

**Identity Parameters**: Stable, bone-structure-based attributes that define a character's core physical identity

**Presentation Parameters**: Context-dependent attributes like pose, expression, and posture

**Normalized Parameter**: A value scaled relative to population mean, typically in range [-1, 1]

**Absolute Parameter**: A real-world measurement with explicit units (meters, degrees, etc.)

**Topology**: The 3D mesh and rig structure used to visualize and export the character

**Conditioning Artifact**: Quantitative output (depth map, pose, etc.) used as input to generative models

**FACS**: Facial Action Coding System - a method for describing facial muscle movements

**Biometric Constraint**: A rule enforcing anatomically plausible relationships between measurements

---

## Appendix A: Example Character

### Complete CharacterSpec Example

See `examples/character-spec-example-01.json` (to be created) for a fully populated CharacterSpec representing a realistic male character.

Key features demonstrated:
- All parameter types (absolute, normalized, ratio, categorical)
- Validation passing with warnings
- Complete identity and presentation layers
- Demographic references for transparency

---

## Appendix B: Validation Rules Reference

See `schemas/validation-rules.md` (to be created) for complete list of constraint rules and their severity levels.

---

## Document History

- **2026-01-18**: Initial draft incorporating feedback from Claude Code review
- **TBD**: Schema finalization after prototype validation
- **TBD**: Integration testing with Stable tool
