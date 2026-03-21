# Bug - Definitions

> Glossary of terms specific to this project. Maintain as concepts evolve.

---

## Core Terms

| Term | Definition | Example |
|------|-----------|---------|
| Entity | A tracked public figure or organization | "Elon Musk", "OpenAI" |
| Group | A collection of related entities for batch analysis | "AI Lab CEOs", "Canadian Cabinet" |
| Source | A data feed that can be monitored for entity mentions | RSS feed, Twitter/X API, news API |
| Bug | A configured monitoring link between an entity and a source | "Monitor @elonmusk on X" |
| Fetch | A single retrieval operation from a source | Pulling latest tweets, scraping an article |
| Position | An inferred stance on a topic, derived from aggregated content | "Supportive of AI regulation (moderate confidence)" |
| Insight | A synthesized finding from analysis of fetched content | "Shift in tone on regulation since Q3" |

---

## Related Concepts

| Concept | Relationship to This Project |
|---------|------------------------------|
| OSINT (Open Source Intelligence) | Bug operates in the OSINT domain — public sources only |
| Media Monitoring | Traditional industry that Bug augments with AI inference |
| Entity Resolution | Core technical challenge — matching mentions across sources |
| Sentiment Analysis | Subset of Bug's analysis — position inference goes deeper |
| Knowledge Graphs | Potential data structure for entity-topic-position relationships |

---

*Add terms as they emerge during exploration. Precise definitions prevent confusion in later phases.*
