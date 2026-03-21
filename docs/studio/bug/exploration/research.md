# Bug - Initial Research

> Landscape survey and foundational research for the project.

---

## Problem Space

Keeping up with what public figures and organizations think, say, and do requires monitoring fragmented sources — news outlets, social media, press releases, podcasts, interviews, legislative records. No unified tool aggregates across these sources and uses AI to synthesize positions, track stance evolution, and answer questions about entities.

Current approaches are either:
- **Manual**: Analysts curate feeds and write reports (expensive, slow, doesn't scale)
- **Keyword-based**: Google Alerts, Mention.com — surface matches but no inference or synthesis
- **Domain-specific**: Tools like Civic (political), Brandwatch (brand sentiment) — locked to one vertical

Bug aims to be a general-purpose entity intelligence platform that works across domains.

## Prior Art

| Approach | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| Google Alerts | Free, broad reach | No synthesis, keyword-only, noisy | Baseline — Bug should exceed this substantially |
| Brandwatch / Meltwater | Professional media monitoring, sentiment | Expensive, brand-focused, limited inference | Enterprise competitors — Bug targets individual users |
| Perplexity / ChatGPT | Can answer "what does X think about Y" | No persistent tracking, no source management, ephemeral | AI baseline — Bug adds persistence and source control |
| Feedly / Inoreader | Good RSS aggregation, some AI features | No entity model, no cross-source inference | Feed infrastructure — Bug could use similar ingestion |
| Recorded Future / Palantir | Sophisticated OSINT, entity resolution | Enterprise-only, expensive, opaque | High-end reference — Bug is lighter weight |

## Key Questions

1. What's the minimum viable entity model? (name, aliases, type, topics of interest?)
2. How do source connectors handle rate limiting, authentication, and format variance?
3. What's the right granularity for position inference — per-article, per-week, cumulative?
4. How to handle confidence and citation — avoiding hallucinated positions?
5. What's the interaction model — dashboard, chat, alerts, reports?
6. How to handle entity resolution across sources with different naming conventions?

## Initial Findings

<Populated as research progresses>

---

*This document captures the initial research phase. Update as exploration proceeds.*
