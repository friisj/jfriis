# Cue — Definitions

Glossary of terms used in the Cue project.

---

## Core Concepts

### Cue
The project name and the product. A "cue" in social contexts is a signal that prompts a response — appropriate behavior, a topic to raise, a connection to make. Cue is the tool that surfaces those signals.

### Pulse
The daily RSS digest feature. Pulse fetches content from configured sources, scores each item against the user's interest profile, and returns a ranked feed of the most relevant items. Named for the rhythmic, periodic nature of the feed — a heartbeat of information.

### Brief
The AI-generated conversation preparation feature. A Brief is produced for a specific contact before a meeting or conversation. It computes topic overlap between the user and the contact, selects relevant recent Pulse items as source material, and generates 3-5 talking points via Claude.

### Interest Profile
The user's weighted topic preferences. Stored as a JSONB array of `{topic_id, weight}` pairs in `cue_profile`. The interest profile is the foundation for both Pulse scoring (what content is relevant to me?) and Brief generation (where do my interests overlap with this contact's?).

---

## Data Entities

### Topic (`cue_topics`)
A named area of interest in the topic taxonomy. Has a slug for loose coupling to AI-inferred topic labels. Can have a parent topic for optional hierarchy (e.g., "AI" > "LLMs"). Topics are the shared vocabulary between the interest profile, contact profiles, and AI output.

### Topic Weight
A number between 0 and 1 representing how much a given topic matters to a person. 1.0 = extremely important; 0.0 = not relevant. Used in both the user's interest profile (`cue_profile.topics`) and contact profiles (`cue_contact_topics.weight`).

### Source (`cue_sources`)
An RSS or Atom feed URL that Pulse will fetch. Has a name, URL, and optional `topic_ids` array indicating which topics this source typically covers. Sources can be activated or deactivated without deletion.

### Pulse Run (`cue_pulse_runs`)
A single execution of the Pulse fetch process. Tracks status (running / completed / failed), how many items were fetched and scored, and timing. Runs are triggered manually (Phase 1-4) or by a scheduled job (Phase 5+).

### Pulse Item (`cue_pulse_items`)
A single piece of content discovered during a Pulse run. Contains the title, URL, summary, author, publish date, AI-inferred topic slugs, and relevance score. URL is UNIQUE — items are deduplicated across runs.

### Relevance Score
A decimal between 0 and 1 representing how relevant a Pulse item is to the user's interest profile. Computed by Claude Haiku via batch scoring. Higher scores appear at the top of the Pulse feed.

### Contact (`cue_contacts`)
A person the user has real-world or professional relationships with. Contacts have a name, relationship type, notes, and a last_seen timestamp. Each contact has an associated topic interest profile (`cue_contact_topics`).

### Contact Topic (`cue_contact_topics`)
A topic slug and weight representing what a specific contact cares about. Stored separately from the topic taxonomy — uses a slug string for loose coupling so AI can infer contact interests that may not yet be in the formal taxonomy.

### Topic Overlap
The intersection of the user's topic weights and a contact's topic weights. Computed at Brief generation time by finding topics present in both profiles and ranking them by combined weight. Topic overlap is the signal used to select relevant Pulse items and generate talking points.

### Brief (`cue_briefs`)
An AI-generated conversation preparation document for a specific contact. Saved to `cue_briefs` after generation. Contains:
- `overlap_summary` — 1-2 sentence description of shared intellectual ground
- `talking_points` — array of 3-5 structured points, each with: topic, point text, optional source URL/title, and confidence level

### Talking Point
One item within a Brief's talking_points array. Represents a specific conversation thread the user could open or contribute to, grounded in a recent Pulse item or the user's known expertise in the overlap area.

---

## Process Terms

### Batch Scoring
The approach used to score Pulse items for relevance. Instead of one API call per item, up to 20 items are sent to Claude Haiku in a single prompt. The model returns a JSON array of `{url, relevance_score, topics[]}`. Efficient and cost-effective for classification tasks.

### Fetch Run
Synonym for Pulse Run. The complete cycle of: create run record → fetch active sources → parse RSS items → batch score against profile → write scored items → complete run.

### Fetch Error
When an RSS source cannot be fetched (timeout, bad URL, parse failure), the error is stored in `cue_sources.fetch_error` and the run continues with other sources. Fetch errors are surfaced in the Source manager.

### Genesis Log Entry
The `log_entries` row created at project inception with `type='idea'` and `idea_stage='graduated'`. Linked to the studio project via an `entity_link` with `link_type='evolved_from'`. Represents the origin of the project idea.
