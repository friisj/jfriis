# Experience Systems: Executable Brand Direction Across All Media

**Claude v2 — Industry-grounded, implementation-focused synthesis**

---

## Abstract

Design systems made UI repeatable and scalable. Experience Systems (ES) make **brand intent executable and coherent across all media types.**

An ES is a machine-readable creative direction package that enables AI agents and generative tools to produce brand-coherent outputs for web, mobile, video, audio, voice, and spatial experiences. Through semantic tokens, derivation rules, cross-media adapters, and automated evaluation, ES shift creative teams from manual review bottlenecks to high-level direction with automated brand compliance.

Where design systems optimize for UI consistency, Experience Systems optimize for **cross-media semantic coherence.**

---

## Part I: The Industry Context

### 1.1 Where Design Systems Are Today

Modern design systems have reached production maturity:

- **Design Tokens**: Atomic primitives (colors, spacing, typography) abstracted from implementation (W3C standards via Design Tokens Community Group)
- **Multi-Framework Libraries**: Material, Carbon, Polaris shipping components for React, Vue, Angular, Web Components
- **AI-Ready Evolution**: Supernova advocating "AI doesn't understand your design system unless you make it explicit"—semantic metadata becoming essential
- **Generative Pipelines**: frog's brand-to-design-language-system workflows demonstrate that brand seeds can generate comprehensive UI tokens
- **Agent Integration**: Claude Skills injecting design system context into AI workflows

### 1.2 The Critical Gap

Despite these advances, the industry remains **fundamentally UI-centric:**

| Industry State | What's Missing |
|----------------|----------------|
| Design tokens for colors, spacing, typography | Semantic tokens with personality vectors and cross-media mappings |
| Component libraries for web/mobile | Generative adapters for video, audio, voice, 3D, spatial |
| Manual brand compliance reviews | Automated brand coherence evaluation across all outputs |
| Single-medium focus (screens) | Multi-modal semantic coherence (UI → video → audio → spatial) |
| Periodic redesigns | Continuous data-informed evolution |

**The Problem**: Marketing needs video, audio, social content. Product needs web, iOS, Android. Sales needs presentations, demos, spatial experiences. Every output requires brand compliance review. **Review cycles are the creative bottleneck.**

**The Opportunity**: Generative AI is production-ready (Midjourney, Sora, Suno, ElevenLabs) but needs structured intent. Agentic workflows (Claude Skills, GPT Actions) expect machine-readable context. Token standards provide the foundation.

**The Gap Experience Systems Fill**: Cross-media semantic coherence with automated brand evaluation.

---

## Part II: Core Definition

An **Experience System** is a versioned package that:

1. **Encodes brand intent as semantic tokens**: Personality vectors, roles, visual/motion/voice language, constraints
2. **Derives full asset stacks via deterministic rules**: Palette expansion, motion scales, copy tone, pacing from minimal seeds
3. **Ships cross-media adapters**: Map semantics to medium-specific parameters (CSS vars, Sora scene hints, Suno keys, ElevenLabs tone, 3D materials)
4. **Enforces automated evaluation**: Accessibility, brand alignment, cross-media coherence with pass/fail thresholds
5. **Captures telemetry for safe evolution**: Usage patterns, override rates, drift detection without periodic redesigns

---

## Part III: Foundational Principles

### Principle 1: Machine-Readable First, Human-Accessible Always

Creative direction must be executable by AI while remaining transparent and editable by humans.

**Industry Validation**: Supernova's "explicit design systems" confirms semantic metadata is essential for AI understanding.

**Implementation**:
```json
{
  "brand-primary": {
    "value": "oklch(0.5 0.18 250)",
    "semantic": {
      "role": ["brand", "action", "trust"],
      "personality": {"energy": 0.6, "warmth": 0.4, "sophistication": 0.8}
    },
    "generative": {
      "midjourney": "vibrant professional blue --stylize 750",
      "sora": "cool blue lighting, corporate, trustworthy mood",
      "suno": "key: D major (calm, confident)",
      "elevenlabs": "tone: assured, warm, professional"
    }
  }
}
```

Human reads: "Brand blue—trustworthy, professional, energetic."
AI executes: UI with OKLCH value, video with blue lighting mood, audio in D major, voiceover with assured tone.

### Principle 2: Seed Styles + Rules → Infinite Extrapolation

Define minimal viable creative direction; derive everything else through explicit rules.

**Industry Validation**: frog's generative pipelines show brand seeds can generate comprehensive design language systems.

**ES Advancement**: Extend from UI tokens to all media types.

```yaml
seeds:
  color-primary: "oklch(0.5 0.18 250)"
  typography-base: "16px"
  spacing-unit: "4px"
  motion-base: "200ms"

rules:
  palette:
    from: "seeds.color-primary"
    generate:
      - name: "primary-scale"
        method: "oklch-lightness-scale"
        steps: 9
        range: [0.95, 0.2]

  motion:
    from: "personality.energy"
    map: "inverseLerp([0.2, 1.0], [400ms, 150ms])"
```

### Principle 3: Cross-Media Coherence Through Semantic Mapping

Brand personality is medium-independent. Semantic tokens map to medium-specific outputs.

**Industry Gap**: Material, Carbon, Polaris are UI-only. No existing system ensures "energetic" feels energetic in UI interactions AND video pacing AND audio tempo AND voice delivery.

**ES Solution**:
```yaml
personality:
  energy: 0.8

adapters:
  web:
    - quick micro-interactions (150ms)
    - bright accent colors
    - sharp geometric shapes

  sora:
    - fast cuts (2-3s scenes)
    - dynamic camera movement
    - high contrast lighting

  suno:
    - upbeat tempo (120-140 BPM)
    - bright timbres (piano, synth)
    - staccato rhythms

  elevenlabs:
    - energetic delivery
    - faster pacing (170-180 WPM)
    - upward inflection patterns
```

### Principle 4: Evaluation-Driven, Not Review-Driven

Automated brand coherence evaluation with measurable thresholds. Manual reviews become exception-handling, not primary QA.

**Industry Gap**: Current systems rely on manual design reviews and brand compliance checks.

**ES Innovation**:
```yaml
evals:
  accessibility:
    - wcag-aaa-contrast
    - threshold: 7.0
    - automated: true

  brand-alignment:
    - personality-vector-similarity
    - threshold: 0.85
    - scope: [ui, video, audio, voice]
    - automated: true

  cross-media-coherence:
    - semantic-consistency
    - threshold: 0.90
    - automated: true

  human-review:
    - trigger: "any automated eval < threshold"
    - recorded: true  # lineage tracking
```

### Principle 5: Platform-Agnostic Definition, Platform-Optimized Deployment

Define once in semantic space. Adapt to platform constraints via specialized adapters.

**Industry Pattern**: Multi-framework component libraries (Carbon for React/Vue/Angular) demonstrate this for UI.

**ES Generalization**: Apply to all media types.

### Principle 6: Data-Informed Evolution, Not Periodic Redesigns

Telemetry and usage analytics drive continuous improvement within brand guardrails.

**Governance Safeguards**:
```yaml
evolution-triggers:
  low-usage:
    condition: "token unused for 90 days"
    action: "flag for deprecation review"

  high-override:
    condition: "human overrides > 20% for specific rule"
    action: "flag rule for refinement"

  drift-detection:
    condition: "personality vector divergence > 0.15 from reference"
    action: "block merge, require creative director approval"
```

### Principle 7: Integration as First-Class Concern

Built to integrate with generative tools, deployment pipelines, and AI agents from day one.

**Industry Validation**: Claude Skills adoption shows developers value injecting system context into AI workflows.

---

## Part IV: Architecture & Implementation

### 4.1 Package Structure

```
experience-system/
├── manifest.json          # package metadata, version, dependencies
├── semantics/
│   ├── intent.json        # personality, visual/motion/voice language
│   └── constraints.json   # avoid lists, guardrails
├── seeds/
│   └── primitives.json    # minimal foundational values
├── rules/
│   ├── color.js           # palette derivation
│   ├── typography.js      # scale generation
│   ├── motion.js          # timing/easing derivation
│   └── cross-media.js     # personality → adapter mappings
├── adapters/
│   ├── web/               # Tailwind config, CSS variables
│   ├── mobile/            # iOS/Android themes
│   ├── media/
│   │   ├── midjourney/    # style parameters
│   │   ├── sora/          # scene direction
│   │   ├── suno/          # musical parameters
│   │   └── elevenlabs/    # voice profiles
│   └── spatial/           # 3D materials, AR/VR
├── evals/
│   ├── accessibility.test.js
│   ├── brand-alignment.test.js
│   └── coherence.test.js
├── telemetry/
│   └── instrumentation.json
└── agents/
    └── .claude/
        ├── skills/        # system knowledge injection
        └── rules/         # brand compliance guidelines
```

### 4.2 Semantic Intent Schema

```json
{
  "personality": {
    "energy": 0.65,
    "warmth": 0.55,
    "sophistication": 0.8,
    "playfulness": 0.3
  },
  "visual-language": {
    "geometry": "rounded-geometric",
    "density": "spacious",
    "hierarchy": "clear-pronounced"
  },
  "motion-language": {
    "pacing": "measured-deliberate",
    "easing": "ease-out-cubic",
    "personality": "purposeful-smooth"
  },
  "voice-language": {
    "tone": ["assured", "warm", "professional"],
    "paceWPM": [165, 180],
    "emotional-range": ["confident", "approachable"]
  },
  "avoid": ["aggressive", "childish", "noisy", "cold"]
}
```

### 4.3 Cross-Media Adapter Examples

#### Web Adapter
```yaml
adapter: web
color:
  format: "oklch"
  output: ["css-custom-properties", "tailwind-config"]
typography:
  format: "rem"
  output: "tailwind-config"
motion:
  format: "ms"
  output: "css-custom-properties"
```

#### Sora Adapter (Video)
```yaml
adapter: sora
personality-mappings:
  energy:
    high (>0.7): "pacing: fast cuts (2-3s), camera: dynamic movement"
    moderate (0.4-0.7): "pacing: measured (4-6s), camera: steady with subtle motion"
    low (<0.4): "pacing: slow (8-12s), camera: static or slow pan"

  warmth:
    high (>0.7): "lighting: warm golden tones, color-grade: sunset palette"
    moderate (0.4-0.7): "lighting: balanced natural, color-grade: neutral"
    low (<0.4): "lighting: cool blue tones, color-grade: crisp steel"

color-mapping:
  primary: "dominant color grade: {color description from token}"
  accent: "highlight elements: {accent color description}"
```

#### Suno Adapter (Audio)
```yaml
adapter: suno
personality-mappings:
  energy:
    high (>0.7):
      tempo: "120-140 BPM"
      rhythm: "driving, staccato"
      instrumentation: "bright timbres (synth, piano)"
    moderate (0.4-0.7):
      tempo: "90-110 BPM"
      rhythm: "steady, measured"
      instrumentation: "balanced (piano, strings, subtle percussion)"
    low (<0.4):
      tempo: "60-80 BPM"
      rhythm: "sparse, legato"
      instrumentation: "warm pads, sustained notes"

  sophistication:
    high (>0.7):
      key: "minor keys or jazz harmony"
      complexity: "layered arrangements"
    moderate (0.4-0.7):
      key: "major keys (D, G, C)"
      complexity: "clear melody with harmony"
    low (<0.4):
      key: "simple major keys"
      complexity: "minimal, repetitive"
```

#### ElevenLabs Adapter (Voice)
```yaml
adapter: elevenlabs
personality-mappings:
  energy:
    high (>0.7):
      pacing: "170-180 WPM"
      inflection: "upward, dynamic"
      emphasis: "frequent, energetic"
    moderate (0.4-0.7):
      pacing: "155-170 WPM"
      inflection: "balanced, natural"
      emphasis: "moderate, purposeful"
    low (<0.4):
      pacing: "130-150 WPM"
      inflection: "downward, calming"
      emphasis: "minimal, steady"

  warmth:
    high (>0.7): "tone: friendly, rich timber, approachable"
    moderate (0.4-0.7): "tone: professional, clear, neutral warmth"
    low (<0.4): "tone: crisp, precise, reserved"
```

### 4.4 Automated Evaluation Suite

```javascript
// evals/brand-alignment.test.js
export const brandAlignmentEval = {
  name: "personality-vector-similarity",
  threshold: 0.85,
  scope: ["ui", "video", "audio", "voice"],

  async evaluate(outputs, referenceSemantics) {
    const referenceEmbedding = await embedPersonality(referenceSemantics.personality);

    const scores = await Promise.all(
      outputs.map(async output => {
        const outputEmbedding = await embedOutput(output);
        return cosineSimilarity(referenceEmbedding, outputEmbedding);
      })
    );

    const avgScore = scores.reduce((a, b) => a + b) / scores.length;

    return {
      pass: avgScore >= this.threshold,
      score: avgScore,
      details: scores.map((score, i) => ({
        output: outputs[i].id,
        score,
        pass: score >= this.threshold
      }))
    };
  }
};
```

```javascript
// evals/coherence.test.js
export const crossMediaCoherenceEval = {
  name: "cross-media-semantic-consistency",
  threshold: 0.90,

  async evaluate(outputs) {
    const embeddings = await Promise.all(
      outputs.map(output => embedOutput(output))
    );

    // Pairwise similarity across all media types
    const similarities = [];
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        similarities.push(cosineSimilarity(embeddings[i], embeddings[j]));
      }
    }

    const avgCoherence = similarities.reduce((a, b) => a + b) / similarities.length;

    return {
      pass: avgCoherence >= this.threshold,
      score: avgCoherence,
      pairwiseScores: similarities
    };
  }
};
```

---

## Part V: Implementation Path

### Phase 0: Foundation (Current)
**Focus**: Semantic schema, knowledge graph structure, initial tooling

**Deliverables**:
- Atomic documentation as knowledge graph (tokens, rules, outputs as nodes)
- Semantic token schema with personality vectors
- OKLCH color space for perceptual uniformity
- Initial derivation rules for color and typography

### Phase 1: UI Core
**Focus**: Functional ES package generating brand-coherent web experiences

**Key Work**:
- Complete semantic token library (color, typography, spacing, motion)
- Full derivation rule engine with validation
- Web adapter with Tailwind + CSS variables integration
- Accessibility evaluation (WCAG AAA automated checks)
- Token coverage metrics
- Claude Skills for system knowledge injection

**Success Signal**: Ship production web UI from semantic tokens with automated accessibility compliance

### Phase 2: First Cross-Media Expansion
**Focus**: Prove cross-media coherence with one non-UI medium

**Key Work**:
- Choose video (Sora) OR audio (Suno) as first expansion
- Build adapter mapping personality → medium parameters
- Implement cross-media coherence evaluation
- Validate brand alignment across UI + chosen medium

**Success Signal**: Generate UI + video (or audio) with measurable coherence score >0.90

### Phase 3: Multi-Modal System
**Focus**: Complete the cross-media vision

**Key Work**:
- Add remaining media adapters (video, audio, voice)
- Comprehensive cross-media coherence validation
- Platform-specific optimization (web perf, video render, audio quality)
- Case study validation with real brand

**Success Signal**: Single ES package generates brand-coherent UI, video, audio, voice with automated evals

### Phase 4: Data-Informed Evolution
**Focus**: Self-improving systems with governance guardrails

**Key Work**:
- Telemetry integration across all adapters
- Usage pattern analysis and insights
- Automated rule refinement suggestions
- Drift detection and prevention mechanisms
- Version control and migration tooling

**Success Signal**: ES package evolves based on real usage while maintaining brand integrity

### Phase 5: Ecosystem Maturity
**Focus**: Community adoption, shared patterns, governance infrastructure

**Key Work**:
- ES package registry
- Collaboration workflows (branching, merging creative direction)
- Community adapter contributions
- Best practices documentation
- Evaluation framework expansion

**Success Signal**: Multiple organizations using ES, contributing adapters, sharing patterns

---

## Part VI: Competitive Positioning

| System | Strength | Limitation | ES Relationship |
|--------|----------|-----------|-----------------|
| **Material Design** | Comprehensive UI system, multi-platform | UI-only, Google patterns | ES uses structural patterns, extends to all media |
| **Carbon (IBM)** | Enterprise-grade, accessibility-first | UI-only, governance overhead | ES adopts rigor, simplifies via automation |
| **Shopify Polaris** | Domain-specific, opinionated | UI-only, Shopify-coupled | ES generalizes domain semantics to all media |
| **frog DLS Generator** | Generative brand → tokens | Stops at UI tokens | ES extends generative approach to all media |
| **Supernova** | AI-ready, explicit metadata | UI component focus | ES shares AI-ready philosophy, expands to multi-modal |

**Unique ES Value**: Cross-media semantic coherence + executable brand guidelines + automated evaluation + multi-modal generation + data-informed evolution.

---

## Part VII: Risk Mitigation

### Risk 1: Overfitting to Metrics
**Mitigation**:
- Keep human creative review as exception gate (not eliminated, just not default)
- Rotate reference exemplars quarterly to prevent stagnation
- Track "human override rate" as quality signal—if it spikes, rules need refinement

### Risk 2: Adapter Drift
**Mitigation**:
- Pin adapter versions in package manifest
- Snapshot tests for generated prompts/parameters
- Automated diff detection on adapter updates
- Breaking changes require major version bump

### Risk 3: Governance Bloat
**Mitigation**:
- Automate migrations via knowledge graph impact analysis
- Deprecate unused tokens quickly (90-day flag, quarterly purge)
- Rule complexity budget (max N rules per token)
- Enforce "Seeds + Rules" discipline—resist ad-hoc additions

### Risk 4: Subjective Semantics
**Mitigation**:
- Ground personality vectors in reference exemplars with embeddings
- Validate semantic mappings with A/B testing
- Document semantic decisions with rationale and examples
- Annual semantic calibration with brand leadership

---

## Part VIII: Success Criteria

### Measurable Outcomes
- **Cross-Media Coherence >0.90**: Semantic consistency across UI, video, audio, voice
- **Human Override Rate <10%**: Automated evals are reliable quality gates
- **WCAG AAA Compliance 100%**: All UI outputs meet accessibility standards by default
- **Time-to-Channel Reduction >50%**: Launch new medium using existing semantics + new adapter
- **Token Coverage >95%**: Minimal unused tokens (efficient, focused system)

### Qualitative Indicators
- **Creative Directors**: "I focus on creative strategy, not review meetings"
- **Developers**: "I understand brand intent from semantics, not guesswork"
- **Marketers**: "We test creative variations rapidly"
- **Customers**: "This brand feels cohesive everywhere"

### Ecosystem Health
- **Multiple ES Packages**: Diverse use cases (B2B, B2C, e-commerce, editorial)
- **Community Adapters**: Third-party contributions for emerging platforms
- **Knowledge Sharing**: Patterns and rules shared, not reinvented
- **Forking & Evolution**: Organizations branch and improve existing packages

---

## Part IX: Case Studies (Conceptual)

### Case Study 1: Product Launch Campaign

**Challenge**: B2B SaaS company launching new product. Needs cohesive campaign across website, demo video, podcast ads, sales presentations.

**Traditional Approach**:
- Brand guidelines PDF shared with web team, video agency, audio producer
- Each interprets "professional yet approachable" differently
- Multiple review rounds to align outputs
- Result: Recognizably same brand but inconsistent feel across media

**ES Approach**:
- Creative director defines semantic tokens:
  - `personality: {energy: 0.6, warmth: 0.7, sophistication: 0.8}`
  - `visual-language: "clean-geometric, spacious, clear-hierarchy"`
  - `color-seed: "oklch(0.55 0.15 220)"`
- System generates:
  - **Web**: Tailwind config, derived palette, motion tokens
  - **Video**: Sora prompts with "moderate pacing, warm lighting, professional blue grade"
  - **Audio**: Suno parameters "D major, 110 BPM, confident piano + strings"
  - **Voice**: ElevenLabs "warm professional, 165 WPM"
- Automated evals confirm 0.92 cross-media coherence
- All outputs feel cohesively "professional yet approachable"

**Outcome**: Dramatically faster production, measurably higher coherence, eliminated review cycles.

### Case Study 2: Brand Evolution Testing

**Challenge**: Established brand needs to modernize without alienating customers. Wants to test personality shifts before committing.

**Traditional Approach**:
- Rebrand agency creates new style guide
- All-or-nothing launch
- Customer feedback is qualitative and anecdotal
- Reverting is prohibitively expensive

**ES Approach**:
- Current brand codified as v1.0: `{energy: 0.4, warmth: 0.8, sophistication: 0.6}`
- Create experimental branch v2.0-beta: `{energy: 0.6, warmth: 0.7, sophistication: 0.7}`
- System auto-generates all downstream tokens and outputs
- Deploy v2.0-beta to 10% of traffic, test video in select markets
- Telemetry tracks engagement, brand perception surveys
- Automated evals ensure accessibility and coherence maintained
- If successful: merge → v2.0, roll out across platforms
- If unsuccessful: revert to v1.0 with zero cost

**Outcome**: Data-driven evolution with quantified risk, continuous iteration, zero-cost experimentation.

### Case Study 3: Segment Personalization

**Challenge**: E-commerce platform wants brand presentation adjusted by customer segment (luxury vs. budget) without separate design systems.

**Traditional Approach**:
- Treat all customers the same (misses personalization)
- OR create separate design systems (massive duplication)

**ES Approach**:
- Core package defines brand essence (unchanging)
- Segment overlays adjust personality:
  - **Luxury**: `{sophistication: +0.2, playfulness: -0.1}`
  - **Budget**: `{warmth: +0.2, energy: +0.1}`
- System generates segment-specific outputs from same codebase:
  - Luxury: Spacious layouts, refined typography, muted motion
  - Budget: Friendly messaging, energetic CTAs, approachable imagery
- Automated evals ensure both variants remain brand-coherent
- Single ES package maintains both experiences

**Outcome**: Personalization without fragmentation, maintainable from single source.

---

## Part X: Why Now

### Technology Convergence
1. **Generative AI Maturity**: Midjourney, Sora, Suno, ElevenLabs are production-ready with parametric control
2. **Semantic Token Standards**: W3C Design Tokens Community Group provides foundation
3. **AI Agents as Collaborators**: Claude Skills, GPT Actions make integration practical

### Market Readiness
- **Supernova's "AI-Ready" Push**: Market leader validating machine-readable systems
- **frog's Generative Pipelines**: Appetite for brand-to-tokens automation
- **Claude Skills Adoption**: Developers already injecting design system context
- **Multi-Framework Exhaustion**: Industry tired of parallel component libraries—semantic abstraction is next

### The Creative Bottleneck
- Product needs UI for web, iOS, Android
- Marketing needs video, audio, social content
- Sales needs presentations, demos, spatial experiences
- Every output requires brand compliance review
- **Review cycles are the bottleneck**

ES removes the bottleneck: Automated evaluation scales infinitely. Creative directors focus on high-level direction.

---

## Conclusion: The Paradigm Shift

Design systems brought consistency and efficiency to UI development. They were a necessary evolution from static style guides.

Experience Systems are the necessary next evolution: **semantic coherence across all media types**, enabling brands to scale creative execution without sacrificing integrity.

The industry is taking steps toward this future:
- Making design systems "AI-ready" with explicit metadata
- Generating tokens from brand guidelines algorithmically
- Treating documentation as queryable knowledge graphs

Experience Systems take the full leap:
- Brand personality as executable code
- Cross-media semantic coherence as first-class requirement
- Multi-modal generative adapters as standard infrastructure
- Automated brand evaluation as quality gate
- Data-informed evolution as continuous improvement

**The shift**: From manual creative execution with periodic redesigns to automated, semantically coherent generation with continuous data-informed evolution.

The future of brand expression isn't more design systems. It's Experience Systems.

---

## Next Actions

For organizations ready to explore:

1. **Audit**: How much of your brand is codified vs. interpretive?
2. **Identify Use Case**: Where would cross-media coherence provide most value?
3. **Prototype**: Implement Phase 1 (semantic tokens, rules, web adapter)
4. **Validate**: Add one non-UI medium, measure coherence
5. **Automate**: Replace manual review with automated brand evals
6. **Evolve**: Add telemetry, enable data-informed improvement

The paradigm is defined. The technology is ready. The industry validates the concepts.

Now we build.

---

**Document Version**: Claude v2
**Date**: 2025-11-22
**Status**: Exploration — Industry-grounded, implementation-focused
**Related**:
- `experience-systems-whitepaper.md` (original)
- `gemini-v1.md` (iteration 1)
- `codex-v1.md` (iteration 2)
- `iteration-log.md` (tracking document)
