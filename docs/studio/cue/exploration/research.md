# Cue — Prior Art & Research

Landscape analysis of tools in the adjacent problem spaces.

---

## Problem Space

Cue addresses two distinct but related friction points:

1. **Feed curation fatigue** — RSS and social feeds require active filtering. The volume of information in any technical domain makes manual curation unsustainable. The result is either anxiety (too much to read) or avoidance (stop reading at all).

2. **Pre-meeting research friction** — Preparing for a conversation with someone — especially someone you don't know well — requires scattered research: checking their LinkedIn, recalling what they've written or said, thinking about what might be interesting to discuss. This is high-value work that rarely gets done.

Both problems share a structural similarity: *you have an interest profile, and you need to find relevant signal*. The feed problem applies that profile to content. The brief problem applies it to a specific person.

---

## Existing Tools

### RSS & Feed Readers

**Feedly**
The dominant RSS reader. Strong source management and team collaboration. AI features via Feedly AI include topic filters and trend detection. But Feedly doesn't do relevance scoring against a personal interest profile — it surfaces what's published, not what's relevant to you specifically.

**Readwise Reader**
The best modern read-later + RSS tool. Full-text search, highlights, AI summaries. Strong "inbox" metaphor for triage. Missing: explicit interest-weighted scoring and any contact or social layer.

**Artifact**
Mobile news app with AI-driven personalization. Good at surface-level topic detection but closed platform — no RSS custom sources, no API, no way to export or compose with other tools.

**Reeder / NetNewsWire**
Traditional RSS clients with no AI layer. Pure content consumption with no personalization beyond manual folder organization.

**Gap**: None of these score content against an explicitly defined, user-controlled interest profile. They rely on implicit signals (reading history, likes) or manual folder organization. Cue's interest profile is explicit and configurable.

---

### CRM & Relationship Intelligence

**Clay**
The closest analogue to Brief's relationship intelligence goal. Clay enriches contacts from dozens of data sources (LinkedIn, Twitter, news, Crunchbase) and surfaces recent activity before meetings. More powerful but more complex: requires significant setup, pulls data from many external sources, and has a heavy-duty data model.

Clay's strength is breadth of data. Cue's Brief is narrower but more personal: it uses content the user actually reads (Pulse items) as source material, which means the talking points are grounded in the user's own knowledge, not external enrichment.

**Primer**
AI meeting prep tool that auto-generates briefings before calendar meetings. Pulls from LinkedIn, news, company databases. More automated than Cue but less personal — it doesn't know what topics the user cares about, so talking points are generic.

**Notion AI / CRM tools**
Some teams use Notion as a lightweight CRM with AI features. Flexible but manual. No automatic feed correlation.

**Gap**: Relationship intelligence tools focus on *who the contact is* (their public profile). Cue focuses on *intellectual overlap* — what do you and this person both care about right now? The source of truth is shared topical interest, not external data enrichment.

---

### AI Chat & Research

**Perplexity**
Strong for ad-hoc research ("what has [person] been writing about?"). But requires active prompting — no ambient feed, no pre-computed interest profile.

**ChatGPT / Claude**
Can generate conversation prep if prompted with context. But there's no structured input/output, no persistence (no saved briefs), no Pulse feed as source material.

**Gap**: AI chat tools are general-purpose. Cue is specialized: it has a structured data model (contacts, topics, pulse items) that enables a specific, repeatable workflow.

---

## Design Positioning

Cue is positioned in the intersection of:
- Personal knowledge management (PKM) — owning your reading and interests
- Lightweight CRM — tracking contacts and relationships
- AI-assisted workflows — using AI for a specific, structured task, not open-ended chat

It is deliberately **narrow and personal**. It is not trying to be Clay (broad enrichment), Feedly (full-featured RSS platform), or a general AI assistant. It is a single-user tool that does one thing well: helps Jon have better conversations by connecting his reading to the people he talks to.

---

## Hypotheses Informed by Research

**H1 (Pulse)**: Existing tools rely on implicit signals or manual curation. An explicit, user-controlled topic interest profile with numeric weights enables more precise relevance scoring. This is testable by comparing the Pulse feed quality against using Feedly without personalization.

**H2 (Brief)**: Relationship intelligence tools generate generic briefings. Grounding talking points in the user's own recent reading (Pulse items) produces points that are both relevant to the user's expertise AND relevant to the contact's interests. This is more credible than AI-generated summaries of public data because the user actually read the source material.

---

## What Cue Does NOT Try to Do

- **Real-time social media monitoring** — Twitter/X, LinkedIn activity. Too much noise, paywalled APIs, and scope creep.
- **Contact enrichment from external sources** — No pulling LinkedIn data, no Crunchbase, no news search. The source of truth is what the user reads, not what can be scraped.
- **Team collaboration** — Single-user by design.
- **Email/calendar integration** — No auto-detect of meetings or syncing with calendar. Intentionally manual — the user chooses when to generate a brief.
- **Public-facing features** — Everything in Cue is private, admin-only.
