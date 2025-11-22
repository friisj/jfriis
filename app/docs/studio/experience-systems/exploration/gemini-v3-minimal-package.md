# Experience Systems: Minimal Viable Package (v0.1.0)

**Gemini v3 — Actionable Boilerplate for a "NOW" Phase MVP**

This document provides the concrete file structure and boilerplate content for a `v0.1.0` minimal viable Experience System package. The goal is to create a tangible, shippable artifact that fulfills the "NOW" phase of the roadmap: a functional ES that generates brand-coherent UI for a single web platform.

---

## Philosophy of the Minimal Package

- **Focus on UI First**: Prove the core value proposition on the most mature and well-understood medium.
- **Concrete and Buildable**: No aspirational schemas. Every file here is required for a `v0.1.0`.
- **Manual Mappings**: For this MVP, mappings from creative direction to rules are done manually by the system owner. Full automation comes later.
- **Minimal Governance**: Governance is enforced through process (PR reviews) before full automation. The `humanReviewRequired` flag is `true`.

---

## Directory Structure for `es-package-v0.1.0`

```
es-package-v0.1.0/
├── manifest.json
├── creative-direction.json
├── seeds.json
├── rules/
│   ├── color-rules.json
│   └── typography-rules.json
├── adapters/
│   └── web-tailwind-adapter.json
└── evals/
    └── web-ui-evals.json
```

---

## File-by-File Boilerplate

### 1. `manifest.json`

Defines the package identity and scope. Note the limited `mediaTypes` and explicit `humanReviewRequired`.

```json
{
  "name": "@brand/experience-system",
  "version": "0.1.0",
  "description": "Minimal Viable ES for Brand X Web UI.",
  "owner": "brand-systems-team",
  "schemaVersion": "1.0",
  "capabilities": {
    "mediaTypes": ["ui"],
    "platforms": ["web"],
    "supportedAgents": null
  },
  "governance": {
    "humanReviewRequired": true,
    "driftThreshold": null,
    "bcsTarget": 0.95,
    "immutableCore": ["seeds.color.primary"]
  }
}
```

### 2. `creative-direction.json`

A simplified version containing only the vectors relevant to UI.

```json
{
  "brandPersonality": {
    "primary": {
      "energy": 0.6,
      "warmth": 0.7,
      "sophistication": 0.8
    },
    "emotionalRange": ["confident", "approachable"]
  },
  "visualLanguage": {
    "geometry": "rounded-geometric",
    "density": "spacious",
    "hierarchy": "clear-pronounced"
  }
}
```

### 3. `seeds.json`

The atomic source values for all derivations.

```json
{
  "color": {
    "primary": "oklch(0.65 0.15 250)"
  },
  "typography": {
    "baseFontSize": "16px",
    "scaleRatio": 1.333
  },
  "spacing": {
    "baseUnit": "4px"
  },
  "radius": {
    "base": "8px"
  }
}
```

### 4. `rules/color-rules.json`

Explicit derivation rules for the color palette. A build script will read this and generate the full token set.

```json
{
  "palette": {
    "from": "seeds.color.primary",
    "generate": [
      {
        "name": "primary",
        "method": "oklch-lightness-scale",
        "steps": 9,
        "outputFormat": "oklch",
        "range": [0.98, 0.25],
        "description": "Primary brand color scale from light to dark."
      },
      {
        "name": "neutral",
        "method": "desaturated-scale",
        "steps": 7,
        "outputFormat": "oklch",
        "chroma": 0.01,
        "description": "Neutral gray scale for text and backgrounds."
      }
    ]
  }
}
```

### 5. `rules/typography-rules.json`

Derivation rules for the type scale.

```json
{
  "typeScale": {
    "from": ["seeds.typography.baseFontSize", "seeds.typography.scaleRatio"],
    "generate": {
      "method": "modular-scale",
      "steps": [-1, 0, 1, 2, 3, 4, 5],
      "nameFormat": "text-size-{step}",
      "description": "Modular type scale based on the 'Perfect Fourth' ratio."
    }
  },
  "lineHeight": {
    "from": "self.typeScale",
    "generate": {
      "method": "proportional-line-height",
      "factor": 1.5,
      "nameFormat": "leading-{step}",
      "description": "Proportional line height for optimal readability."
    }
  }
}
```

### 6. `adapters/web-tailwind-adapter.json`

The contract for transforming the generated tokens into a `tailwind.config.js` file.

```json
{
  "adapterId": "web-tailwind-v1",
  "mediaType": "ui",
  "targetFile": "tailwind.config.js",
  "deterministic": true,
  "version": "1.0.0",
  "inputs": {
    "colors": "generated_tokens.palette",
    "fontSize": "generated_tokens.typeScale",
    "lineHeight": "generated_tokens.lineHeight"
  },
  "outputs": {
    "description": "A valid Tailwind theme object.",
    "schema": "https://json.schemastore.org/tailwindcss"
  },
  "tests": [
    "snapshot-test-v1.js"
  ]
}
```

### 7. `evals/web-ui-evals.json`

Defines the automated checks that run against the output of the web adapter. For v0.1.0, this is focused on accessibility and basic coverage.

```json
{
  "evaluations": [
    {
      "evalId": "WCAG-contrast-check-v1",
      "type": "accessibility",
      "target": "generated_tokens.palette",
      "description": "Ensures all primary color steps have a WCAG AA-compliant pair within the same scale.",
      "metric": "contrastRatio",
      "threshold": 4.5,
      "weight": 0.7
    },
    {
      "evalId": "token-coverage-v1",
      "type": "technical-quality",
      "target": "source-code-repository",
      "description": "Checks for hard-coded values that should be tokens.",
      "metric": "percentageTokenUsage",
      "threshold": 0.90,
      "weight": 0.3
    }
  ],
  "bcsFormula": "BCS = (WCAG-contrast-check-v1.score * 0.7) + (token-coverage-v1.score * 0.3)"
}
```

---
**Document Version**: Gemini v3
**Date**: 2025-11-22
**Purpose**: To provide a concrete, buildable definition of a Minimal Viable ES Package, making the "NOW" phase of the roadmap actionable.
**Related**: `claude-v3-roadmap.md`, `gemini-v3-governance-flow.md`