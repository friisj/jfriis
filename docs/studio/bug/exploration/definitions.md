# Bug - Definitions

> Glossary of terms specific to this project. Maintain as concepts evolve.

---

## Core Terms

| Term | Definition | Example |
|------|-----------|---------|
| Entity | A tracked public figure or organization with a canonical identity | "Elon Musk" (Q317521), "OpenAI" |
| Alias | An alternate name, handle, or spelling for an entity | "Musk", "@elonmusk", "Tesla CEO" |
| Group | A collection of related entities for batch analysis | "AI Lab CEOs", "Canadian Cabinet" |
| Topic | A subject area tracked for position inference | "AI regulation", "carbon tax policy" |
| Source | A data feed that can be monitored for entity mentions | RSS feed, Bluesky firehose, GNews API |
| Source Connector | A modular adapter that knows how to fetch and normalize data from a specific source type | `BlueskyConnector`, `GNewsConnector` |
| Bug | A configured monitoring link between an entity and a source — the act of "bugging" someone | "Monitor @elonmusk on Bluesky" |
| Fetch | A single retrieval operation from a source, producing raw content items | Pulling latest posts, querying a news API |
| Content Item | A normalized unit of ingested content (article, post, transcript) with metadata | An article with title, body, date, source URL, author |
| Stance | A for/against/neutral classification toward a specific target in a single piece of content | "Against carbon taxes" in one article |
| Position | An inferred belief on a topic, aggregated from multiple stance signals over time with confidence | "Consistently opposes carbon taxes (high confidence, 12 citations)" |
| Attribution Tier | The confidence level based on how directly a statement can be attributed to an entity | Direct quote > paraphrase > characterization > inference from actions |
| Insight | A synthesized finding from cross-entity or temporal analysis | "Shift in tone on regulation since Q3", "Group divergence on AI safety" |

---

## Technical Terms

| Term | Definition | Context |
|------|-----------|---------|
| Entity Resolution | The process of matching mentions across sources to a canonical entity | spaCy NER + Entity Linker → Wikidata QID |
| NER (Named Entity Recognition) | ML-based extraction of person/org/location names from text | spaCy, Hugging Face transformers |
| Entity Linking | Mapping an extracted name to a knowledge base entry | "Musk" → Wikidata Q317521 |
| Stance Detection | Classifying a piece of content as for/against/neutral toward a target | Zero-shot LLM prompting or fine-tuned models |
| Embedding | A vector representation of text used for semantic similarity | OpenAI text-embedding-3-small |
| Topic Matching | Using embedding cosine similarity to determine if content relates to a tracked topic | Content embedding vs. topic embedding > 0.75 threshold |

---

## Related Concepts

| Concept | Relationship to This Project |
|---------|------------------------------|
| OSINT (Open Source Intelligence) | Bug operates in the OSINT domain — public sources only |
| Media Monitoring | Traditional industry (Meltwater, Brandwatch) that Bug augments with AI inference at individual-user pricing |
| Sentiment Analysis | Simpler than stance detection — positive/negative tone without target-specific classification |
| Knowledge Graphs | Potential data structure for entity-topic-position relationships (Wikidata as external reference) |
| Perplexity Sonar | AI search API that could serve as an enrichment tool within Bug's pipeline |

---

## Key Distinctions

**Sentiment vs. Stance vs. Position:**
- **Sentiment**: Emotional tone of text (positive/negative/neutral). Well-solved problem.
- **Stance**: For/against/neutral toward a *specific target* in a *single document*. Active research area.
- **Position**: Aggregated belief on a topic derived from *multiple stance signals over time* with citations and confidence. Bug's core output — a step beyond what existing tools do.

**Bug vs. Alert vs. Feed:**
- **Alert** (Google Alerts): Keyword match → email notification. No intelligence.
- **Feed** (Feedly): Curated sources → reading list. Some AI classification.
- **Bug**: Entity-aware source monitoring → AI stance detection → position inference with citations. Intelligence product.

---

*Maintain as concepts evolve. Precise definitions prevent confusion in later phases.*
