# Sub-Prompt - Definitions

> Glossary of terms specific to this project. Maintain as concepts evolve.

---

## Core Terms

| Term | Definition | Example |
|------|-----------|---------|
| **Sub-prompt** | An inline query embedded within a parent prompt, delimited by notation (e.g., square brackets), that resolves before the parent executes | `Explain [the term for when neural networks forget old tasks after learning new ones] in simple terms` |
| **Parent prompt** | The outer prompt containing one or more sub-prompt expressions; executes after all sub-prompts resolve | The full user message after bracket expressions are replaced with resolved values |
| **Pre-resolution pass** | The processing phase where sub-prompts are identified, extracted, resolved, and their results injected back into the parent prompt | Parsing `[...]` → calling model → replacing bracket with "catastrophic forgetting" |
| **Resolution** | The result of executing a sub-prompt — a term, concept, solution, or value that replaces the bracket expression | `"catastrophic forgetting"` replacing the sub-prompt in the example above |
| **Prompt augmentation** | The transformation of the parent prompt after sub-prompt resolution, yielding a more precise version for primary inference | Original vague prompt → sharpened prompt with resolved terms |
| **Resolution trace** | A structured record of all sub-prompt resolutions: input, output, model used, latency, confidence, tokens | Displayed alongside the chat response for transparency |
| **Expanded prompt** | The parent prompt with all sub-prompt brackets replaced by their resolved values, ready for primary inference | `Explain catastrophic forgetting in simple terms` |

## Model Routing Terms

| Term | Definition | Example |
|------|-----------|---------|
| **Model-routed sub-prompt** | A sub-prompt that specifies which model or agent should resolve it | `[@gemini-pro: summarize this long document]` |
| **Specialist agent** | A named resolver with a persistent system prompt, model preference, and optional tools | `@terminology-agent` — always uses Claude Haiku with a "resolve to the precise technical term" system prompt |
| **Dispatch notation** | The `@model:` or `@agent:` prefix within a sub-prompt that routes resolution to a specific provider | `[@haiku: quick term for X]` routes to Claude Haiku |
| **Default resolver** | The model used when a sub-prompt has no explicit routing; typically fast and cheap (e.g., Haiku) | `[what's the term for X?]` → resolved by default resolver |

## Interaction Terms

| Term | Definition | Example |
|------|-----------|---------|
| **Eager resolution** | All sub-prompts resolve immediately on submit, trace shown before parent executes | User submits → sees resolutions → sees augmented response |
| **Interactive resolution** | Each sub-prompt resolves and the user confirms/edits the result before proceeding | Resolution card with "Accept / Edit / Re-resolve" controls |
| **Streaming resolution** | Sub-prompt results stream in real-time as they resolve, then parent executes | Sub-prompts appear as live-updating chips in the input |
| **Nested sub-prompt** | A sub-prompt inside another sub-prompt; innermost resolves first | `[the mitigation for [@term: catastrophic forgetting]]` |
| **Confidence threshold** | Minimum confidence score for a resolution to be auto-accepted vs. flagged for review | Below 0.7 → show alternatives, user picks |
| **Resolution cache** | Previously resolved sub-prompts reuse cached results within a session | Same `[what's the term for X?]` in two messages → single resolution |

## Notation Terms

| Term | Definition | Example |
|------|-----------|---------|
| **Bracket notation** | Square-bracket delimited sub-prompts (primary candidate) | `[what's the term?]` |
| **Tagged notation** | XML-style tagged sub-prompts | `<sub>what's the term?</sub>` |
| **Function notation** | @-prefixed function-call style sub-prompts | `@resolve(what's the term?)` |

---

## Related Concepts

| Concept | Relationship to This Project |
|---------|------------------------------|
| **Shell command substitution** `$(...)` | Direct mechanical inspiration — evaluate inner, inject into outer |
| **SQL subqueries** | Execution model — inner query resolves before outer query |
| **Macro expansion** | Compile-time analogue — expand before execute |
| **Query expansion** (IR) | Academic validation — enriched queries yield better results |
| **Prompt chaining** | Developer-layer multi-step; sub-prompt is user-layer inline variant |
| **Agentic tool use** | Model-controlled mid-inference resolution; sub-prompt externalizes to user |
| **@-mentions** (Cursor) | UX precedent — user-directed inline context signals |
| **Dependency resolution** (Make) | Graph-based resolution ordering for parallel/nested sub-prompts |

---

*Add terms as they emerge during exploration. Precise definitions prevent confusion in later phases.*
