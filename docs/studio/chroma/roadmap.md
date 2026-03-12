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

**Gate:** All three modules pass unit tests independently. Color space conversions validated against known reference values. Sampling produces stable results on synthetic test images.

---

## Phase 2: Analysis Pipeline

Wire the primitives into a single orchestrated pipeline with parameter correlation.

| Issue | Title | Dependencies |
|-------|-------|-------------|
| OJI-142 | Multi-space analysis pipeline (orchestrator) | OJI-139, OJI-140, OJI-141 |
| OJI-143 | Parameter correlation engine | OJI-142 |

**Gate:** `analyzeImageColors()` runs end-to-end on a test image. Parameter correlation produces sensible confidence scores on a manually verified amber-eye image.

---

## Phase 3: Prototype UI

Interactive studio prototype — image in, visual analysis out, parameter comparison.

| Issue | Title | Dependencies |
|-------|-------|-------------|
| OJI-144 | Interactive prototype UI | OJI-142 |
| OJI-145 | Parameter comparison view | OJI-144, OJI-143 |

**Gate:** A user can upload a Luv-generated image, define iris regions, see multi-space color analysis, and compare against chassis parameters — all in the browser.

---

## Phase 4: Evaluation & Reinforcement

Ground-truth validation and human feedback loop for iterative improvement.

| Issue | Title | Dependencies |
|-------|-------|-------------|
| OJI-146 | Evaluation dataset: curated image-parameter pairs | OJI-142 |
| OJI-147 | Automated evaluation harness | OJI-146 |
| OJI-148 | Feedback mechanism for reinforcement | OJI-145, OJI-147 |

**Gate:** Chroma's compensated analysis agrees with human perception labels more often than vision model labels do on the evaluation set. Feedback loop demonstrated: correction → eval dataset update → regression test passes.

---

## Future (post-prototype)

Not yet scoped. Potential directions:

- **OSS extraction:** Package core pipeline (color-spaces, sampler, lighting, analyze) as `chroma-analyze` npm package
- **Luv integration:** Wire into Luv's generation pipeline as automatic post-generation validation step
- **Auto region detection:** ML-based iris/feature boundary detection (replace manual region selection)
- **Batch analysis:** Run against a full generation set and produce aggregate quality reports
- **Additional color spaces:** OKLCH gamut mapping, Munsell system alignment
- **API endpoint:** Server-side analysis for headless pipeline integration

---

## Architecture

```
lib/studio/chroma/
├── color-spaces.ts      # Pure color conversions (OJI-139)
├── sampler.ts           # Canvas pixel extraction (OJI-140)
├── lighting.ts          # Lighting detection/compensation (OJI-141)
├── analyze.ts           # Pipeline orchestrator — public API (OJI-142)
├── correlate.ts         # Parameter matching — Luv-specific (OJI-143)
├── types.ts             # Shared type definitions
├── __fixtures__/        # Eval dataset (OJI-146)
└── __tests__/
    ├── color-spaces.test.ts
    ├── sampler.test.ts
    ├── lighting.test.ts
    ├── analyze.test.ts
    ├── correlate.test.ts
    └── evaluation.test.ts  # Regression harness (OJI-147)

components/studio/prototypes/chroma/
├── index.tsx                  # Scaffold (existing)
├── chroma-prototype.tsx       # Interactive UI (OJI-144)
└── parameter-comparison.tsx   # Spec comparison view (OJI-145)
```

**OSS boundary:** Everything in `lib/studio/chroma/` except `correlate.ts` is generic and extractable. The `correlate` module is the Luv-specific adapter.
