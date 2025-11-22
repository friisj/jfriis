# Experience Systems: Now / Next / Later Roadmap

**Claude v3 — Simplified implementation path**

---

## Roadmap Philosophy

This roadmap organizes work into three horizons: **Now** (immediate focus for MVP), **Next** (proven cross-media expansion), and **Later** (ecosystem maturity). Each phase builds on validated learnings from the previous phase.

**Guiding Principles**:
- Ship incrementally with measurable validation gates
- Prove cross-media coherence before scaling
- Automate governance before expanding team access
- Validate each adapter before building the next

---

## NOW: Minimal Viable ES Package

**Goal**: Ship a functional Experience System that generates brand-coherent UI with automated quality gates.

**What We're Building**:

### 1. Foundation Artifacts
- [x] **Manifest** (`es-package.json`): Package identity, capabilities, governance config
- [x] **Creative Direction** (`creative-direction.json`): Brand personality vectors, visual/motion/voice language
- [x] **Seeds** (`seeds.json`): Primary color (OKLCH), base typography size, spacing unit, motion base duration

### 2. Rule Engine
- [ ] **Color Rules**: OKLCH lightness scale generation (9-step palettes)
- [ ] **Typography Rules**: Modular scale from base size
- [ ] **Spacing Rules**: Generate scale from base unit
- [ ] **Motion Rules**: Map personality.energy → duration ranges
- [ ] **Rule Tests**: Unit tests for each derivation function

### 3. First Adapter: Web UI
- [ ] **Tailwind Adapter**: Generate `tailwind.config.js` from tokens
- [ ] **CSS Variables Adapter**: Generate `:root` custom properties
- [ ] **Adapter Interface Contract**: Define inputs, outputs, determinism requirements
- [ ] **Snapshot Tests**: Prevent config drift

### 4. Evaluation Harness
- [ ] **WCAG Contrast Eval**: Automated AAA compliance check
- [ ] **Token Coverage Eval**: Track unused tokens (target: >95% coverage)
- [ ] **CLI Runner**: `es-eval run --targets ui --out reports/eval.json`
- [ ] **BCS Calculator**: Initial implementation (WCAG + coverage only)

### 5. Governance Foundation
- [ ] **SCP Template**: System Change Proposal markdown template
- [ ] **State Machine**: Draft → Review → Approved → Merged → Monitored
- [ ] **Approval Roles**: Define Brand Steward + System Maintainer
- [ ] **Merge Requirements**: Attached eval results + snapshots

**Success Criteria**:
- ✓ Generate production-ready Tailwind config from semantic tokens
- ✓ 100% WCAG AAA compliance for generated color tokens
- ✓ >95% token coverage (minimal unused tokens)
- ✓ SCP workflow enforced with required eval artifacts

**Deliverables**:
- Shippable ES package (npm/package)
- Working web app using generated tokens
- Documentation: setup, usage, contribution guide

---

## NEXT: Cross-Media Coherence Proof

**Goal**: Prove the core thesis—that semantic tokens enable measurable brand coherence across UI and one non-UI medium.

**What We're Building**:

### 1. Choose First Non-UI Medium
**Decision Point**: Pick ONE to validate the approach:
- **Option A: Audio (Suno)** — Simpler adapter, faster iteration
- **Option B: Video (Sora)** — Higher impact, more complex mapping

**Recommended**: Start with audio, add video in Later phase.

### 2. Audio Adapter (if chosen)
- [ ] **Suno Adapter**: Map personality vectors → BPM, key, instrumentation
- [ ] **Personality Mappings**:
  - `energy` → tempo range (high: 120-140 BPM, low: 60-80 BPM)
  - `sophistication` → harmonic complexity (high: jazz/minor, low: simple major)
  - `warmth` → timbre selection (warm pads vs. bright synths)
- [ ] **Adapter Interface**: Define inputs (personality), outputs (musical parameters)
- [ ] **Snapshot Tests**: Ensure deterministic parameter generation

### 3. Video Adapter (if chosen)
- [ ] **Sora Adapter**: Map personality → pacing, lighting, camera movement
- [ ] **Personality Mappings**:
  - `energy` → shot length (high: 2-3s cuts, low: 8-12s)
  - `warmth` → color grade (high: golden hour, low: cool steel)
  - `sophistication` → composition (high: rule of thirds, low: centered)
- [ ] **Adapter Interface**: Define inputs, outputs (scene descriptions)
- [ ] **Snapshot Tests**: Validate prompt consistency

### 4. Cross-Media Evaluation
- [ ] **Brand Alignment Eval**: Cosine similarity between output embeddings and reference personality
- [ ] **Cross-Media Coherence Eval**: Semantic consistency between UI and chosen medium
- [ ] **Threshold Calibration**: Determine acceptable coherence scores through testing
- [ ] **BCS Expansion**: Add brand-alignment + cross-media to composite score

### 5. Governance Automation
- [ ] **Auto-Approval Gate**: BCS ≥ target → auto-approve
- [ ] **Human Review Trigger**: BCS < target → require Brand Steward approval
- [ ] **Eval Artifact Requirement**: Block merge without attached eval JSON

**Success Criteria**:
- ✓ Cross-media coherence score ≥0.90 between UI and chosen medium
- ✓ Brand alignment score ≥0.85 for both UI and non-UI outputs
- ✓ BCS calculation includes all four metrics (WCAG, coverage, alignment, coherence)
- ✓ At least one change auto-approved based on BCS threshold

**Deliverables**:
- ES package generating UI + audio/video with measurable coherence
- Case study: Before/after coherence comparison
- Refined BCS weights based on real results

---

## LATER: Multi-Modal Scale & Ecosystem

**Goal**: Expand to full cross-media capability and build ecosystem for adoption, contribution, and evolution.

### Phase 1: Complete Media Coverage

**Remaining Adapters**:
- [ ] **Sora Adapter** (if Suno chosen in Next)
- [ ] **Suno Adapter** (if Sora chosen in Next)
- [ ] **Midjourney Adapter**: Personality → style prompts, image parameters
- [ ] **ElevenLabs Adapter**: Personality → voice tone, pacing (WPM), inflection
- [ ] **3D/Spatial Adapter**: Personality → material properties, lighting warmth, spatial rhythm

**Each Adapter Requires**:
- Explicit interface contract (inputs, outputs)
- Personality mapping rules
- Snapshot tests for determinism
- Contribution to BCS via brand alignment

**Expanded Evaluation**:
- [ ] **Multi-Modal Coherence**: Measure semantic consistency across 3+ media types
- [ ] **Pairwise Coherence Matrix**: Track coherence between all media pairs
- [ ] **Threshold Tuning**: Adjust BCS weights based on telemetry

### Phase 2: Data-Informed Evolution

**Telemetry Implementation**:
- [ ] **Token Usage Tracking**: Log frequency, contexts, combinations
- [ ] **Override Rate Tracking**: Monitor human overrides by rule/adapter
- [ ] **Eval Failure Logging**: Track which evals fail most often
- [ ] **BCS Trend Analysis**: Monitor composite score over versions

**Evolution Triggers**:
- [ ] **Low Usage Detection**: Flag tokens unused for 90 days → deprecation review
- [ ] **High Override Detection**: Flag rules with >20% override rate → refinement SCP
- [ ] **Drift Detection**: BCS drop beyond threshold → freeze non-urgent changes
- [ ] **Pattern Recognition**: Identify common adaptations → suggest new rules

**Automated Refinement**:
- [ ] **Rule Suggestion Engine**: Propose new rules based on usage patterns
- [ ] **Adapter Optimization**: Tune mappings based on coherence scores
- [ ] **Deprecation Automation**: Remove unused tokens after review period

### Phase 3: Ecosystem Maturity

**Package Registry**:
- [ ] **ES Package Repository**: Central registry for published packages
- [ ] **Versioning Standards**: Semantic versioning for ES packages
- [ ] **Dependency Management**: Track adapter compatibility
- [ ] **Migration Tooling**: Automated upgrades between versions

**Collaboration Infrastructure**:
- [ ] **Branching Strategy**: Feature branches for experimental adaptations
- [ ] **Merge Workflow**: SCP-driven merge requests with required evals
- [ ] **Conflict Resolution**: Handle competing personality vector changes
- [ ] **Rollback Mechanisms**: Revert to previous stable version

**Community Contributions**:
- [ ] **Adapter Marketplace**: Share custom adapters (e.g., email, print, retail)
- [ ] **Rule Library**: Shared derivation functions
- [ ] **Best Practices Docs**: Patterns, anti-patterns, case studies
- [ ] **Governance Templates**: SCP templates for common change types

**AI Agent Integration**:
- [ ] **Claude Skills Library**: Pre-built skills for token queries, brand checks
- [ ] **Knowledge Graph API**: Query system relationships programmatically
- [ ] **Agent-Driven Generation**: AI can propose outputs, run evals, create SCPs
- [ ] **Multi-Agent Workflows**: Coordinate between brand, dev, and QA agents

### Phase 4: Advanced Capabilities

**Contextual Adaptation**:
- [ ] **Segment Overlays**: Adjust personality for customer segments (luxury, budget, regional)
- [ ] **Temporal Variations**: Seasonal, event-based, time-of-day adaptations
- [ ] **A/B Testing Framework**: Test personality variations with real users
- [ ] **Dynamic Personalization**: Real-time adaptation based on user context

**Extended Evaluation**:
- [ ] **Perceptual Testing**: Human evaluation of generated outputs
- [ ] **Brand Lift Measurement**: Track brand perception metrics
- [ ] **Engagement Metrics**: Monitor performance of ES-generated content
- [ ] **Competitive Benchmarking**: Compare coherence vs. manual processes

**Research & Innovation**:
- [ ] **Learned Personality Vectors**: Extract personality from existing brand outputs
- [ ] **Multi-Objective Optimization**: Balance coherence, performance, accessibility
- [ ] **Emerging Media Adapters**: AR filters, voice assistants, haptics, scent (exploratory)
- [ ] **Cross-Brand Collaboration**: Shared adapters for co-branded experiences

---

## Success Metrics by Phase

### NOW (MVP)
- 100% WCAG AAA for UI tokens
- >95% token coverage
- SCP workflow enforced
- Production web app deployed

### NEXT (Cross-Media Proof)
- Cross-media coherence ≥0.90
- Brand alignment ≥0.85
- BCS auto-approval working
- Case study published

### LATER (Scale & Ecosystem)
- 5+ media types with coherence ≥0.90
- Telemetry-driven evolution active
- 3+ organizations using ES
- Community adapter contributions
- Agent-driven workflows operational

---

## Decision Points

### NOW → NEXT Transition Gate
**Required before moving to NEXT**:
- MVP package shipped to production
- Web UI generating from semantic tokens
- WCAG AAA compliance automated
- SCP governance enforced
- Team trained on workflow

### NEXT → LATER Transition Gate
**Required before moving to LATER**:
- Cross-media coherence proven (UI + 1 other medium ≥0.90)
- BCS calculation validated with real data
- Auto-approval vs. human review working correctly
- At least 2 successful SCPs completed
- Adapter interface contract proven with 2+ adapters

---

## Anti-Patterns to Avoid

**Don't**:
- ❌ Build all adapters before proving one works
- ❌ Skip evaluation automation in NOW phase
- ❌ Allow merges without eval artifacts
- ❌ Add adapters without snapshot tests
- ❌ Scale team access before governance is automated
- ❌ Optimize for speed over coherence validation
- ❌ Introduce time-based estimates (focus on validation gates)

**Do**:
- ✅ Ship smallest viable package first
- ✅ Validate cross-media coherence with ONE medium before scaling
- ✅ Automate quality gates before expanding team
- ✅ Measure BCS at every merge
- ✅ Use telemetry to drive evolution, not assumptions
- ✅ Keep governance lightweight but enforced
- ✅ Progress through validation, not timelines

---

## Open Questions for Each Phase

### NOW Phase
- What's the minimum token set for a viable UI? (color, type, spacing, motion?)
- What OKLCH lightness range works best for 9-step scales? (0.95-0.2? 0.98-0.15?)
- Should motion rules be linear or curved mappings from personality.energy?
- What's the right BCS threshold for auto-approval in NOW phase? (Start conservative: 0.95?)

### NEXT Phase
- Audio or video first? (Audio is simpler, video is higher impact)
- What embedding model for brand alignment eval? (OpenAI, Anthropic, local?)
- How do we calibrate "good" coherence scores without prior data? (Start with exemplars?)
- What's the minimum viable telemetry in NEXT phase?

### LATER Phase
- How do we prevent adapter proliferation while encouraging community contributions?
- What's the governance model for community-contributed adapters?
- How do we version adapters independently from the core package?
- What's the migration path for organizations on older ES versions?

---

**Document Version**: Claude v3-Roadmap
**Date**: 2025-11-22
**Purpose**: Simplified now/next/later implementation path
**Related**: `claude-v3-erd.md`, `codex-v2.md`, `gemini-v2.md`
