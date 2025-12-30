# Experience Systems: Build Contracts for Cross-Media Brand Execution

**Codex v2 — Contracts, evaluation math, and minimal viable package**

---

## Critique of `gemini-v2.md` (v4.0)
- Strong unification, but still verbose and blends descriptive text with specs. Hard to see the minimum buildable slice.
- BCS is named but not defined; evals lack scoring math and rollout gates.
- Adapters list parameters but not the interface contract (inputs, outputs, determinism, versioning, tests).
- Governance workflow is clear but missing the actual SCP artifact template and required evidence (eval runs, diffs, impact).
- Roadmap is solid, yet still high-level for an engineering team to start today.

---

## What Changed in This Version
- Re-centered on *build contracts*: explicit adapter interface, eval formula, SCP template, and required evidence.
- Added a **Minimal Viable ES Package** checklist to make Phase 1/2 shippable.
- Defined **Brand Coherence Score (BCS)** as a weighted, composable metric with sample weights.
- Introduced **adapter determinism + snapshot tests** to prevent prompt drift.
- Tightened language and removed narrative redundancies to improve scannability.

---

## Minimal Viable ES Package (ship this first)
1) **Semantics**: `creative-direction.json` (personality vector + avoid list) and `seeds.yaml` (primary OKLCH, base type size, spacing unit, base motion).
2) **Rules**: `rules.yaml` with deterministic functions (palette scale, type scale, motion map). Each rule has unit tests.
3) **Adapters**: `adapters/web-tailwind.json` + one non-UI adapter (`adapters/suno.json` *or* `adapters/sora.json`). Each exposes inputs, outputs, and snapshot tests.
4) **Evals**: `evals.json` + CLI harness to run: WCAG contrast (UI), token coverage, brand-personality alignment (UI + chosen non-UI), cross-media coherence (UI vs. chosen non-UI).
5) **Governance**: `SCP.md` template + state machine; human approvals required for semantics/seeds changes; automated gates for rules/adapters.

---

## Core Artifacts & Contracts

### 1) Manifest (`es-package.json`)
Minimal identity + guardrails.
```json
{
  "name": "@brand/experience-system",
  "version": "5.0.0",
  "schemaVersion": "1.1",
  "capabilities": ["ui", "image", "video", "audio", "voice"],
  "immutableCore": ["creative-direction.brandPersonality", "seeds.color.primary"],
  "driftThreshold": 0.15,
  "bcsTarget": 0.90
}
```

### 2) Semantics (`creative-direction.json`)
Compact, machine-readable intent.
```json
{
  "brandPersonality": {"energy": 0.62, "warmth": 0.58, "sophistication": 0.82, "playfulness": 0.22},
  "avoid": ["aggressive", "childish", "clinical"],
  "visualLanguage": {"geometry": "rounded-geometric", "density": "spacious"},
  "motionLanguage": {"pacing": "measured", "easing": "ease-out-cubic"},
  "voiceTone": {"style": "assured, warm", "paceWPM": [165, 180]}
}
```

### 3) Rules (`rules.yaml`)
Deterministic, testable transforms.
```yaml
rules:
  palette:
    input: seeds.color.primary
    output: tokens.color.*
    generate:
      - name: primary-scale
        method: oklch-lightness-scale
        steps: 9
        range: [0.95, 0.2]
  motion-duration:
    input: brandPersonality.energy
    output: tokens.motion.duration
    map: inverseLerp([0.2, 1.0], [400ms, 150ms])
tests:
  - rule: palette
    expect: tokens.color.primary-scale[0] == "oklch(0.95 …)"
  - rule: motion-duration
    expect: energy:0.62 -> duration: ~220ms
```

### 4) Adapter Interface Contract
Every adapter declares inputs, outputs, determinism, and snapshot tests.
```yaml
adapter:
  id: web-tailwind
  mediaType: ui
  inputs: [tokens.color.*, tokens.type.*, tokens.spacing.*, tokens.motion.*]
  outputs: ["tailwind.config.js"]
  deterministic: true
  version: 1.1.0
tests:
  snapshot:
    - input: seeds.color.primary="oklch(0.5 0.18 250)"
      assert: output.tailwind.colors.primary == "oklch(0.5 0.18 250)"
```

Example non-UI adapter (audio):
```yaml
adapter:
  id: suno
  mediaType: audio
  inputs: [brandPersonality.energy, brandPersonality.sophistication, brandPersonality.warmth]
  outputs: ["bpm", "key", "instrumentation"]
  deterministic: true
tests:
  snapshot:
    - input: {energy:0.62, sophistication:0.82, warmth:0.58}
      assert:
        bpm in 120..135
        key == "D major"
        instrumentation includes ["piano", "strings"]
```

### 5) Evaluation Harness (`evals.json` + CLI)
Define metrics, weights, and rollout gates.
```json
{
  "evaluations": {
    "wcag-contrast": {"type": "accessibility", "target": "ui", "threshold": "AAA"},
    "token-coverage": {"type": "quality", "target": "ui", "threshold": 0.95},
    "brand-alignment": {"type": "coherence", "target": ["ui","audio"], "threshold": 0.85, "metric": "cosine"},
    "cross-media": {"type": "coherence", "target": ["ui","audio"], "threshold": 0.90, "metric": "semantic-consistency"}
  },
  "bcsWeights": {"brand-alignment": 0.45, "cross-media": 0.35, "token-coverage": 0.1, "wcag-contrast": 0.1},
  "rolloutPolicy": {
    "auto-approve": "all thresholds met AND BCS >= bcsTarget",
    "human-review": "any failure OR BCS < bcsTarget"
  }
}
```
**BCS computation (example):**  
`BCS = 0.45*brandAlignment + 0.35*crossMedia + 0.1*tokenCoverage + 0.1*wcagPass`  
Scale inputs to 0-1; `wcagPass` is 1 if AAA else 0.

CLI sketch:
```
es-eval run --targets ui,audio --out reports/eval.json
es-eval bcs --config evals.json --results reports/eval.json
```

### 6) Governance: SCP Template + States
Required file: `governance/SCP.md` per change.
```
# System Change Proposal
- Title:
- Scope: semantics | seeds | rules | adapters | evals | telemetry
- Change summary:
- Diffs: (linked)
- Eval results: (attached JSON)
- Impact analysis: affected adapters/components
- Rollback plan:
- Approvals: Brand Steward | System Maintainer
- State: Draft -> In Review -> Approved -> Merged -> Monitored
```
Rules:
- **Semantics/Seeds**: always require Brand Steward + Maintainer approval.
- **Rules/Adapters/Evals**: require Maintainer; Steward if impacts brand personality vectors.
- Merging requires attached eval results + snapshots.

### 7) Telemetry (`telemetry.json`)
Keep lean; feed governance.
```json
{
  "metrics": {
    "tokenUsage": ["tokenId", "count", "context"],
    "overrideRate": ["ruleId", "adapterId", "percent"],
    "evalFailures": ["evalId", "target", "timestamp"]
  },
  "triggers": {
    "lowUsage": {"condition": "unused 90d", "action": "flag"},
    "highOverride": {"condition": ">20% overrides/month", "action": "SCP required"},
    "bcsDrop": {"condition": "BCS < (bcsTarget - driftThreshold)", "action": "freeze non-urgent changes; run review"}
  }
}
```

---

## Implementation Path (no timelines)
1) **MVP Package**: Ship semantics, seeds, rules, web-tailwind adapter, eval harness (WCAG + token coverage), SCP template.
2) **First Cross-Media Proof**: Add one non-UI adapter (audio *or* video) with snapshot tests; enable brand-alignment + cross-media evals; compute BCS.
3) **Governed Iteration**: Enforce SCP workflow; require eval artifacts for merges; start telemetry logging.
4) **Scale-Out**: Add remaining adapters (sora, elevenlabs, midjourney); broaden evals; refine BCS weights based on telemetry.

---

## Success Signals to Track
- BCS ≥ 0.90 with <10% human overrides on governed outputs.
- WCAG AAA for generated UI tokens/components by default.
- Cross-media coherence (UI vs. first non-UI) ≥ 0.90 within two iterations of adapter tuning.
- SCP cycle time <5 days with attached eval artifacts and zero untested merges.

---

## Next Actions for the Next Model
- Stress-test the adapter contract: add an explicit prompt schema example for Sora or Midjourney with token interpolation.
- Expand eval harness description into a runnable example (CLI script + sample output JSON).
- Add a short case vignette showing BCS before/after tuning an adapter to illustrate governance + telemetry in action.

**Document Version**: 5.0  
**Date**: 2025-11-21  
**Status**: Unified Blueprint with Build Contracts  
**Related**: `gemini-v2.md`, `claude-v2.md`, `codex-v1.md`, `experience-systems-whitepaper.md`
