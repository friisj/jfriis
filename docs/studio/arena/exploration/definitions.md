# Arena - Definitions

> Glossary of terms specific to this project. Maintain as concepts evolve.

---

## Core Terms

| Term | Definition | Example |
|------|-----------|---------|
| **Skill** | The primary trained artifact — a structured specification encoding rules, decisions, constraints, rationale, and exemplars for a specific design dimension. Skills are what agents consume to make design-consistent decisions. | `color-primitives` skill containing palette definitions, color space rules, contrast requirements |
| **Session** | A focused training interaction where user and agent work on a single dimension (or sub-dimension) of the design system, producing reinforced decisions. | 20-minute session refining the typography scale |
| **Reinforcement** | The feedback loop where user responses (approve, reject, modify + reasons) strengthen or adjust the skill's accumulated decisions. | Rejecting a color with reason "too saturated for body text" updates the skill's color rules |
| **Dimension** | A distinct facet of the design system that can be independently trained: color, typography, spacing, components, voice/tone, etc. | Typography is a dimension; type scale is a sub-dimension |
| **Level of Play** | Position in the dependency hierarchy. Lower levels (tokens) must be hardened before higher levels (components) can be meaningfully trained. | Level 1 (primitive tokens) must be stable before Level 3 (component patterns) can begin |
| **Hardened** | A skill status indicating it has been sufficiently reinforced by humans, validated by agent evaluation, and passes automated checks. Hardened skills are stable enough to build upon. | `color-primitives` is hardened after 5 sessions with >90% approval rate and agents consistently applying correct tokens |
| **Derived Artifact** | Any output generated from skills — Tailwind config, CSS custom properties, Figma tokens, npm package. Not edited directly; re-derived when skills change. | `tailwind.config.ts` color section generated from color-primitives skill |
| **Training** | The human-in-the-loop mode where a user shapes skills through structured feedback. The "gym" side of Arena. | User works with agent to establish spacing scale through iterative proposals |
| **Evaluation** | The agent testing mode where Arena gives a coding agent a challenge and evaluates output against trained skills. The "arena" side of Arena. | Agent builds a login form; output checked for token compliance and aesthetic coherence |
| **Feedback Signal** | Any input from the user during a training session: quick action (approve/reject), reason text, visual annotation, or De Bono hat structured feedback. | Red hat: "this feels too cold"; Black hat: "fails contrast at small sizes" |

---

## Feedback Types

| Type | Description | Signal Quality |
|------|------------|---------------|
| **Quick action** | Binary approve/reject/modify | Direction only |
| **Reason** | Free-form text explaining why | Understanding |
| **Visual annotation** | Red pen markup on screenshot, passed via multimodal | Spatial/relational precision |
| **De Bono hat** | Structured feedback using Six Thinking Hats framework | Multi-dimensional assessment |

## De Bono Hats in Arena Context

| Hat | Arena Application |
|-----|------------------|
| **White** | Factual observation — "44px tall, 16px padding, 14px type" |
| **Red** | Gut/aesthetic reaction — "feels too clinical, not warm enough" |
| **Black** | Problems/risks — "won't scale below 320px, fails AA contrast" |
| **Yellow** | What works — "spacing rhythm is consistent with token scale" |
| **Green** | Alternatives — "what if we softened the radius to match brand warmth?" |
| **Blue** | Process/meta — "we should harden color tokens before revisiting this" |

---

## Skill Status Progression

| Status | Meaning |
|--------|---------|
| **Drafting** | Initial decisions being made, high variance in proposals |
| **Reinforcing** | Core direction established, refining through feedback |
| **Hardened** | Human-approved + agent-evaluated + automated checks pass |

---

## Related Concepts

| Concept | Relationship to Arena |
|---------|------|
| RLHF (Reinforcement Learning from Human Feedback) | Arena borrows the interaction pattern — human feedback shapes agent behavior — but applies it to design system creation rather than model training |
| Design Tokens (W3C) | Standard format for Arena's derived token artifacts |
| Tailwind CSS | Primary web framework target for derived theme exports |
| Claude Code Skills | Arena skills may eventually be consumable as Claude Code skill files |

---

*Add terms as they emerge during exploration. Precise definitions prevent confusion in later phases.*
