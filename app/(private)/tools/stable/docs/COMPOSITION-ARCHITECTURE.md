# Character Composition Architecture

## Status
**Version**: 1.0-draft
**Last Updated**: 2026-01-18
**Purpose**: Define how parametric identity specs compose with contextual asset modifiers

---

## Core Principle

**Characters = Identity + Context**

```
Base Character Identity (Parametric Specs)
  + Contextual Modifiers (Assets)
  = Complete Conditioning Context → Generative Model
```

---

## 1. Architecture Overview

### 1.1 Identity Layer (Parametric Specs)

**What it contains**: Unchanging attributes that define WHO the character is

- **AnatomySpec (PHCS)**: Skeletal structure, facial morphology, proportions
- **PersonalitySpec** (future): Big Five, MBTI, core traits
- **VoiceSpec** (future): Pitch, timbre, accent (phonetic parameters)
- **BehaviorSpec** (future): Movement patterns, gesture vocabulary

**Storage**: `stable_characters.parametric_data` JSONB field

**Characteristics**:
- Stable across all contexts
- Versioned, validated, structured
- Uses proven frameworks (ANSUR II, FACS, Big Five, etc.)
- Identity-level: skeletal, immutable aspects

### 1.2 Context Layer (Assets)

**What it contains**: Applied modifiers that vary by context

- **Expression Assets**: Facial muscle activation (FACS coefficients)
- **Pose Assets**: Skeletal rig states (joint rotations)
- **Posture Assets**: Habitual stance configurations
- **Garment Assets**: Clothing, outfits, accessories
- **Hair Style Assets**: Hair configurations
- **Makeup Assets**: Cosmetic applications
- **Skin State Assets**: Tone, texture, weathering
- **Prompt Assets**: Generation prompts (existing)
- **Reference Media**: Images, videos (existing)
- **Generative Outputs**: AI-generated results (existing)

**Storage**: `stable_assets` table with `character_id` FK (or NULL for universal)

**Characteristics**:
- Contextual: applied per generation/scene
- Reusable: same asset can apply to multiple characters
- Composable: mix and match to create variations

---

## 2. Data Model

### 2.1 Character Identity Structure

```typescript
interface Character {
  id: string;
  name: string;
  description: string | null;

  // Parametric identity specs
  parametric_data: {
    // Anatomical baseline (PHCS v1.0)
    anatomy_spec: AnatomySpec;

    // Future parametric layers
    personality_spec?: PersonalitySpec;
    voice_spec?: VoiceSpec;
    behavior_spec?: BehaviorSpec;

    // Default asset references
    defaults: {
      expression_id?: string;  // FK to stable_assets
      pose_id?: string;        // FK to stable_assets
      skin_state_id?: string;  // FK to stable_assets
      garment_id?: string;     // FK to stable_assets (optional)
      hair_style_id?: string;  // FK to stable_assets (optional)
    };

    // Non-parametric notes
    visual_notes?: Record<string, unknown>;
    narrative?: Record<string, unknown>;
  };

  created_at: string;
  updated_at: string;
}
```

### 2.2 AnatomySpec (Revised PHCS)

**Remove presentation layer, keep only identity**:

```json
{
  "meta": {
    "version": "1.0.0",
    "units": "metric",
    "topologyId": "human_base_v3",
    "validationMode": "warn"
  },

  "identity": {
    "body": {
      "height": { "value": 1.78, "unit": "m", "type": "absolute" },
      "shoulderWidth": { "value": 0.42, "unit": "m", "type": "absolute" },
      "proportions": {
        "legToTorsoRatio": { "value": 1.12, "type": "ratio" }
      }
    },

    "face": {
      "skull": {
        "width": { "value": 0.145, "unit": "m", "type": "absolute" }
      },
      "features": {
        "jawWidth": { "value": 0.18, "unit": "m", "type": "absolute" },
        "eyeSpacing": { "value": 0.065, "unit": "m", "type": "absolute" }
      }
    },

    "demographics": {
      "ageRange": { "min": 25, "max": 35 },
      "populationReferences": [...]
    }
  },

  "constraints": { /* validation rules */ },
  "validation": { /* validation status */ }
}
```

**Note**: No `presentation.expression`, `presentation.pose`, or `presentation.posture` - these are now assets.

### 2.3 Asset Structure (Extended)

```typescript
interface Asset {
  id: string;
  character_id: string | null;  // NULL = universal asset

  asset_type:
    | 'expression'      // NEW: FACS-based facial activation
    | 'pose'            // NEW: Skeletal rig state
    | 'posture'         // NEW: Habitual stance
    | 'garment'         // NEW: Clothing configuration
    | 'hair_style'      // NEW: Hair configuration
    | 'makeup'          // NEW: Cosmetic application
    | 'skin_state'      // NEW: Skin tone/texture/condition
    | 'prompt'          // EXISTING
    | 'reference_media' // EXISTING
    | 'generative_output' // EXISTING
    | 'concept_art'     // EXISTING
    // ... other existing types
    ;

  name: string | null;

  // Flexible data for asset-specific parameters
  data: AssetData;

  // File storage (for media assets)
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;

  // Organization
  tags: string[];

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}
```

### 2.4 Asset Data Schemas

#### Expression Asset
```typescript
interface ExpressionAssetData {
  type: 'facs_coefficients';
  coefficients: {
    smile: number;           // AU12 [0-1]
    browRaise: number;       // AU1+AU2 [0-1]
    jawOpen: number;         // AU26 [0-1]
    eyeSquint: number;       // AU6+AU7 [0-1]
    // ... all FACS action units
  };
  description?: string;
  intensity?: 'subtle' | 'moderate' | 'intense';
}
```

#### Pose Asset
```typescript
interface PoseAssetData {
  type: 'skeletal_rig_state';
  joints: {
    pelvisTilt: { value: number; unit: 'degrees' };
    spineCurve: { value: number; unit: 'degrees' };
    headPitch: { value: number; unit: 'degrees' };
    // ... all rig joints
  };
  description?: string;
  category?: 'standing' | 'sitting' | 'walking' | 'action';
}
```

#### Garment Asset
```typescript
interface GarmentAssetData {
  type: 'clothing_configuration';
  items: Array<{
    slot: 'top' | 'bottom' | 'shoes' | 'accessories';
    description: string;
    fit?: 'tight' | 'fitted' | 'loose' | 'oversized';
  }>;
  style?: string;
  formality?: 'casual' | 'business_casual' | 'formal' | 'athletic';
}
```

#### Skin State Asset
```typescript
interface SkinStateAssetData {
  type: 'skin_configuration';
  tone: string;              // e.g., "medium_warm", "Fitzpatrick_Type_IV"
  texture: string;           // e.g., "smooth", "weathered", "freckled"
  condition?: string;        // e.g., "healthy", "tanned", "pale"
  reference_image_url?: string;
}
```

---

## 3. Composition Workflow

### 3.1 Character with Defaults

When no specific context is provided, use default assets:

```typescript
function getDefaultCharacterState(character: Character): ComposedCharacter {
  const defaults = character.parametric_data.defaults;

  return {
    identity: character.parametric_data.anatomy_spec,
    expression: await getAsset(defaults.expression_id),  // "neutral"
    pose: await getAsset(defaults.pose_id),              // "relaxed standing"
    skinState: await getAsset(defaults.skin_state_id),   // "base tone"
    garment: defaults.garment_id ? await getAsset(defaults.garment_id) : null,
    hairStyle: defaults.hair_style_id ? await getAsset(defaults.hair_style_id) : null,
  };
}
```

### 3.2 Character with Contextual Overrides

For specific scenes/generations, override defaults:

```typescript
function composeCharacterForGeneration(
  character: Character,
  context: {
    expression?: Asset;   // Override default
    pose?: Asset;         // Override default
    garment?: Asset;      // Override default
    hairStyle?: Asset;    // Override default
    skinState?: Asset;    // Override default
  }
): ComposedCharacter {
  const defaults = character.parametric_data.defaults;

  return {
    identity: character.parametric_data.anatomy_spec,
    expression: context.expression ?? await getAsset(defaults.expression_id),
    pose: context.pose ?? await getAsset(defaults.pose_id),
    skinState: context.skinState ?? await getAsset(defaults.skin_state_id),
    garment: context.garment ?? (defaults.garment_id ? await getAsset(defaults.garment_id) : null),
    hairStyle: context.hairStyle ?? (defaults.hair_style_id ? await getAsset(defaults.hair_style_id) : null),
  };
}
```

### 3.3 Generating Conditioning Artifacts

```typescript
async function generateConditioningArtifacts(
  composed: ComposedCharacter,
  options: {
    cameraAngle: 'front' | 'side' | 'three_quarter';
    resolution: [number, number];
  }
): Promise<ConditioningArtifacts> {
  // 1. Build 3D scene from composed state
  const scene = buildSceneFromComposition(composed);

  // 2. Generate artifacts
  return {
    depthMap: await renderDepthMap(scene, options),
    poseKeypoints: await extractPoseKeypoints(scene, options),
    segmentationMask: await renderSegmentation(scene, options),
    normalMap: await renderNormalMap(scene, options),
  };
}
```

---

## 4. Database Schema Updates

### 4.1 Allow Universal Assets

```sql
-- Make character_id nullable for universal assets
ALTER TABLE stable_assets
  ALTER COLUMN character_id DROP NOT NULL;

-- Add index for universal assets
CREATE INDEX idx_stable_assets_universal
  ON stable_assets(asset_type)
  WHERE character_id IS NULL;

-- Update RLS policies to handle universal assets
CREATE POLICY "Admin can create universal assets"
  ON stable_assets
  FOR INSERT
  USING (
    character_id IS NULL AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.admin_role = true
    )
  );
```

### 4.2 Extended Asset Types

Asset types are stored as text, so no schema change needed. But update application types:

```typescript
// lib/types/stable.ts
export type AssetType =
  // Contextual modifiers (NEW)
  | 'expression'
  | 'pose'
  | 'posture'
  | 'garment'
  | 'hair_style'
  | 'makeup'
  | 'skin_state'

  // Existing types
  | 'prompt'
  | 'exclusion'
  | 'reference_media'
  | 'generative_output'
  | 'concept_art'
  | 'turnaround'
  | 'expression_sheet'
  | 'color_palette'
  | '3d_model'
  | 'animation'
  | 'audio'
  | 'document'
  | 'other';
```

---

## 5. Asset Ownership Model (Hybrid)

### 5.1 Character-Specific Assets

Assets tied to a specific character:

- **Custom garments**: Tailored clothing for this character
- **Unique poses**: Character-specific action poses
- **Character prompts**: Generation prompts mentioning character name
- **Character outputs**: Images generated for this character

**Characteristics**:
- `character_id` is set
- Only visible in that character's asset library
- Cannot be applied to other characters (without cloning)

### 5.2 Universal Assets

Assets available to all characters:

- **Common expressions**: "smile", "frown", "surprise", "neutral"
- **Standard poses**: "standing", "sitting", "walking", "T-pose"
- **Generic garments**: "casual jeans", "white t-shirt", "business suit"
- **Base skin states**: "light cool", "medium warm", "dark neutral"

**Characteristics**:
- `character_id IS NULL`
- Visible in global asset library
- Can be applied to any character
- Acts as a template/preset

### 5.3 UI Implications

```
Character Detail Page
  ├─ Identity (Parametric Specs)
  │   └─ Edit anatomy, personality, voice, behavior
  │
  ├─ Default Configuration
  │   ├─ Default Expression: [Dropdown: My Assets + Universal Library]
  │   ├─ Default Pose: [Dropdown: My Assets + Universal Library]
  │   ├─ Default Skin State: [Dropdown: My Assets + Universal Library]
  │   ├─ Default Garment: [Dropdown: My Assets + Universal Library] (optional)
  │   └─ Default Hair Style: [Dropdown: My Assets + Universal Library] (optional)
  │
  ├─ My Assets (character_id = this character)
  │   └─ List of character-specific assets
  │
  └─ Universal Library (character_id IS NULL)
      └─ Shared assets available to all characters
```

---

## 6. Future Parametric Specs (Modular)

### 6.1 PersonalitySpec (Future Phase)

```typescript
interface PersonalitySpec {
  meta: {
    version: string;
    framework: 'big_five' | 'mbti' | 'enneagram' | 'multi';
  };

  traits: {
    // Big Five (OCEAN)
    openness: { value: number; range: [0, 1] };
    conscientiousness: { value: number; range: [0, 1] };
    extraversion: { value: number; range: [0, 1] };
    agreeableness: { value: number; range: [0, 1] };
    neuroticism: { value: number; range: [0, 1] };

    // Optional secondary frameworks
    mbti_type?: 'INTJ' | 'ENFP' | /* ... */;
    enneagram_type?: '1' | '2' | /* ... */;
  };

  motivations?: string[];
  fears?: string[];
  values?: string[];
}
```

### 6.2 VoiceSpec (Future Phase)

```typescript
interface VoiceSpec {
  meta: {
    version: string;
    framework: 'phonetic' | 'ipa' | 'custom';
  };

  acoustic: {
    pitch: { value: number; unit: 'Hz'; range: [80, 300] };  // Fundamental frequency
    timbre: string;  // 'bright', 'dark', 'nasal', 'breathy'
    resonance: string;  // 'chest', 'head', 'mixed'
  };

  linguistic: {
    accent?: string;  // 'general_american', 'received_pronunciation', etc.
    speech_rate?: { value: number; unit: 'wpm' };  // Words per minute
    articulation?: 'precise' | 'casual' | 'mumbled';
  };

  qualities?: string[];  // 'gravelly', 'smooth', 'warm', 'sharp'
}
```

### 6.3 BehaviorSpec (Future Phase)

```typescript
interface BehaviorSpec {
  meta: {
    version: string;
    framework: 'laban' | 'kinesics' | 'custom';
  };

  movement: {
    energy_level: { value: number; range: [0, 1] };  // Low energy vs high energy
    tempo: 'slow' | 'moderate' | 'quick' | 'varied';
    fluidity: 'rigid' | 'controlled' | 'fluid' | 'loose';
  };

  gestures: {
    frequency: 'minimal' | 'moderate' | 'animated';
    scale: 'small' | 'medium' | 'expansive';
    signature_gestures?: string[];  // Custom gestures this character uses
  };

  proxemics?: {
    personal_space: { value: number; unit: 'm' };  // Preferred distance from others
    touch_comfort: 'avoidant' | 'neutral' | 'affectionate';
  };
}
```

### 6.4 Composition in parametric_data

```typescript
interface StableParametricData {
  // Core specs (modular, versioned independently)
  anatomy_spec: AnatomySpec;              // v1.0 (current)
  personality_spec?: PersonalitySpec;     // v1.0 (future)
  voice_spec?: VoiceSpec;                 // v1.0 (future)
  behavior_spec?: BehaviorSpec;           // v1.0 (future)

  // Default asset references
  defaults: {
    expression_id?: string;
    pose_id?: string;
    skin_state_id?: string;
    garment_id?: string;
    hair_style_id?: string;
  };

  // Unstructured extensions
  visual_notes?: Record<string, unknown>;
  narrative?: Record<string, unknown>;
}
```

---

## 7. Implementation Phases

### Phase 1A: Revise PHCS (Current)
- Remove `presentation` layer from AnatomySpec
- Update PHCS appendix to focus on identity only
- Add composition model documentation

### Phase 1B: Database Updates (Next)
- Allow `character_id IS NULL` for universal assets
- Add new asset type constants
- Update RLS policies for universal assets

### Phase 1C: Default Asset System (Next)
- Add `defaults` to parametric_data schema
- Create universal asset library (neutral expression, relaxed pose, etc.)
- UI for selecting default assets per character

### Phase 2: Asset Type Expansion
- Implement expression, pose, posture asset types
- Build asset editors for each type (FACS sliders, rig controls, etc.)
- Create universal library of common assets

### Phase 3: Composition & Generation
- Build composition engine (identity + context → complete state)
- Implement conditioning artifact generator
- UI for selecting contextual overrides

### Phase 4: Additional Parametric Specs
- PersonalitySpec implementation
- VoiceSpec implementation
- BehaviorSpec implementation
- Multi-spec composition and validation

---

## 8. Key Decisions Summary

✅ **Characters have default assets** for neutral state
✅ **Hybrid asset ownership**: character-specific + universal library
✅ **AnatomySpec = identity only**: no presentation fields
✅ **Modular specs**: Separate PersonalitySpec, VoiceSpec, BehaviorSpec
✅ **Assets are contextual modifiers**: expression, pose, garment, etc.
✅ **Composition model**: identity + context = complete character state

---

## Next Steps

1. Update PHCS appendix to remove presentation layer
2. Add composition section to PHCS
3. Update README to clarify identity vs. context distinction
4. Create database migration for universal assets
5. Build default asset system
6. Implement first contextual asset types (expression, pose, skin_state)
