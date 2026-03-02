# Arena Architecture — Skill Model v2

> Resolved through collaborative design session, 2026-03-01.
> Supersedes the flat `source`-based skill model from the initial spike.

## End State

After *n* sessions, a project's assembly of dimension skills — plus derived assets (Tailwind theme, CSS variables, etc.) — satisfies user standards for reliable UI generation by coding agents.

## Core Entities

### Substrate

An aesthetic archetype chosen at project creation. Influences how inputs are interpreted during foundation generation. Not a skill — a project-level setting.

Examples: `minimal`, `brutalist`, `maximalist`, `organic`, `corporate`

Stored as: `arena_projects.substrate` (string)

### Inputs

Raw materials the user provides. Each input type has a specialized extraction pipeline.

| Input type | Extraction | What it yields |
|-----------|-----------|----------------|
| Figma file | API parse + token inference | Colors, type styles, spacing, component patterns |
| Images | Vision model analysis | Color mood, contrast tendencies, aesthetic feel |
| Font files | Selection + metadata | Typography decisions (families, weights, styles) |
| Reference URLs | Scrape + analysis | Competitive patterns, layout conventions |
| Survey responses | Structured questionnaire | Gap-filling for missing input coverage (future) |

New input types can be added without structural changes — each is an extraction pipeline that feeds the foundation.

Stored as: `arena_projects.inputs` (JSONB)

### Foundation (Brief)

Generated from substrate + input analysis. A project-level document — NOT a skill.

The foundation serves three purposes:

1. **Design intent** — cross-dimensional principles derived from the substrate and inputs ("high contrast, raw surfaces, heavy type, monochrome dominant")
2. **Sufficiency report** — gaps between project config demands and input coverage ("config requires advanced typography but no font files provided — need font selection or Figma with type styles")
3. **AI context** — read by the AI during skill generation and session refinement as persistent guardrails

The foundation does NOT own competing state. Dimension skills are the source of truth for concrete decisions. The foundation provides the "why" — the skills contain the "what."

Stored as: `arena_projects.foundation` (JSONB — structured with `intent`, `gaps`, `generated_at`)

#### Foundation Generation Feedback Loop

```
1. User sets project config (dimensions + scope per dimension)
2. User provides inputs
3. Foundation generation runs (substrate + inputs → AI)
4. Foundation flags gaps: "config demands X, inputs support Y"
5. User either:
   a. Provides more inputs → re-run generation
   b. Adjusts dimension scope → re-run generation
   c. Fills gaps manually → proceed
   d. Uses survey tool to fill gaps interactively (future)
6. Foundation complete → generate dimension skills
```

### Project Config

User-specified parametric configuration. Determines which dimensions the project includes and the scope (complexity level) of each.

```jsonc
{
  "substrate": "brutalist",
  "dimensions": {
    "color": { "scope": "advanced" },      // surfaces, states, semantics
    "typography": { "scope": "advanced" },  // fluid scale, optical sizing
    "spacing": { "scope": "basic" }         // padding, gap, radius
    // "motion": { "scope": "basic" }       // future
    // "copy": { "scope": "basic" }         // future
  }
}
```

The config dials determine how much of each dimension's template is used during skill generation. The user controls scope explicitly — the AI does not decide what to include or prune.

Stored as: fields on `arena_projects` (`substrate`, `config` JSONB)

### Skill Templates (Catalog)

One exhaustive template per dimension. Defines all possible decisions for that dimension — the full structural scaffold.

Templates vary only by **dimension**, not by aesthetic direction or complexity. They are the superset. The project config's scope setting determines how much of the template is populated during generation.

| Dimension | Example decisions (non-exhaustive) |
|-----------|-----------------------------------|
| color | primary, accent, background, text, muted, border, surface-1/2/3, state-success/warning/error/info, semantic-link/focus/disabled |
| typography | display/body/mono fonts, heading/body/small sizes, weights, line heights, letter spacing, fluid scale, optical sizing |
| spacing | padding, gap, border-radius, container widths, vertical rhythm, breakpoints |
| motion (future) | duration scale, easing curves, enter/exit patterns, reduced-motion rules |
| copy (future) | voice attributes, tone scale, formality level, terminology rules |

Templates are skill records with `is_template: true`, no `project_id`.

The catalog evolves in one place — when new decisions are added to a dimension template, every future project can use them. Existing projects are unaffected (their config already scoped what they need).

### Dimension Skills (Assembly)

The working artifacts. One per dimension per project, composed into an assembly.

**Lifecycle:**

```
Template (exhaustive)
  → clone to project
  → foundation populates values (scoped by config)
  → session refines
  → session refines
  → ...
  → mature skill ready for export
```

**Tiers** (replaces the old `source` field):

| Tier | Meaning | project_id | parent_skill_id |
|------|---------|-----------|-----------------|
| `template` | Exhaustive structural scaffold | null | null |
| `project` | Foundation-populated, config-scoped | required | → template |
| `refined` | Session output | required | → previous skill |

**Assembly**: `arena_project_assembly` maps `(project_id, dimension) → skill_id`. The active skill per dimension is always the most recently accepted refinement (or the initial project skill if no sessions have run).

### Sessions

Focused refinement targeting one dimension skill. The AI receives:
- The foundation (design intent + cross-dimensional context)
- All current dimension skills (for cross-dimensional awareness)
- The target dimension skill (for focused modification)

Human feedback reinforces specific decisions. The AI modifies only the target dimension. Accepting a refinement creates a new `refined` tier skill that replaces the previous in the assembly.

### Test Components

Canonical UI components (cards, forms, dashboards, etc.) used to preview how the assembly renders. Selected per-session from a registry. The gym renders these with the current skill assembly to give concrete visual feedback.

## Data Model Changes (from current)

### `arena_projects` — new/modified fields

| Field | Type | Notes |
|-------|------|-------|
| `substrate` | `text` | Aesthetic archetype (new) |
| `foundation` | `jsonb` | Generated brief — intent, gaps, timestamp (new) |
| `config` | `jsonb` | Dimensions + scope per dimension (new) |
| `inputs` | `jsonb` | Already exists — unchanged |

### `arena_skills` — modified fields

| Field | Change |
|-------|--------|
| `source` | Renamed to `tier` — values: `template`, `project`, `refined` |
| `dimension` | No longer constrained to 3 — open `text` field |
| `input_type` | Removed (input skills deferred — extraction pipelines are future work) |

### `arena_project_assembly` — unchanged

Already supports the model: `(project_id, dimension) → skill_id`.

`dimension` column becomes open `text` to match `arena_skills.dimension`.

### Removed concepts

- `source: 'figma' | 'manual' | 'refined' | 'base'` — replaced by `tier`
- `source: 'base'` seeds — replaced by exhaustive templates
- Input skills as DB records — deferred until extraction pipelines exist

## Flows

### Project Setup

```
1. Create project
2. Choose substrate ("brutalist")
3. Configure dimensions + scope
4. Add inputs (Figma, images, fonts, URLs)
5. Generate foundation
   → AI analyzes inputs through substrate lens
   → Produces design intent + sufficiency report
6. Review foundation
   → If gaps: add inputs, adjust scope, fill manually, or survey (future)
   → Re-generate until sufficient
7. Generate dimension skills
   → Clone templates
   → Foundation populates values (scoped by config)
   → Skills appear in assembly
```

### Refinement Session

```
1. Select dimension to refine
2. Select test components for preview
3. Gym renders components with current assembly
4. Human reviews, provides feedback (approve/adjust/flag per decision)
5. AI refines target dimension skill
   Context: foundation + all dimension skills
   Constraint: modify only target dimension
6. Review refined output
7. Accept → new refined skill replaces previous in assembly
   OR reject → try again / abandon
```

### Export (future)

```
Assembly → derive:
  - Tailwind theme config
  - CSS custom properties
  - W3C design tokens
  - Agent skill files (structured specs for Claude/Cursor/etc.)
```

## Open Questions

- **Substrate catalog**: ship a fixed set or allow custom free-text?
- **Scope levels**: how granular? (basic/advanced, or a numeric scale, or per-decision toggles?)
- **Foundation regeneration**: when inputs change, regenerate foundation? What happens to already-refined skills?
- **Cross-dimension sessions**: will there ever be sessions that refine multiple dimensions simultaneously?
- **Survey tool**: structured questionnaire UX for gap-filling — scope and priority TBD
