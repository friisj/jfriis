# Arena Spec: Two-Layer Skill Model — Intent & Theme

> Design evolution captured 2026-03-02.
> Extends `architecture.md` (Skill Model v2) with a clearer separation between qualitative design intent and quantitative token values.

## Problem

The current skill model conflates two fundamentally different concerns:

1. **Design intent** — qualitative philosophy, constraints, principles ("warm palette, high contrast, geometric, dense")
2. **Token values** — quantitative property assignments (`--color-primary: #3b82f6`, `font-size: 1.125rem`)

Storing both in the same `state` object creates friction:
- Token values aren't necessarily derived from skills — they arrive via Figma imports, manual Tailwind config, design token files
- Skills should express *why* and *how*, not enumerate pixel values
- The gym feedback loop conflates two distinct channels: refining design philosophy vs correcting concrete values

## Two-Layer Model

### Layer 1: Skill (Qualitative Intent)

What the design *means*. Philosophy, constraints, relationships, priorities.

A color skill might express:
- "Warm, saturated palette with high surface contrast"
- "Primary and accent should feel energetic, not corporate"
- "Error states use desaturated reds — never alarming"
- "Surfaces progress from warm light to cool dark across elevation"

A typography skill might express:
- "Display type is expressive and tight; body type is neutral and open"
- "Scale follows a musical third ratio — never larger jumps"
- "Monospace reserved for data, never decorative"
- "Line height loosens as size decreases"

Skills contain:
- **Decisions**: named design choices with rationale (qualitative descriptions, not token values)
- **Rules**: must/should/must-not/prefer constraints
- **Exemplars** (future): reference implementations that embody the intent

Skills are what agents consume to make design-consistent decisions. An agent reading the color skill should understand the *aesthetic direction* well enough to make novel decisions (e.g., choosing a chart palette) without needing explicit token values for every scenario.

### Layer 2: Theme (Quantitative Tokens)

What the design *looks like* in code. Concrete values for a specific platform.

A theme is a tokenized implementation of the skill intent for a particular rendering target:
- **Tailwind config** (web) — `colors`, `fontSize`, `spacing`, etc.
- **SwiftUI theme** (iOS) — `Color`, `Font`, `Spacing` definitions
- **Material theme** (Android) — `ColorScheme`, `Typography`, `Shapes`
- **W3C Design Tokens** (platform-agnostic) — standard token format
- **CSS custom properties** — raw variables

Each theme format implements the same skill intent in platform-native terms. A single project may have multiple theme targets.

## Token Sources

Tokens are **not necessarily derived from skills**. They arrive from multiple sources:

| Source | Example | How it enters |
|--------|---------|---------------|
| Figma import | Figma design tokens, style extraction | Automated pipeline |
| Manual config | Hand-edited `tailwind.config.ts` | Direct file editing |
| Design token files | W3C `.tokens.json` | File import |
| AI generation | Foundation → initial token population | Skill generation step |
| Session refinement | Token feedback during gym sessions | Feedback loop |

The project's Tailwind config (or equivalent) can be **managed manually** for fine-tuning. Each skill dimension (color, typography, spacing) refers to **specific slices** of the theme config — the color skill maps to the `colors` section of `tailwind.config.ts`, the typography skill maps to `fontSize`, `fontFamily`, `lineHeight`, etc.

## Gym Feedback Channels

The gym session produces two distinct feedback streams, each reinforcing a different layer:

### Annotations → Skill Refinement (Layer 1)

De Bono hat feedback and visual annotations refine the qualitative skill:

- Red hat: "This feels too corporate" → adjusts the skill's aesthetic direction
- Black hat: "Contrast is too aggressive for long-form reading" → adds a constraint rule
- Green hat: "What if headers had more personality?" → evolves a design decision
- Visual markup: circling a region and noting "this area feels disconnected" → spatial relationship rules

This feedback shapes *intent*. The AI modifies skill decisions and rules. The result is a more articulate expression of design philosophy.

### Token Feedback → Theme Corrections (Layer 2)

Decision-level approve/reject/modify feedback corrects concrete values:

- "Primary color too saturated" → `--color-primary` adjusts in the Tailwind config
- "Body font size too small on mobile" → `fontSize.base` changes
- "Spacing between cards too tight" → `spacing.6` or component gap adjusts

This feedback shapes *values*. The change lands in the theme config. The result is more accurate tokenization.

> **Naming note**: The current "decision feedback" label is misleading since decisions are a skill-layer concept. Consider renaming to **token feedback** or **value feedback** in the UI.

## Multi-Platform Cohesion

The two-layer separation unlocks multi-platform consistency:

```
                    ┌──────────────┐
                    │  Skill Layer │  (qualitative — platform-agnostic)
                    │  "warm, high │
                    │   contrast"  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
     ┌──────────────┐ ┌──────────┐ ┌──────────────┐
     │   Tailwind   │ │  SwiftUI │ │   Material   │
     │    theme     │ │  theme   │ │    theme     │
     └──────────────┘ └──────────┘ └──────────────┘
     (web tokens)      (iOS tokens)  (Android tokens)
```

Same skill intent, different token expressions. Gym sessions reinforce the shared intent layer; token feedback corrects platform-specific values independently.

## Independent Catalogs

Skills and themes are two independent catalogs that compose at the project level. Neither depends on the other for existence:

- **Skill templates** (`arena_skills` with `is_template = true`) — design philosophy archetypes. No token values.
- **Theme templates** (`arena_themes` with `is_template = true`, both `project_id` and `skill_id` null) — reusable token sets. No skill association required.

A project draws from both catalogs during setup: it clones a skill template for qualitative intent, and optionally selects a theme template for initial token values. The two catalogs evolve independently.

### Promotion Loop

Refined project artifacts can decompose back into catalog entries:

1. A project refines its color skill through gym sessions → the mature skill can be promoted to a new skill template
2. A project fine-tunes its theme tokens through manual editing → the polished tokens can be saved as a new theme template
3. Future projects can select either or both, mixing skill philosophy from one source with token values from another

This creates a flywheel: projects consume catalog entries, refine them, and contribute improved versions back.

## Validation: Skill–Theme Agreement

With skills and themes as separate layers, we can test whether they agree:

- **Token compliance**: Do the theme's concrete values satisfy the skill's rules? ("must have AA contrast" → check computed contrast ratios)
- **Intent alignment**: Does the rendered output *feel* like what the skill describes? (AI evaluation comparing rendered components against skill language)
- **Cross-dimension coherence**: Do the theme values across dimensions form a consistent system? (spacing rhythm matches type scale, color semantics align with component patterns)

Validation tools can flag disagreements:
- "Skill says 'never alarming reds' but `--color-error` is `#dc2626` (bright red)"
- "Skill says 'tight display type' but `letterSpacing.tight` is only `-0.01em`"
- "Typography token scale doesn't follow the stated musical-third ratio"

This creates a **continuous agreement check** between qualitative intent and quantitative implementation.

## Dimension → Theme Config Mapping

Each skill dimension maps to specific slices of the theme configuration:

| Dimension | Tailwind config sections | SwiftUI equivalent |
|-----------|------------------------|-------------------|
| color | `colors`, `backgroundColor`, `textColor`, `borderColor` | `Color`, `ShapeStyle` |
| typography | `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing` | `Font`, `DynamicTypeSize` |
| spacing | `spacing`, `borderRadius`, `screens`, `maxWidth` | `EdgeInsets`, `CornerRadius` |
| motion (future) | `transitionDuration`, `transitionTimingFunction`, `animation` | `Animation`, `Transaction` |

The mapping is explicit — when a typography skill session produces token feedback, the system knows exactly which Tailwind config keys to update.

## Template Library Reframe

With this model, skill templates become **design philosophy archetypes** rather than token catalogs:

- A "Brutalist Color" template expresses raw, high-contrast, minimal-palette intent — not hex values
- A "Swiss Typography" template expresses grid-aligned, rational-scale, neutral-face intent — not font sizes
- Templates seed the qualitative layer; token population happens separately via inputs, generation, or manual config

The templates page becomes a **library of design philosophies** that users browse, clone, and refine through gym sessions.

## Impact on Current Implementation

### Immediate (no code changes needed)

- Reframe how we think about skill `state` content — decisions should trend toward qualitative descriptions
- Seed templates should express philosophy, not enumerate values
- Annotations in gym sessions already serve the skill-refinement channel

### Near-term

- Rename "decision feedback" to "token feedback" or "value feedback" in UI
- Separate theme config storage from skill state (new `arena_project_themes` table or file references)
- Add dimension → config-section mapping metadata

### Future

- Multi-platform theme targets per project
- Skill–theme validation tooling
- AI-assisted token generation from skill intent + inputs
- Theme diffing across platforms (e.g., web vs iOS token equivalence)

## Open Questions

- **Theme storage**: DB table (`arena_project_themes`) vs file reference (path to `tailwind.config.ts`)? File reference keeps the config editable in IDE.
- **Validation granularity**: Per-decision validation vs whole-dimension scoring?
- **Template philosophy format**: Free-form prose vs structured decisions-with-rationale?
- **Token feedback scope**: Per-token corrections vs "regenerate this section from updated skill"?
