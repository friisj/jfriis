# Verbivore Definitions

## Core Entities

**Entry**: A glossary article containing curated content about a topic. Has title, slug, excerpt, content (markdown), status (draft/scheduled/live/archived), category, and SEO metadata.

**Term**: A word or phrase with a definition, pronunciation, etymology, usage examples, synonyms, and difficulty level. Terms are linked to entries via the entry-terms junction table.

**Category**: A grouping for entries (e.g., "Linguistics", "Technology"). Each category has a name, slug, description, and color.

**Style Guide**: An AI writing style configuration consisting of a prompt and evaluation criteria (accuracy, whimsy, formality, creativity, technical depth, accessibility). Used during content generation to control tone and approach.

## Relationships

**Entry-Term Link**: A many-to-many relationship between entries and terms. Each link has a display order and a primary flag.

**Term Relationship**: Connects terms to other terms with a typed relationship (synonym, antonym, related, broader, narrower).

**Entry Relationship**: Connects entries to other entries (split_from, sequel, prequel, related, cross_reference). Created by the splitting workflow.

**Source**: A bibliographic reference (book, article, website, dictionary, paper) that can be linked to terms.

## Workflows

**Content Generation**: AI generates entry content based on title, excerpt, and a selected style guide's prompt. Style guides are independently configurable and reusable.

**Term Suggestion**: AI analyzes entry content and suggests terms for glossary inclusion. Supports custom prompts, manual suggestions, and rejection tracking for preference learning.

**Entry Splitting**: For entries with many linked terms, AI proposes a strategy to split into focused sub-entries grouped by theme, complexity, or narrative flow. The original entry becomes an overview.

**Style Enhancement**: Iterative AI improvement of style guide prompts based on evaluation criteria sliders.
