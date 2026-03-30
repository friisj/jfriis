# Pulse

> Workplace knowledge reinforcement through contextual quizzes generated from corporate tools.

## Status

- **Phase:** Exploration
- **Temperature:** Warm
- **Started:** 2026-03-30

## Overview

Pulse is a service that plugs into the tools teams already use — Slack, Notion, Linear, HR systems, wikis — and generates contextual quizzes that reinforce institutional knowledge. Instead of relying on employees to passively absorb documentation and announcements, Pulse creates recurring, lightweight quiz experiences that surface what matters.

The service operates at two levels: **individual** (spaced-repetition learning tracks, personal results, knowledge gaps) and **organizational** (onboarding quiz generation, weekly team quizzes, leaderboards, knowledge health metrics). The core bet is that active recall from real corporate context beats passive documentation for knowledge retention.

Key use cases: onboarding orientation (learn the company by being quizzed on it), weekly pulse checks (stay current on strategy, decisions, process changes), and self-directed reinforcement (individuals drilling on areas where they're weak).

## Hypotheses

- **H1:** If we generate contextual quizzes from existing corporate tools (Slack, Notion, etc.), employees will retain more institutional knowledge than through passive documentation alone
  - **Validation:** Users who take weekly quizzes score higher on knowledge checks about recent company decisions, processes, and strategy

## Project Structure

### Documentation
- `/docs/studio/pulse/README.md` - This file
- `/docs/studio/pulse/exploration/` - Research and conceptual docs
- `/docs/studio/pulse/exploration/definitions.md` - Glossary
- `/docs/studio/pulse/exploration/research.md` - Landscape research

### Code (when prototype phase begins)
- `/components/studio/prototypes/pulse/` - Prototype components

## Next Steps

1. Complete initial research — spaced repetition landscape, corporate learning tools
2. Define key terms (quiz types, context sources, reinforcement modes)
3. Map the integration surface (what can be pulled from Slack/Notion/Linear/etc.)
4. Design the quiz generation pipeline (context ingestion -> question generation -> delivery)
5. Validate H1 through first prototype

---

**Started:** 2026-03-30
**Status:** Exploration
