# Arena - Initial Research

> Landscape survey and foundational research for the project.

---

## Problem Space

Design systems face a fundamental tension: they need to be opinionated enough to ensure consistency, but flexible enough to reflect a team's unique aesthetic intent. Current approaches fall into two camps:

1. **Predefined systems** (Material, Ant, Chakra) — comprehensive but generic. Teams adopt them wholesale and then fight the defaults to express their identity.
2. **Bespoke systems** — fully custom but expensive. Requires dedicated design system teams, extensive documentation, and ongoing maintenance.

Neither approach works well for the emerging workflow where coding agents are primary implementers. Agents need explicit, structured design guidance — not a PDF brand guide or a Figma file, but machine-readable specifications they can reliably execute against.

## The Agent Gap

Coding agents (Claude, Cursor, Copilot) are increasingly capable at building UI, but they produce inconsistent output unless given very detailed instructions about design decisions. Common failure modes:

- Defaulting to generic Tailwind utilities with no design coherence
- Inventing colors, spacing, and typography that don't match any system
- Inconsistent application of the same token across components
- No awareness of cross-dimension relationships (color ↔ typography ↔ spacing)

Agent skills (structured instruction sets) are the right format, but no tool exists for creating them through iterative refinement.

## Prior Art

| Approach | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| **Tailwind CSS** | Utility-first, configurable theme | Config is static, no training loop | Primary export target |
| **Style Dictionary** | Token transformation pipeline | No creation workflow, just transforms | Potential export integration |
| **Figma Variables** | Visual design token management | Designer-centric, no agent skills output | Potential export target |
| **W3C Design Tokens** | Standard format, cross-platform | Spec only, no creation tool | Token format standard |
| **v0.dev / bolt.new** | AI-generated UI from prompts | One-shot, no accumulated system, no reinforcement | Contrasting approach — Arena is the opposite |
| **RLHF (ML technique)** | Proven for aligning AI to human preferences | Applied to model weights, not structured specs | Interaction pattern inspiration |
| **Design Lint tools** (Figma plugins, Stylelint) | Automated consistency checking | Post-hoc enforcement, no training | Potential evaluation mechanism |

## Key Questions

1. **What's the minimal skill data model?** What fields and structure make a skill useful to an agent while remaining human-readable?
2. **How granular should sessions be?** Is "color" the right unit, or should it be "color space selection" then "primary hue" then "palette derivation"?
3. **How do we measure skill quality?** Beyond human approval — what automated checks can validate a skill?
4. **What's the relationship between skills and Claude Code skill files?** Can Arena skills literally be `.md` files in `.claude/skills/`?
5. **How does the dependency hierarchy enforce itself?** Hard gates (can't start L3 until L1/L2 hardened) or soft guidance (warnings)?
6. **What does the evaluation protocol look like?** How do we generate challenges, evaluate output, and feed results back?

## Initial Findings

*Populated as research progresses.*

---

*This document captures the initial research phase. Update as exploration proceeds.*
