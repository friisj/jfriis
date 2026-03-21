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

---

## Initial Findings

*Research conducted 2026-03-21. Covers tools, APIs, entity resolution, stance detection, and architecture patterns.*

### 1. Existing Tools & Platforms

#### Free / Indie Tier

| Tool | What It Does | Limitations | Bug Relevance |
|------|-------------|-------------|---------------|
| **Google Alerts** | Email alerts for keyword mentions across Google-indexed web | Keyword-only, no synthesis, unreliable coverage, no social media | Baseline to beat. Bug should exceed this substantially |
| **Talkwalker Alerts** | Free alternative to Google Alerts; covers news, blogs, forums, and Twitter/X. Delivers via email, Slack, or RSS | No analytics, no entity model, no team workflows | Good free signal source. Could serve as a cheap input channel early on |
| **Alertmouse** | Launched late 2025 by Rand Fishkin. Better Google Alerts — broader coverage, smarter filtering | New, unclear API/programmatic access | Watch for API access; conceptually aligned with Bug's goals |
| **F5Bot** | Free Reddit keyword monitoring via email | Reddit-only, keyword-only | Narrow but useful for Reddit signal |

#### Mid-Market ($100-$1,000+/month)

| Tool | Pricing | Key Capabilities | Bug Relevance |
|------|---------|-------------------|---------------|
| **Mention** | ~$41/month starter | 1B+ web and social sources. Online press, blogs, forums, social media, review sites | Good feature reference. Bug's source breadth should approach this |
| **Brand24** | ~$79/month starter | Social listening + sentiment analysis, real-time alerts | Sentiment analysis as feature reference |
| **Sprout Social** | ~$199/month | Social management + listening, engagement tools | More social management than intelligence — different use case |
| **Feedly Pro+** | ~$18/month (Pro), higher for Pro+ | Leo AI assistant filters/classifies/summarizes. Tracks topics across news, blogs, Twitter, Reddit, newsletters. Business Event AI Models track funding, partnerships, leadership changes | Closest conceptual match for RSS ingestion layer. Leo's AI classification is a direct reference for Bug's analysis pipeline |
| **Inoreader** | Free tier + paid plans | RSS reader with rules, filters, keyword monitoring | Useful as RSS infrastructure reference |

#### Enterprise ($10K+/year)

| Tool | Focus | Key Capabilities | Bug Relevance |
|------|-------|-------------------|---------------|
| **Meltwater** | Global media intelligence | 300K+ sources, 200+ languages, Boolean search, print/broadcast/digital. Quote-based pricing ($10K+/year) | Gold standard for breadth. Bug won't match source count but can match on inference quality |
| **Brandwatch** | Social intelligence | Hundreds of millions of social posts, Iris AI for pattern detection, customizable dashboards | AI pattern detection is a direct reference for Bug's analysis |
| **CisionOne** | PR/comms monitoring | Media database, journalist contacts, coverage reports | PR-focused, less relevant |
| **Signal AI** | Narrative tracking | Connects dots across global media, catches narrative shifts early | Narrative shift detection is directly relevant to stance tracking |
| **PeakMetrics** | Narrative intelligence | 1.5M+ sources including fringe platforms (TikTok, Telegram, Discord). Groups mentions into narrative threads, flags bot activity, NewsGuard credibility ratings | Narrative threading and credibility scoring are high-value features for Bug |

#### OSINT / Intelligence

| Tool | Type | Key Capabilities | Bug Relevance |
|------|------|-------------------|---------------|
| **Maltego** | Commercial (free Community Edition) | Graphical link analysis, entity relationship visualization, extensive third-party API integrations | Entity relationship mapping is a core Bug need. Maltego's transform architecture (modular data enrichment) is a design reference |
| **SpiderFoot** | Open source | 200+ modules, 100+ public sources, cross-correlation, data visualization. Tracks orgs, domains, IPs, emails, usernames | Module architecture is a reference for Bug's source connectors |
| **Recon-ng** | Open source CLI | OSINT from databases, IPs, DNS, search engines | More infosec-focused, less directly relevant |
| **Intelligence X** | Freemium | Dark web, leaked credentials, deactivated webpages, Tor/I2P | Edge case — potentially useful for comprehensive entity profiles |
| **Lampyre** | Commercial | Real-time intelligence, AI-driven automation | Modern OSINT reference |
| **OSINT Framework** | Free directory | Catalog of 500+ free tools organized by focus | Useful resource for discovering additional sources |

#### AI-Native Search

| Tool | Access Model | Key Capabilities | Bug Relevance |
|------|-------------|-------------------|---------------|
| **Perplexity Sonar API** | Pay-per-use. Sonar: $1/$1 per M input/output tokens. Sonar Pro: $3/$15. Search API: $5/1K requests | Programmatic web search with synthesized answers. Citation tokens free on standard models as of 2026 | Could serve as a research/enrichment tool within Bug's pipeline — ask "what does X think about Y" programmatically with citations |
| **ChatGPT browsing** | Via OpenAI API with web search tool | Can search and synthesize, but no persistent tracking | Same as Perplexity — useful for on-demand enrichment, not continuous monitoring |
| **Grok (X)** | Bundled with X Premium | Real-time X/Twitter integration, can search posts | Locked to X ecosystem, no API for external use currently |

### 2. Available APIs & Data Sources

#### News APIs

| API | Free Tier | Paid Pricing | Coverage | Rate Limits | Notes |
|-----|-----------|-------------|----------|-------------|-------|
| **NewsAPI.org** | Dev only (localhost) | From $449/month | 150K+ sources, 70+ countries | Varies by plan | Most popular but expensive. Free tier useless for production |
| **GNews** | 100 req/day | From $84/month | Google News aggregation | 1 req/sec on free | Lower cost entry point. Good for prototyping |
| **MediaStack** | 500 req/month | From $24.99/month | 7,500+ sources | Varies by plan | Cheapest entry point for news data |
| **NewsAPI.ai** | 2,000 searches, 200K articles (30 days) | Token-based scaling | 150K+ sources | Token-based | Free tier is generous for prototyping. Token model scales well |
| **Newsdata.io** | 200 credits/day | From $59/month | 80K+ sources | Credit-based | Good for small-scale monitoring |
| **Bing News API** | Via Azure free tier | ~$25/1K transactions (S1) | Microsoft news index | Tiered | Pay-per-use scales well. Lower cost at volume ($15-18/1K at S2-S5) |
| **Google News RSS** | Free | Free | Google News results | Undocumented, subject to blocking | Fragile but free. Use as supplementary source, not primary |

**Recommendation for Bug prototype:** Start with GNews (100 free req/day) or NewsAPI.ai (generous free tier) for prototyping. Graduate to Bing News API or NewsAPI.org for production based on volume needs.

#### Social Media APIs

| Platform | Access Model | Pricing | Key Constraints | Bug Relevance |
|----------|-------------|---------|-----------------|---------------|
| **X/Twitter** | Pay-per-use (as of Feb 2026, replacing fixed tiers) | Old tiers: Free (1 req/15min), Basic ($100/mo, 10K tweets), Pro ($5K/mo), Enterprise ($42K+/mo). New: pay-per-use in closed beta with $500 voucher | Academic access effectively dead. Free tier nearly useless. Historical archive requires Pro+ | Critical source but prohibitively expensive. Consider third-party alternatives (see below) |
| **Reddit** | Free tier + commercial | Free: 100 req/min (non-commercial). Commercial: $12K/year base (100 RPM), scales to $60K+ | Terms restrict competitive intelligence and data reselling. Moderator/bot use remains free | Free tier viable for prototype. Commercial terms may conflict with intelligence use case |
| **YouTube Data API** | Free via Google Cloud | 10,000 units/day free | Unit costs vary by endpoint (search = 100 units, so ~100 searches/day) | Good for tracking video content, interviews, press conferences |
| **Bluesky / AT Protocol** | Free, no auth required | Free | No rate limit documentation (reasonable use expected). Firehose streams entire network in real-time | Best social API deal available. No auth needed. Jetstream provides simplified JSON WebSocket access. Excellent for prototype |
| **Mastodon** | Free, per-instance | Free | Federated — must connect to individual instances or use relay | Moderate effort for moderate signal |

**Third-party X/Twitter alternatives:** Services like Netrows, Xpoz, and SociaVault offer alternative access to X data at lower cost than the official API. Legality and longevity vary.

**Recommendation for Bug prototype:** Start with Bluesky firehose (free, easy) and Reddit free tier. Defer X/Twitter until budget justifies it or a viable alternative emerges.

#### Government & Public Records

| Source | Access | Coverage | Notes |
|--------|--------|----------|-------|
| **OpenSecrets** | API discontinued April 2025. Bulk CSV downloads still available | US campaign finance, lobbying, political influence | Must download and index bulk data rather than query live. Contact data@opensecrets.org for custom solutions |
| **ProPublica Congress API** | Free | US Congress members, bills, votes, statements | Good for US political entity tracking |
| **GovTrack** | Free API + bulk data | US Congress legislation, voting records | Complementary to ProPublica |
| **UK Parliament API** | Free | UK parliamentary data, debates (Hansard), voting records | Good for UK political entity tracking |
| **Open States** | Free | US state-level legislative data | Extends coverage beyond federal |
| **Court Listener / PACER** | Free / per-page fees | US federal court records | Useful for litigation tracking on entities |

**Recommendation:** Government APIs are free and high-quality but US/UK-centric. Good for political entity tracking vertical. Bulk data approach (download, index, search) works better than live API queries for most of these.

#### Web Scraping Considerations

| Aspect | Reality |
|--------|---------|
| **Legal** | Varies by jurisdiction. US: *hiQ v. LinkedIn* (2022) established that scraping publicly available data is generally not a CFAA violation. EU: GDPR applies to personal data regardless of public availability. Terms of service violations are a civil (not criminal) matter in most jurisdictions |
| **Ethical** | Respect robots.txt, rate limit aggressively, don't scrape behind auth walls, attribute sources |
| **Technical** | Modern anti-scraping (Cloudflare, DataDome) makes reliable scraping expensive. Headless browsers (Playwright, Puppeteer) needed for JS-rendered content. Proxy rotation for scale |
| **Services** | ScrapingBee, Bright Data, Apify — managed scraping infrastructure. $50-500+/month |
| **Recommendation** | Use APIs where available. Scrape only for sources with no API and clear public interest justification (e.g., politician's public statements page). Document rationale for each scraping target |

### 3. Entity Resolution Approaches

#### Named Entity Recognition (NER)

| Tool/Library | Language | Key Features | Bug Relevance |
|-------------|----------|-------------|---------------|
| **spaCy** | Python | Production-grade NER pipeline. Pre-trained models for 25+ languages. Entity types: PERSON, ORG, GPE, etc. | Primary NER choice. Mature, fast, well-documented |
| **Hugging Face Transformers** | Python | State-of-the-art transformer NER models (BERT, RoBERTa, DeBERTa). Token classification pipelines | Higher accuracy than spaCy for complex cases. Use for fine-tuning on domain-specific entities |
| **Google Cloud NL API** | REST API | Entity analysis with salience scoring, Wikipedia links | Managed service, good for quick integration. Pay-per-use |
| **AWS Comprehend** | REST API | NER + sentiment + key phrases | Similar to Google, managed service |

#### Entity Linking (Name to Knowledge Base)

| Approach | How It Works | Bug Relevance |
|----------|-------------|---------------|
| **spaCy Entity Linker** | Pipeline component that matches detected entities to Wikidata entries. Candidate generation from aliases, then disambiguation | Direct integration path. spaCy NER -> Entity Linker -> Wikidata ID. Handles "Elon Musk" vs "Musk" vs "@elonmusk" |
| **spacyfishing** | spaCy wrapper for Entity-Fishing (GROBID). Named entity disambiguation against Wikidata | Alternative to spaCy Entity Linker with potentially better disambiguation |
| **Wikidata API** | Query by label/alias, get structured data (QIDs, properties, relationships) | Source of ground truth for entity attributes. "Elon Musk" = Q317521, has properties for employer, nationality, etc. |
| **Google Knowledge Graph API** | Search by name, get structured entity data | Complementary to Wikidata. Good for verifying entity identity |
| **DBpedia Spotlight** | Annotates text with DBpedia/Wikipedia entities | Mature tool, good accuracy, slightly dated |

#### Entity Resolution Strategy for Bug

The practical approach for Bug's entity model:

1. **Canonical entity record**: Store a primary name, Wikidata QID (where available), entity type (person/org), and a list of known aliases
2. **NER pass on ingested content**: spaCy extracts entities from articles/posts
3. **Alias matching**: Check extracted entities against known aliases for tracked entities
4. **Entity linking for new entities**: When an unrecognized entity appears near a tracked entity, attempt Wikidata linking to identify it
5. **Fuzzy matching fallback**: Levenshtein distance or embedding similarity for near-matches ("Elon" in a thread about Tesla likely = Elon Musk)
6. **Human-in-the-loop**: Flag ambiguous matches for user confirmation, then persist the alias

Key libraries for deduplication/matching:
- **dedupe** (Python): ML-based record linkage and deduplication
- **recordlinkage** (Python): Toolkit for linking records across datasets
- **sentence-transformers**: Embed entity names and compare cosine similarity

### 4. Position Inference & Stance Detection

#### Important Distinctions

| Concept | Definition | Example |
|---------|-----------|---------|
| **Sentiment** | Positive/negative/neutral emotional tone | "The policy is terrible" = negative sentiment |
| **Stance** | For/against/neutral toward a specific target | "The policy is terrible" = AGAINST the policy |
| **Position** | Inferred belief or policy preference on a topic | From multiple statements: "X consistently opposes carbon taxes" = position |

Sentiment analysis is well-solved. Stance detection is an active research area. Position inference (Bug's goal) is a step beyond stance — it requires aggregating multiple stance signals over time to infer a coherent position, with confidence levels and citations.

#### State of the Art (2025-2026)

| Approach | Description | Performance | Bug Relevance |
|----------|-------------|-------------|---------------|
| **Fine-tuned LLMs** | Fine-tuning ChatGPT or LLaMA on stance datasets (SemEval-2016, P-Stance) | Surpasses BERT-era benchmarks. Fine-tuned LLaMA-2 and ChatGPT both show strong results | Most practical approach for Bug. Use a fine-tuned model or prompt engineering with a frontier model |
| **PoliStance-VAE** | Specialized model achieving SOTA on P-STANCE and SemEval-2016 benchmarks | Surpasses BERT, BERTweet, and GPT-4o on benchmarks | Academic reference. Potentially useful if Bug needs high-accuracy political stance detection |
| **Zero-shot stance detection** | Using LLMs to classify stance without task-specific training | Strong with GPT-4 class models, weaker with smaller models | Good for prototype — no training data needed. Prompt: "Given this article, what is [Entity]'s stance toward [Topic]? Classify as FAVOR/AGAINST/NEUTRAL with evidence" |
| **Cross-target stance detection** | Training on stance toward one target, applying to another | Active research area, not yet production-ready | Future capability — detect stance on emerging topics without retraining |
| **Multimodal stance** | Incorporating images, video alongside text | Early research | Low priority for Bug v1 |

#### Practical Architecture for Position Inference

```
Article/Post → NER (who is mentioned?)
            → Stance Classification (what stance toward which topics?)
            → Attribution (is this the entity's own statement, or reporting about them?)
            → Confidence Scoring (direct quote > paraphrase > inference > speculation)
            → Aggregation (combine signals across sources and time)
            → Position Summary (with citations and confidence)
```

**Attribution is the hard problem.** An article about Elon Musk doesn't mean it represents his position. Bug must distinguish:
- **Direct quotes**: Highest confidence
- **Paraphrased statements**: Medium confidence
- **Reporter characterization**: Lower confidence
- **Inference from actions**: Lowest confidence (e.g., "by investing in X, Musk signals support for Y")

#### Recommended Approach for Bug

1. **Start with zero-shot LLM prompting**: Use Claude or GPT-4 class models with structured prompts that extract entity, topic, stance, confidence, and supporting quote
2. **Build a small labeled dataset**: Have users validate/correct stance predictions. 100-500 examples enables fine-tuning
3. **Graduate to fine-tuned model**: Once dataset exists, fine-tune a smaller model (LLaMA, Mistral) for cost-effective batch processing
4. **Keep frontier models for hard cases**: Use Claude/GPT-4 for ambiguous or high-stakes classifications

### 5. Architecture Patterns

#### Reference Architecture for Bug

```
┌─────────────────────────────────────────────────────────┐
│                    Source Layer                          │
│  ┌──────┐ ┌───────┐ ┌────────┐ ┌───────┐ ┌──────────┐  │
│  │ RSS  │ │ News  │ │Social  │ │ Gov   │ │ Scraper  │  │
│  │Feeds │ │ APIs  │ │  APIs  │ │ APIs  │ │ (legal)  │  │
│  └──┬───┘ └──┬────┘ └───┬────┘ └──┬────┘ └────┬─────┘  │
│     └────────┴──────────┴─────────┴────────────┘        │
│                         │                               │
│              ┌──────────▼──────────┐                    │
│              │  Ingestion Queue    │                    │
│              │  (event-driven)     │                    │
│              └──────────┬──────────┘                    │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────┐
│              Processing Pipeline                        │
│              ┌──────────▼──────────┐                    │
│              │  Deduplication &    │                    │
│              │  Normalization      │                    │
│              └──────────┬──────────┘                    │
│              ┌──────────▼──────────┐                    │
│              │  NER & Entity       │                    │
│              │  Resolution         │                    │
│              └──────────┬──────────┘                    │
│              ┌──────────▼──────────┐                    │
│              │  Embedding &        │                    │
│              │  Topic Matching     │                    │
│              └──────────┬──────────┘                    │
│              ┌──────────▼──────────┐                    │
│              │  Stance Detection   │                    │
│              │  & Attribution      │                    │
│              └──────────┬──────────┘                    │
│              ┌──────────▼──────────┐                    │
│              │  Storage & Index    │                    │
│              └──────────┬──────────┘                    │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────┐
│              Presentation Layer                         │
│  ┌──────────▼──────┐ ┌───────────┐ ┌────────────────┐  │
│  │ Entity Dashboard│ │ Chat/Q&A  │ │ Alert System   │  │
│  │ (positions,     │ │ (ask about│ │ (stance change │  │
│  │  timeline,      │ │  entities)│ │  notifications)│  │
│  │  sources)       │ │           │ │                │  │
│  └─────────────────┘ └───────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### Event-Driven Ingestion

For a tool like Bug, the ingestion pattern matters. Two viable approaches:

| Pattern | How It Works | When to Use |
|---------|-------------|-------------|
| **Poll-based (cron)** | Scheduled jobs fetch from each source on a timer (e.g., every 15 min for news APIs, every hour for RSS) | Simpler to implement. Good for Bug v1. Most news/RSS APIs are pull-based anyway |
| **Event-driven (streaming)** | WebSocket connections to real-time feeds (Bluesky firehose), webhooks from services | Better for social media. Use for Bluesky from day 1. Add streaming sources incrementally |
| **Hybrid** | Cron for pull APIs, streaming for push sources, unified processing pipeline | Best of both. Target architecture for Bug |

**For Bug's scale (single user, tens of entities):** A simple cron-based approach with a job queue is sufficient. Avoid over-engineering with Kafka/Flink — those are for millions of events/second. A PostgreSQL-backed job queue (or even Supabase Edge Functions on a schedule) handles this scale easily.

#### Embedding-Based Topic Matching

Rather than keyword matching (brittle), Bug should use semantic embeddings to determine whether content is relevant to tracked topics:

1. **Embed topics**: Each tracked topic ("carbon tax policy", "AI regulation", "SpaceX launches") gets an embedding vector
2. **Embed incoming content**: Each article/post gets embedded
3. **Cosine similarity**: Compare content embedding to topic embeddings. Threshold (e.g., > 0.75) determines relevance
4. **Cluster for discovery**: Periodically cluster content embeddings to surface emerging topics not explicitly tracked

**Embedding models to consider:**
- **OpenAI text-embedding-3-small**: $0.02/1M tokens. Good balance of cost and quality
- **Cohere embed-v3**: Competitive quality, slightly cheaper
- **Local models (e5-large, BGE)**: Free but requires hosting. Viable if running a server

#### Human-in-the-Loop Calibration

Bug's AI outputs need calibration. Design for:

1. **Stance validation**: Show user a stance prediction with the source text. User confirms or corrects. Feed corrections back as training signal
2. **Entity disambiguation**: When entity resolution is uncertain, present candidates to user. "Is this 'Musk' referring to Elon Musk or the fragrance?"
3. **Relevance tuning**: Let users mark content as relevant/irrelevant to adjust topic matching thresholds
4. **Confidence thresholds**: Set per-user thresholds for what confidence level triggers an alert vs. requires review

### 6. Cost Estimates for Bug Prototype

| Component | Service | Monthly Cost (Prototype) |
|-----------|---------|--------------------------|
| News ingestion | GNews free tier or NewsAPI.ai free | $0 |
| Social - Bluesky | Firehose (free) | $0 |
| Social - Reddit | Free tier (non-commercial) | $0 |
| Social - X/Twitter | Deferred (too expensive for prototype) | $0 |
| NER / Entity Resolution | spaCy (local, free) | $0 |
| Embeddings | OpenAI text-embedding-3-small | ~$5-20 |
| Stance detection | Claude API (zero-shot prompting) | ~$20-50 |
| Enrichment queries | Perplexity Sonar API | ~$5-20 |
| Database | Supabase (existing instance) | $0 |
| **Total** | | **~$30-90/month** |

### 7. Competitive Positioning

Bug occupies a gap in the market:

```
                    General Purpose
                         │
    Google Alerts ───────┼──────── Bug (target)
    (free, dumb)         │        (affordable, smart)
                         │
    Keyword ─────────────┼──────── AI-Augmented
    Matching             │         Inference
                         │
    Brandwatch ──────────┼──────── Recorded Future
    (expensive, brand)   │        (expensive, OSINT)
                         │
                    Domain Specific
```

No existing tool combines:
- General-purpose entity tracking (not locked to brand monitoring or cybersecurity)
- AI-powered position inference (not just keyword alerts or sentiment)
- Affordable for individual use (not enterprise pricing)
- Persistent tracking with temporal evolution (not ephemeral chat queries)

---

## Sources

### Media Monitoring Tools
- [Top Media Monitoring Tools for News and Social Media in 2026](https://prlab.co/blog/the-best-media-monitoring-tools-for-news-and-social-media/)
- [Best Media Monitoring Tools in 2026 (Reviewed & Compared)](https://wizikey.com/blog/best-media-monitoring-tools-in-2026-reviewed-compared)
- [Top 11 Social Media Monitoring Tools for 2026 | Brandwatch](https://www.brandwatch.com/blog/social-media-monitoring-tools/)
- [Top Tools for Tracking Media and Audience Insight in 2026](https://timesintelligence.com/insights-solutions/top-tools-for-tracking-media-and-audience-insight-in-2026/)
- [14 best free and paid Google Alerts alternatives in 2026](https://awario.com/blog/best-google-alerts-alternatives/)
- [Talkwalker Alerts: The Best Free Alternative to Google Alerts](https://www.talkwalker.com/alerts)

### News APIs
- [The Only News API Comparison You Need In 2026](https://newsdata.io/blog/news-api-comparison/)
- [Best News API 2025: 8 Providers Compared & Ranked](https://newsapi.ai/blog/best-news-api-comparison-2025/)
- [Free News APIs That Work in 2026](https://newsdata.io/blog/best-free-news-api/)
- [Best News API for Developers (2026)](https://newsmesh.co/best-news-apis)

### Social Media APIs
- [Twitter/X API Pricing 2026: All Tiers ($0 to $42K) Compared](https://www.xpoz.ai/blog/guides/understanding-twitter-api-pricing-tiers-and-alternatives/)
- [X Tests Pay-Per-Use API Model to Win Back Developers](https://www.techbuzz.ai/articles/x-tests-pay-per-use-api-model-to-win-back-developers)
- [Reddit API Pricing Explained: Costs, Limits, and What You Should Know in 2026](https://easyreadernews.com/reddit-api-pricing-explained-costs-limits-and-what-you-should-know-in-2026/)
- [Complete Guide to Reddit API Pricing and Usage Tiers in 2026](https://www.bbntimes.com/technology/complete-guide-to-reddit-api-pricing-and-usage-tiers-in-2026)
- [Bluesky Firehose Documentation](https://docs.bsky.app/docs/advanced-guides/firehose)
- [Introducing Jetstream | Bluesky](https://docs.bsky.app/blog/jetstream)

### OSINT Tools
- [15 Best OSINT tools in 2026 - Lampyre](https://lampyre.io/blog/15-best-osint-tools-in-2025/)
- [Top 15 Free OSINT Tools | Recorded Future](https://www.recordedfuture.com/threat-intelligence-101/tools-and-technologies/osint-tools)
- [9 Best Maltego Alternatives For Your OSINT Needs](https://technicalustad.com/maltego-alternatives/)

### Entity Resolution & NER
- [spaCy Entity Linker (Wikidata)](https://github.com/egerber/spaCy-entity-linker)
- [spacyfishing - Entity-Fishing wrapper for spaCy](https://github.com/Lucaterre/spacyfishing)
- [Entity Linking functionality in spaCy](https://spacy.io/universe/project/video-spacy-irl-entity-linking)

### Stance Detection
- [Large Language Models Meet Stance Detection: A Survey (2025)](https://arxiv.org/html/2505.08464v1)
- [Stance Detection with Fine-Tuned LLMs | OpenReview](https://openreview.net/forum?id=NsPHibt4qR)
- [Evaluating LLMs for Stance Detection](https://arxiv.org/pdf/2510.23464)

### Government Data
- [OpenSecrets Open Data](https://www.opensecrets.org/open-data)

### AI APIs
- [Perplexity API Pricing (Updated 2026)](https://pricepertoken.com/pricing-page/provider/perplexity)
- [Perplexity Pricing in 2026](https://www.finout.io/blog/perplexity-pricing-in-2026)

### Feedly
- [Feedly AI](https://feedly.com/ai)
- [Feedly Review 2026](https://salesdorado.com/en/monitoring-software/review-feedly/)

### Architecture
- [How Apache Kafka and Flink Power Event-Driven Agentic AI](https://www.kai-waehner.de/blog/2025/04/14/how-apache-kafka-and-flink-power-event-driven-agentic-ai-in-real-time/)

---

*Research conducted 2026-03-21. This document captures the initial landscape survey. Update as exploration proceeds and prototyping begins.*
