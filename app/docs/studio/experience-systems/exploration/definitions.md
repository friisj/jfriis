# Experience Systems: Definitions & Glossary

**Reference document for terminology, concepts, and key terms**

---

## Core Concepts

### Experience System (ES)
A machine-readable, semantically structured, cross-media creative direction package that enables AI agents and generative tools to produce brand-coherent outputs across all platforms and modalities through seed styles, derivation rules, platform adapters, automated evaluation, and data-informed evolution.

**Key Characteristics**:
- Version-controlled package (like npm/package)
- Machine-executable (not just human documentation)
- Cross-media capable (UI, video, audio, voice, spatial)
- Self-evaluating (automated brand coherence checks)
- Continuously evolving (telemetry-driven improvement)

### Design System (Traditional)
A collection of reusable UI components, design tokens, and guidelines that ensure visual consistency across digital products. Focused on UI implementation efficiency and maintainability.

**Limitations ES Addresses**:
- UI-only (doesn't extend to video, audio, spatial)
- Manual brand compliance (human reviews required)
- Static documentation (periodic redesigns vs continuous evolution)
- Implementation-focused (not generative)

---

## Foundational Elements

### Creative Direction
The codified brand personality, visual language, motion language, and voice language expressed as structured metadata that informs all downstream generation.

**Schema Structure**:
```json
{
  "brandPersonality": {
    "primary": { "energy": 0.6, "warmth": 0.7, "sophistication": 0.8 }
  },
  "visualLanguage": { "geometry": "rounded-geometric", "density": "spacious" },
  "motionLanguage": { "pacing": "measured-deliberate" },
  "voiceLanguage": { "tone": ["assured", "warm"], "paceWPM": [165, 180] }
}
```

### Seeds
The minimal set of atomic design decisions from which the entire system is derived. Seeds are the only values manually defined; everything else is generated through rules.

**Examples**:
- Primary color: `oklch(0.55 0.15 250)`
- Base font size: `16px`
- Spacing unit: `8px`
- Motion base duration: `200ms`

**Immutability**: Seeds are protected by governance—changes require highest approval level (Brand Steward + System Maintainer).

### Tokens
Derived design values generated from seeds through rule application. Tokens are the actual values consumed by adapters.

**Types**:
1. **Primitive Tokens**: Direct seed values (`color-primary: oklch(0.55 0.15 250)`)
2. **Derived Tokens**: Generated from seeds (`color-primary-100: oklch(0.91 0.15 250)`)
3. **Semantic Tokens**: Named by purpose (`color-action`, `color-trust`) with personality metadata

**Token Structure**:
```json
{
  "id": "brand-primary",
  "value": "oklch(0.55 0.15 250)",
  "semantic": {
    "role": ["brand", "action", "trust"],
    "personality": { "energy": 0.6, "warmth": 0.7, "sophistication": 0.8 }
  },
  "generative": {
    "midjourney": "vibrant professional blue --stylize 750",
    "sora": "cool blue lighting, trustworthy mood"
  }
}
```

### Rules
Deterministic transformation functions that generate tokens from seeds or other tokens. Rules encode the "how" of design system generation.

**Rule Types**:
1. **Derivation Rules**: Generate scales/variants (color lightness scale, modular type scale)
2. **Mapping Rules**: Convert personality vectors to medium-specific values (energy → motion duration)
3. **Constraint Rules**: Enforce brand compliance (minimum contrast ratios, accessible pairings)

**Example Rule**:
```yaml
palette:
  from: "seeds.color.primary"
  generate:
    - name: "primary-scale"
      method: "oklch-lightness-scale"
      steps: 9
      range: [0.98, 0.25]
```

---

## Personality Vectors

### Personality Dimensions
Quantified brand personality traits expressed as 0-1 scale values that drive generative decisions across all media.

**Core Dimensions**:
- **Energy**: Pacing, tempo, movement speed (0 = slow/calm, 1 = fast/dynamic)
- **Warmth**: Emotional tone, approachability (0 = cold/formal, 1 = warm/friendly)
- **Sophistication**: Refinement, complexity (0 = simple/casual, 1 = refined/elegant)
- **Playfulness**: Whimsy, creativity (0 = serious/professional, 1 = playful/creative)

**Cross-Media Application**:
```yaml
energy: 0.7 (high)
  → UI: Quick micro-interactions (150ms)
  → Video: Fast cuts (2-3s scenes), dynamic camera
  → Audio: Upbeat tempo (120-140 BPM)
  → Voice: Energetic delivery (170-180 WPM)
```

### Emotional Range
The set of adjectives describing the desired brand perception. Used for validation and human communication of personality vectors.

**Example**: `["confident", "approachable", "innovative", "trustworthy"]`

### Avoid List
Explicit constraints on brand personality—qualities to actively prevent in generated outputs.

**Example**: `["aggressive", "childish", "corporate-cold"]`

---

## Adapters

### Adapter
A platform-specific transformation module that converts semantic tokens into medium-appropriate outputs while maintaining brand coherence.

**Adapter Types**:
1. **UI Adapters**: Generate code configs (Tailwind, CSS variables, iOS themes)
2. **Media Adapters**: Generate prompts/parameters (Midjourney, Sora, Suno, ElevenLabs)
3. **Spatial Adapters**: Generate 3D/AR/VR materials and properties

### Adapter Interface Contract
The explicit specification of an adapter's inputs, outputs, determinism requirements, and validation tests.

**Required Fields**:
```yaml
adapterId: "web-tailwind-v1"
mediaType: "ui"
inputs: ["tokens.color.*", "tokens.typography.*"]
outputs: ["tailwind.config.js"]
deterministic: true  # Same inputs always produce same outputs
version: "1.0.0"
tests: ["snapshot-test-v1.js"]
```

### Determinism
The requirement that adapters produce identical outputs given identical inputs. Critical for preventing "prompt drift" and ensuring reproducibility.

**Enforcement**: Snapshot tests that fail if adapter output changes without explicit version bump.

### Snapshot Test
Automated test that captures expected adapter output and fails if output changes unexpectedly. Prevents unintended variations in generated prompts or configs.

---

## Evaluation & Quality

### Brand Coherence Score (BCS)
Composite metric combining multiple automated evaluations into a single 0-1 score representing overall brand alignment and quality.

**Formula** (configurable weights):
```
BCS = (brandAlignment × 0.45) + (crossMediaCoherence × 0.35) +
      (tokenCoverage × 0.10) + (wcagCompliance × 0.10)
```

**Usage**: Quality gate for automated approval vs. human review.

### Evaluations (Evals)
Automated tests that measure specific aspects of generated outputs against defined thresholds.

**Eval Types**:
1. **Accessibility**: WCAG contrast ratios, color blindness checks
2. **Brand Alignment**: Cosine similarity between output embeddings and reference personality
3. **Cross-Media Coherence**: Semantic consistency across media types
4. **Technical Quality**: Token coverage, unused tokens, bundle size

**Eval Structure**:
```json
{
  "evalId": "WCAG-contrast-check-v1",
  "type": "accessibility",
  "target": "ui",
  "threshold": 4.5,
  "weight": 0.7,
  "automated": true
}
```

### Brand Alignment
Measure of how closely generated outputs reflect the intended brand personality. Typically measured via embedding similarity.

**Method**: Generate embedding vectors for both reference personality and output, calculate cosine similarity.

**Threshold**: Typically 0.85+ (85% similarity to reference)

### Cross-Media Coherence
Measure of semantic consistency between outputs across different media types. Ensures "energetic" feels energetic in UI, video, AND audio.

**Method**: Pairwise embedding similarity across all media outputs.

**Threshold**: Typically 0.90+ (90% consistency)

### Token Coverage
Percentage of design values in codebase that use tokens vs. hard-coded values. Higher coverage = better consistency.

**Measurement**: Static analysis counting token usage vs. hard-coded CSS values.

**Threshold**: Typically 90%+ coverage required

---

## Governance

### System Change Proposal (SCP)
Formal proposal for modifying any aspect of an Experience System. Required for all changes, includes rationale, diffs, eval results, and approval workflow.

**SCP States**:
1. **Draft**: Contributor authoring proposal
2. **In Review**: Submitted, evals running
3. **Eval Running**: Automated checks executing
4. **Auto-approved**: BCS ≥ threshold, no human review needed
5. **Human Review**: BCS < threshold or strategic change, requires approval
6. **Approved**: All approvals obtained
7. **Rejected**: Change denied with rationale
8. **Merged**: Deployed to production
9. **Monitored**: Tracking telemetry post-deployment

### Roles

#### Brand Steward
Creative owner responsible for brand integrity and strategic alignment. Final approver for changes affecting creative direction or personality.

**Responsibilities**:
- Review brand alignment of proposed changes
- Approve/reject on strategic/creative grounds
- Define emotional range and avoid lists
- Calibrate personality vectors quarterly

#### System Maintainer
Technical owner responsible for code quality, schema compliance, and system stability.

**Responsibilities**:
- Review technical implementation of changes
- Approve/reject on technical/quality grounds
- Merge approved proposals
- Monitor system health and performance

#### Contributor
Any team member proposing a change to the Experience System.

**Responsibilities**:
- Author SCPs with required evidence
- Run evals and attach results
- Revise based on reviewer feedback
- Implement approved changes

### Immutable Core
The set of system elements that cannot be changed without highest governance approval. Protects brand essence from drift.

**Typical Immutable Elements**:
- Primary brand color seed
- Core personality vectors
- Brand name/identity

### Drift Threshold
Maximum allowable divergence from reference personality vectors before triggering alerts and requiring review.

**Typical Value**: 0.15 (15% max deviation from original personality)

**Trigger**: If telemetry detects personality vector drift beyond threshold, freeze non-critical changes and require creative director review.

---

## Technical Architecture

### Manifest
The `es-package.json` file defining package identity, capabilities, governance settings, and dependencies.

**Key Fields**:
```json
{
  "name": "@brand/experience-system",
  "version": "1.0.0",
  "capabilities": { "mediaTypes": ["ui", "video", "audio"] },
  "governance": { "bcsTarget": 0.95, "driftThreshold": 0.15 }
}
```

### Knowledge Graph
Graph-structured representation of the entire ES where every entity (token, rule, output, component) is a node with semantic relationships as edges. Enables AI agents to query system lineage and relationships.

**Node Types**:
- Token nodes: Design values
- Rule nodes: Transformation functions
- Output nodes: Generated artifacts
- Component nodes: UI components using tokens

**Edge Types**:
- `derives_from`: Token derived from seed/rule
- `used_by`: Token used by component/output
- `generated_by`: Output generated by adapter
- `evaluated_by`: Output evaluated by eval

### Telemetry
Instrumentation tracking system usage, eval results, override rates, and drift detection to inform continuous improvement.

**Tracked Metrics**:
1. **Token Usage**: Frequency, contexts, combinations
2. **Override Rate**: % of times humans override automated decisions
3. **Eval Failures**: Which evals fail most often
4. **BCS Trends**: Score changes over time

**Evolution Triggers**:
- Low usage (90 days) → flag for deprecation
- High override (>20%) → flag rule for refinement
- BCS drop (below target - threshold) → freeze changes, review

---

## Color & Typography

### OKLCH Color Space
Perceptually uniform color space used for ES color tokens. Ensures consistent perceived lightness, enabling algorithmic palette generation with predictable results.

**Format**: `oklch(L C H)`
- **L (Lightness)**: 0-1 (0 = black, 1 = white)
- **C (Chroma)**: 0-0.4+ (0 = gray, higher = more vibrant)
- **H (Hue)**: 0-360 degrees (color wheel position)

**Advantages over Hex/RGB**:
- Perceptually uniform lightness scales
- Predictable contrast ratios
- Better for algorithmic generation
- Future-proof (wide gamut support)

### Modular Scale
Typography sizing system where each step is calculated by multiplying the base size by a consistent ratio.

**Common Ratios**:
- Perfect Fourth: 1.333 (4:3 musical interval)
- Perfect Fifth: 1.5 (3:2 musical interval)
- Golden Ratio: 1.618

**Example**:
```
Base: 16px, Ratio: 1.333
Scale: 12px, 16px, 21.33px, 28.43px, 37.90px, 50.52px
```

### Semantic Naming
Token naming strategy based on purpose/role rather than visual properties.

**Examples**:
- ✅ Good: `color-action`, `color-trust`, `color-warning`
- ❌ Bad: `color-blue`, `color-red`, `color-yellow`

**Benefits**: Tokens remain meaningful when values change (e.g., `color-action` can shift from blue to green without renaming).

---

## Implementation Phases

### NOW Phase (MVP)
Initial implementation focusing on UI-only with web adapter, basic evals, and manual governance. Goal: Prove core value proposition.

**Deliverables**:
- Semantic tokens + seeds
- Color and typography rules
- Web Tailwind adapter
- WCAG + token coverage evals
- SCP workflow enforced

**Success Criteria**: Ship production web UI from semantic tokens with 100% WCAG compliance and >95% token coverage.

### NEXT Phase (Cross-Media Proof)
Add one non-UI adapter (audio or video) to prove cross-media coherence thesis.

**Deliverables**:
- Suno (audio) OR Sora (video) adapter
- Brand alignment eval
- Cross-media coherence eval
- BCS calculation with all 4 metrics

**Success Criteria**: Generate UI + chosen medium with coherence score ≥0.90 and BCS ≥0.95.

### LATER Phase (Scale & Ecosystem)
Complete multi-modal coverage, telemetry-driven evolution, and ecosystem infrastructure.

**Deliverables**:
- All media adapters (Sora, Suno, Midjourney, ElevenLabs, 3D)
- Telemetry system with evolution triggers
- ES package registry
- Community contribution workflows

---

## Validation & Metrics

### WCAG AAA
Web Content Accessibility Guidelines highest conformance level. Requires 7:1 contrast ratio for normal text, 4.5:1 for large text.

**ES Requirement**: All UI tokens must meet WCAG AAA by default (enforced through automated evals).

### Contrast Ratio
Measure of luminance difference between two colors. Used for accessibility compliance.

**Formula**: `(L1 + 0.05) / (L2 + 0.05)` where L1 is lighter color luminance.

**Thresholds**:
- WCAG AA: 4.5:1 (normal), 3:1 (large)
- WCAG AAA: 7:1 (normal), 4.5:1 (large)

### Cosine Similarity
Measure of similarity between two vectors, ranging from 0 (completely different) to 1 (identical). Used for brand alignment and coherence evals.

**Application**: Compare embedding vectors of generated outputs to reference personality embeddings.

**Interpretation**:
- 0.90+: Highly coherent/aligned
- 0.80-0.90: Moderately aligned
- <0.80: Poorly aligned (fails eval)

---

## Media-Specific Terms

### Prompt
Text instruction for generative AI model (e.g., Midjourney, Sora). ES adapters generate prompts from semantic tokens.

**Example Sora Prompt** (generated from `energy: 0.7`):
```
"Fast-paced editing with 2-3 second cuts, dynamic camera movement,
high-energy transitions. Cool blue color grade with trustworthy mood.
Professional yet approachable aesthetic."
```

### Style Parameters
Numerical or categorical settings controlling generative model behavior (e.g., Midjourney's `--stylize`, Suno's BPM).

**Example Mappings**:
```yaml
sophistication: 0.8
  → midjourney: "--quality 2 --style raw"
  → suno: "key: minor, complexity: layered arrangements"
```

### BPM (Beats Per Minute)
Musical tempo measurement. ES audio adapters map personality energy to BPM ranges.

**Mappings**:
- Low energy (0.2-0.4): 60-80 BPM (slow, calm)
- Medium energy (0.4-0.7): 90-110 BPM (moderate, steady)
- High energy (0.7-1.0): 120-140 BPM (fast, energetic)

### WPM (Words Per Minute)
Speech pacing measurement. ES voice adapters map personality energy to WPM ranges.

**Mappings**:
- Low energy: 130-150 WPM (slow, deliberate)
- Medium energy: 155-170 WPM (conversational)
- High energy: 170-180 WPM (fast, energetic)

---

## Anti-Patterns

### Manual Token Management
Creating design tokens manually in spreadsheets or code rather than generating them from seeds via rules.

**Why Bad**: Error-prone, inconsistent, not scalable, breaks derivation lineage.

### Hard-Coded Values
Using literal color/spacing/typography values in components instead of tokens.

**Why Bad**: Prevents system-wide updates, creates inconsistency, reduces token coverage metric.

### Prompt Drift
Gradual, unintentional changes to generative prompts over time without versioning or snapshot tests.

**Why Bad**: Outputs become inconsistent across deployments, loses reproducibility.

### Manual Brand Reviews as Primary QA
Relying on human creative reviews for every output instead of automated evals.

**Why Bad**: Doesn't scale, creates bottlenecks, wastes creative time on pixel-pushing instead of strategy.

### Personality Guessing
Defining personality vectors arbitrarily without reference exemplars or validation.

**Why Bad**: Values become meaningless numbers without grounding in actual brand perception.

---

## Success Metrics

### Review Cycle Time
Duration from proposal submission to deployment. ES aims to reduce from 5-7 days (manual) to 1-3 days (automated + strategic approval only).

### Override Rate
Percentage of automated decisions that humans override. Target: <10%.

**Interpretation**:
- <10%: Good (automation is reliable)
- 10-20%: Warning (rules may need refinement)
- >20%: Problem (automation not trustworthy)

### Time-to-Channel
Duration to launch brand presence in a new medium (e.g., add video after having UI). Target: >50% reduction using existing semantics + new adapter vs. building from scratch.

### Designer Capacity Reclaimed
Percentage of designer/creative director time freed from manual reviews to focus on strategy. Target: 20-30% capacity reclamation.

---

## Related Concepts

### Design Tokens (W3C)
Industry standard for representing design decisions as data. ES builds on this foundation by adding semantic metadata and cross-media mappings.

### Atomic Design
Methodology by Brad Frost organizing UI into atoms → molecules → organisms → templates → pages. ES applies similar compositional thinking to semantic tokens.

### Generative AI
AI models that create new content (text, images, video, audio) from prompts. ES makes brand-coherent generative AI possible by providing structured creative direction.

### Component Library
Collection of reusable UI components (buttons, inputs, cards). ES generates the tokens these components consume, but doesn't replace component development.

### Brand Guidelines (Traditional)
PDF documents with logo usage, color palettes, typography rules. ES makes these executable and cross-media rather than static and UI-focused.

---

## Additional Critical Terms

### Minimal Viable Package (MVP)
The smallest shippable Experience System implementation that proves core value. For ES, this is v0.1.0: semantic tokens + rules + web adapter + basic evals + SCP governance.

**Scope**: UI-only, web platform, manual governance with automated evals.

**NOT included in MVP**: Cross-media adapters, telemetry, automated evolution, agent integration.

### Decision Gate
Explicit validation criteria that must be met before progressing to next implementation phase.

**Example**: NOW → NEXT gate requires:
- MVP deployed to production
- WCAG AAA compliance 100%
- Token coverage >95%
- SCP workflow proven with ≥2 successful proposals

### Semantic Coherence
The quality of maintaining consistent brand meaning and personality across different media types, independent of surface-level visual similarity.

**Example**: "Energetic" brand feels energetic in UI (quick animations), video (fast cuts), audio (upbeat tempo), and voice (faster pacing) - different expressions, same semantic meaning.

### Derivation Chain
The traceable lineage from creative direction → seeds → rules → tokens → adapters → outputs. Essential for impact analysis and debugging.

**Example**:
```
brandPersonality.energy: 0.7
  → rule: motion-duration-from-energy
  → token: motion.duration.base = 150ms
  → adapter: web-tailwind
  → output: transition-duration: 150ms in CSS
```

### Embedding Vector
High-dimensional numerical representation of semantic meaning, typically generated by AI models. Used for comparing brand alignment and coherence.

**Usage**: Generate embeddings for reference personality and generated outputs, measure cosine similarity.

**Typical Dimensions**: 768-1536 dimensions (OpenAI, Anthropic models).

### Rollout Policy
Automated decision rules determining whether changes can be auto-approved or require human review based on eval results.

**Typical Policy**:
```yaml
auto-approve: "all evals pass AND BCS ≥ bcsTarget"
human-review: "any eval fails OR BCS < bcsTarget OR scope includes immutableCore"
```

### Reference Exemplars
Concrete examples of desired brand outputs used to ground personality vectors in actual perception rather than abstract numbers.

**Purpose**: Validate that `sophistication: 0.8` actually produces "sophisticated" outputs by comparing to reference examples.

### Impact Analysis
Assessment of which files, components, adapters, or outputs will be affected by a proposed change. Required in every SCP.

**Method**: Query knowledge graph for all nodes connected to changed entities.

### Lineage Tracking
Recording the full history of how a token or output was generated, including which rules, seeds, and decisions contributed.

**Purpose**: Enable "why is this blue?" questions with traceable answers through derivation chain.

### Platform-Agnostic
Design decisions and semantic tokens defined independent of any specific implementation platform or technology.

**Example**: `energy: 0.7` is platform-agnostic; `transition-duration: 150ms` is web-specific.

### Platform-Optimized
Adapter output customized for specific platform constraints and capabilities while maintaining semantic coherence.

**Example**: Same `energy: 0.7` becomes `150ms` for web, `0.15s` for iOS, `FAST` preset for video editor.

### Schema Version
Version number of the ES package structure and expected file formats. Enables breaking changes to package format without breaking compatibility.

**Example**: `schemaVersion: "1.0"` in manifest indicates v1.0 package format.

### Snapshot Test Failure
When adapter output changes without an intentional version bump, indicating unintended drift or breaking change.

**Action**: Either update snapshot if change is intentional, or fix adapter to restore previous behavior.

### Human Override
When Brand Steward or System Maintainer manually approves a change despite failing automated evals, or manually rejects despite passing.

**Tracking**: All overrides are logged with rationale. High override rates trigger rule refinement.

### Evolution Trigger
Telemetry-based condition that automatically flags issues requiring human attention or SCP creation.

**Examples**:
- Token unused for 90 days → flag for deprecation
- Override rate >20% for rule → flag for refinement
- BCS drops below (target - threshold) → freeze non-urgent changes

### Brand Drift
Gradual, unintended divergence from original brand personality vectors over time due to accumulated small changes.

**Prevention**: Drift threshold (typically 0.15) and quarterly personality calibration with brand leadership.

### Quarterly Calibration
Scheduled review (every 3 months) where Brand Steward validates personality vectors still match intended brand perception, using reference exemplars.

**Purpose**: Prevent drift, update avoid list, rotate exemplars to prevent overfitting.

### Agent Skill
Capability exposed to AI agents (like Claude) that allows them to query, understand, or interact with the Experience System.

**Example Skills**:
- `token-query`: Look up token values and lineage
- `brand-check`: Validate content against brand personality
- `impact-analysis`: Assess effects of proposed changes

### Knowledge Graph Query
Using graph traversal or query language to ask questions about system relationships.

**Example Queries**:
- "What components use token:brand-primary?"
- "What's the derivation chain for motion.duration.base?"
- "Which adapters consume personality.energy?"

### Auto-Approval
Change is merged without human review because all automated evals passed and BCS meets target threshold.

**Conditions**: `evals.pass === true AND BCS ≥ manifest.governance.bcsTarget`

### Human Review Gate
Change requires Brand Steward and/or System Maintainer approval despite passing automated checks, due to strategic significance or scope.

**Triggers**:
- BCS below target
- Changes to immutableCore
- New adapter introduction
- Personality vector modifications

### Breaking Change
Modification that requires adapters, consumers, or tooling to update to maintain compatibility.

**Examples**:
- Renaming token IDs
- Changing rule output format
- Removing adapter interface fields
- Schema version bump

**Requires**: Major version bump (1.x.x → 2.0.0) and migration guide.

### Non-Breaking Change
Additive modification that doesn't affect existing consumers.

**Examples**:
- Adding new tokens
- Adding new adapter
- Adding new eval
- Expanding token metadata (without removing fields)

**Allows**: Minor version bump (1.2.x → 1.3.0).

### Patch Release
Bug fix or non-functional change that doesn't add features or break compatibility.

**Examples**:
- Fixing OKLCH calculation error
- Correcting typo in token name
- Updating documentation
- Fixing snapshot test

**Version**: Patch bump (1.2.3 → 1.2.4).

---

## Version History

- **v1.0** (2025-11-22): Initial definitions document - Core concepts, personality vectors, adapters, evaluation, governance, technical architecture
- **v1.1** (2025-11-22): Added contextually specific terms - MVP, decision gates, semantic coherence, derivation chain, embeddings, rollout policy, exemplars, impact analysis, lineage tracking, platform concepts, schema versioning, snapshot tests, overrides, evolution triggers, drift, calibration, agent skills, graph queries, approval types, breaking changes, versioning strategy

---

**Document Version**: 1.1
**Date**: 2025-11-22
**Status**: Living reference document (will evolve with system)
**Related**: All Experience Systems documents (this provides shared vocabulary)
