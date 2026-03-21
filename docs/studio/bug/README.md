# Bug

> AI-augmented intelligence tool for tracking public figures and organizations

## Status

- **Phase:** Exploration
- **Temperature:** Warm
- **Started:** 2026-03-21

## Overview

Bug is an AI-augmented intelligence gathering tool that tracks public figures and organizations across news, social media, and other data sources. It catalogs related content and uses AI analysis pipelines to extrapolate or infer positions on topics, surface insights, answer questions, and generate structured data.

The system comprises several key components: entity management for individuals and organizations, grouping mechanisms for related entities, modular source connectors for different data feeds, fetch orchestration that decides which sources to "bug" for which entities, a collation and ranking engine for incoming data, and AI analysis tools that process fetched content to yield actionable intelligence.

The name "Bug" plays on the surveillance/wiretapping metaphor — you're "bugging" public sources to build an intelligence picture.

## Hypotheses

- **H1:** If we build modular source connectors with a unified entity model, we can reliably aggregate and cross-reference public statements, news, and social posts to infer an entity's position on a given topic
  - **Validation:** System can ingest from at least 3 different source types, resolve entities across them, and produce a position summary with citations that a human reviewer rates as accurate

## Key Components

| Component | Purpose |
|-----------|---------|
| Entity Management | CRUD for individuals, organizations, and groups |
| Source Connectors | Modular adapters for RSS, social APIs, web scraping |
| Bug Configuration | Which sources to monitor for which entities |
| Fetch Orchestration | Scheduling, rate limiting, deduplication |
| Collation & Ranking | Sorting, relevance scoring, recency weighting |
| Analysis Pipeline | AI tools for position inference, summarization, Q&A |

## Project Structure

### Documentation
- `/docs/studio/bug/README.md` - This file
- `/docs/studio/bug/exploration/` - Research and conceptual docs
- `/docs/studio/bug/exploration/definitions.md` - Glossary
- `/docs/studio/bug/exploration/research.md` - Initial research

### Code (when prototype phase begins)
- `/components/studio/prototypes/bug/` - Prototype components

## Relationship to Lens

Bug and Lens (civic accountability platform) share conceptual DNA — both track entities, aggregate news, and infer positions. They are separate projects:
- **Bug** is general-purpose: any public figure or organization, any topic domain
- **Lens** is civic-specific: Canadian representatives, legislative accountability, democratic transparency

They may share architectural patterns or infrastructure in the future but operate independently.

## Next Steps

1. Complete initial research and exploration
2. Define key terms and concepts (entity model, source connector interface)
3. Survey existing tools in the OSINT / media monitoring space
4. Validate H1 with a minimal source connector + entity resolution prototype
5. Design the "bug configuration" model — how users decide what to monitor

---

**Started:** 2026-03-21
**Status:** Exploration
