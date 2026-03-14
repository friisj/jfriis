# Chroma — Roadmap

> Backlog: `isq issue list --goal "Chroma"`

---

## Phase 1: Foundation

Build the core analysis primitives — zero-dependency, fully tested, extractable to standalone OSS package.

| Issue | Title | Dependencies |
|-------|-------|-------------|
| OJI-139 | Core color space conversion library | None |
| OJI-140 | Canvas pixel sampling engine | None |
| OJI-141 | Lighting condition detection and compensation | OJI-139 |

**Gate:** All three modules pass unit tests independently. Color space conversions (RGB ↔ HSV ↔ CIELAB ↔ OKLCH) validated against known reference values. Sampling produces stable results on synthetic test images. Lighting compensation demonstrably shifts amber-under-cool-light back toward amber.

---

## Phase 2: Pipeline & Integration

Wire the primitives into a single orchestrated pipeline. Spec comparison is generic — consumers (Luv, Arena) provide their own adapters.

| Issue | Title | Dependencies |
|-------|-------|-------------|
| OJI-142 | Multi-space analysis pipeline (orchestrator) | OJI-139, OJI-140, OJI-141 |
| OJI-143 | Spec comparison interface with consumer adapters | OJI-142 |

**Gate:** `analyzeImageColors()` runs end-to-end on a test image. Spec comparison produces sensible confidence scores via both a Luv chassis adapter and a generic hex-target adapter. Chroma is callable programmatically — no UI required.

---

## Phase 3: Evaluation & Benchmark

Ground-truth validation — the thesis test. Does Chroma actually outperform vision models on color-specific tasks?

| Issue | Title | Dependencies |
|-------|-------|-------------|
| OJI-150 | Synthetic test image generation | OJI-139 |
| OJI-146 | Evaluation dataset: curated image-parameter pairs | OJI-142, OJI-150 |
| OJI-147 | Automated evaluation harness | OJI-146 |
| OJI-149 | Benchmark: Chroma vs vision models on color identification | OJI-147 |

**Gate:** Chroma's compensated analysis agrees with human perception labels more often than top vision models (Claude, GPT-4o, Gemini) on the evaluation set. Results are quantitative and publishable.

---

## Phase 4: Demo & Debug UI

Interactive prototype for inspecting analysis results and demonstrating the pipeline. Secondary to the core engine — this is a debug/demo tool, not the product surface.

| Issue | Title | Dependencies |
|-------|-------|-------------|
| OJI-144 | Interactive debug/demo UI | OJI-142 |
| OJI-145 | Parameter comparison view | OJI-144, OJI-143 |
| OJI-148 | Eval dataset curation UI | OJI-145, OJI-147 |

**Gate:** A user can upload an image, define regions, see multi-space color analysis, compare against spec parameters, and review/correct eval dataset labels — all in the browser.

---

## Future (post-prototype)

Not yet scoped. Potential directions:

- **OSS extraction:** Package core pipeline (color-spaces, sampler, lighting, analyze) as `chroma-analyze` npm package
- **Luv integration:** Wire into Luv's generation pipeline as automatic post-generation validation step
- **Arena integration:** Color accuracy instrument for design skill evaluation
- **Auto region detection:** ML-based iris/feature boundary detection (replace manual region selection)
- **Batch analysis:** Run against a full generation set and produce aggregate quality reports
- **Additional color spaces:** Munsell system alignment, spectral approximation
- **API endpoint:** Server-side analysis for headless pipeline integration

---

## Architecture

```
lib/studio/chroma/
├── color-spaces.ts      # Pure color conversions: RGB ↔ HSV ↔ CIELAB ↔ OKLCH (OJI-139)
├── sampler.ts           # Canvas pixel extraction + regional statistics (OJI-140)
├── lighting.ts          # Lighting detection/compensation (OJI-141)
├── analyze.ts           # Pipeline orchestrator — public API (OJI-142)
├── compare.ts           # Spec comparison interface + adapters (OJI-143)
├── types.ts             # Shared type definitions
├── __fixtures__/        # Synthetic test images (OJI-150) + eval dataset (OJI-146)
└── __tests__/
    ├── color-spaces.test.ts
    ├── sampler.test.ts
    ├── lighting.test.ts
    ├── analyze.test.ts
    ├── compare.test.ts
    └── evaluation.test.ts  # Regression harness (OJI-147)

components/studio/prototypes/chroma/
├── index.tsx                  # Scaffold (existing)
├── chroma-prototype.tsx       # Debug/demo UI (OJI-144)
├── parameter-comparison.tsx   # Spec comparison view (OJI-145)
└── eval-curator.tsx           # Dataset curation UI (OJI-148)
```

**OSS boundary:** Everything in `lib/studio/chroma/` except `compare.ts` consumer adapters is generic and extractable. The adapters are the consumer-specific pieces (Luv chassis, Arena design tokens).
