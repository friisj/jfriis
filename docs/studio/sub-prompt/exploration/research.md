# Sub-Prompt - Research

> Landscape survey, prior art analysis, and design space mapping for nested prompt resolution.

---

## Problem Space

When prompting AI, users frequently have embedded knowledge gaps — they know the *shape* of what they need but lack the precise term, concept, or framing. Current options:

1. **Be vague** → model inference diffuses across interpretations, often missing the target
2. **Ask separately first** → breaks flow, requires manual copy-paste, loses conversational context
3. **Hope the model infers** → works sometimes, fails unpredictably, no user control
4. **Use chain-of-thought** → helps reasoning but doesn't address terminology/knowledge gaps specifically

None of these give the user explicit control over *where* they need help within a prompt.

### The Precision Gap

The root issue is **asymmetric knowledge**: the user knows *what they want to say* but not *how to say it precisely*. This creates a compounding problem:

- Vague input → diffused attention → generic output → user reformulates → repeat
- Each round-trip wastes tokens, time, and cognitive load
- The user *knows* where the gap is but has no way to signal it

Sub-Prompt proposes: let the user mark their gaps explicitly, resolve them first, then execute with precision.

---

## Prior Art

### Production Systems

| Approach | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| **Wolfram Alpha in ChatGPT** | Inline computation during generation | Model-initiated, not user-directed | Closest production example of mid-prompt resolution |
| **Cursor/Copilot @-mentions** | User-directed context injection (`@file`, `@web`, `@docs`) | Fetches context, doesn't resolve questions | Adjacent UX — user signals "I need X here" |
| **ChatGPT custom instructions** | Persistent context augmentation | Not inline, not per-prompt, not query-specific | Background augmentation vs. targeted resolution |
| **Agentic tool use** (Claude, GPT-4) | Models call tools mid-generation | Opaque to user, model-controlled | Sub-prompt externalizes this to user notation |

### Developer Frameworks

| Framework | Approach | Gap |
|-----------|----------|-----|
| **LangChain** | Pipe operator chains (`prompt \| llm \| parser`) | Developer-layer, not end-user notation |
| **LlamaIndex** | RAG pipelines with structured retrieval | Retrieval-specific, not inline resolution |
| **DSPy** | Learnable LLM modules, automatic prompt optimization | Moves *away* from manual prompting entirely |
| **ComfyUI** | Node-graph prompt composition for image generation | Visual DAG, not inline text notation |
| **PromptLayer/Vellum** | Template variables (`{{variable}}`) | Pre-defined variables, no runtime resolution |

### Programming Language Analogues

| Concept | Mechanic | Relevance |
|---------|----------|-----------|
| **Shell command substitution** `$(...)` | Evaluate inner, inject into outer | **Exact mechanic** — the direct inspiration |
| **SQL subqueries** | Inner query → result → outer query | Closest execution model in query languages |
| **C preprocessor macros** | Compile-time text substitution | Direct analogue for expansion phase |
| **Lisp macros** | Code that writes code before execution | Most general form of this pattern |
| **Template literals** (JS) | `${expression}` inline evaluation | Syntactic precedent for inline expressions |
| **Datalog/Prolog** | Sub-goals resolve before parent goals | Resolution-based execution model |
| **Make/build systems** | Dependency graph → resolution order → execution | Parallel resolution of independent sub-tasks |

### Academic Research

- **Query expansion** (Jina AI, academic papers): LLM-enriched queries yield better retrieval. Zero-shot, few-shot, and CoT expansion all improve results. Validates decomposition as sound principle.
- **Recursive prompts**: Emerging pattern where prompts return updated prompts with state. Analogous to tail recursion — model generates the next prompt rather than resolving inline.
- **Prompt decomposition** (Least-to-Most, DECOMP): Breaking complex questions into simpler sub-questions improves accuracy. Academic evidence that multi-step resolution works.

---

## The Novelty

**Nothing in existing frameworks directly addresses user-facing inline notation for sub-prompt resolution within a single chat turn.** This is genuinely novel territory.

Sub-Prompt sits at the intersection of:
- **User agency** from @-mention patterns (user directs what resolves)
- **Inline notation** from shell substitution and macros (embedded in the prompt text)
- **Multi-step decomposition** validated by query expansion research
- **Externalized tool use** — what models do internally, made explicit and user-controlled

---

## Design Space

### Notation Candidates

| Style | Syntax | Pros | Cons |
|-------|--------|------|------|
| **Square brackets** | `[what's the term for X?]` | Familiar, easy to type, clear boundaries | Conflicts with markdown links, JSON |
| **Double braces** | `{{what's the term for X?}}` | Template engine precedent, unambiguous | More keystrokes, less natural |
| **Tilde delimiters** | `~what's the term for X?~` | Lightweight, unusual enough to avoid conflicts | Weak visual boundary, strikethrough in markdown |
| **Tagged** | `<sub>what's the term for X?</sub>` | Explicit, extensible with attributes | Verbose, feels like HTML |
| **@-prefixed function** | `@resolve(what's the term for X?)` | Familiar from @-mentions, extensible | Parentheses feel code-like |
| **Pipe syntax** | `\|what's the term for X?\|` | Clean, pipe semantics fit well | Easy to confuse with table syntax |

### Model Routing Notation

Extending the notation to direct sub-prompts to specific models or specialist agents:

```
[@claude-opus: deep analysis of the philosophical implications of X]
[@gemini-pro: summarize this 200-page document about X]
[@haiku: what's the quick term for X?]
[@fact-checker: is it true that X was invented in 1987?]
[@code-expert: what's the most efficient algorithm for X?]
[@terminology: the technical name for when a neural network forgets old tasks]
```

This creates a **user-controlled dispatch** mechanism — the user picks the specialist, not the system.

### Resolution Strategies

| Strategy | Behavior | Trade-off |
|----------|----------|-----------|
| **Eager** | Resolve all sub-prompts immediately, show trace, then execute parent | Maximum transparency, slower UX |
| **Lazy** | Resolve sub-prompts only when parent prompt is submitted | Simpler UX, but no chance to review |
| **Interactive** | Resolve and show each result; user confirms or edits before parent executes | Maximum control, higher friction |
| **Streaming** | Show sub-prompt resolutions streaming in real-time as they resolve | Engaging UX, moderate transparency |
| **Parallel** | Independent sub-prompts resolve concurrently | Faster, but harder to show progress |

### Interaction Models

**Model A — Inline Expansion (Shell-style)**
User types prompt with brackets. On submit, system identifies sub-prompts, resolves them (showing a trace), replaces brackets with resolved values, then sends the expanded prompt to the parent model. User sees: original → expanded → response.

**Model B — Split Pane (IDE-style)**
Chat on the left, resolution trace on the right. Sub-prompts appear as collapsible cards in the trace pane with model used, tokens spent, latency, and the resolved value. Parent prompt shows with resolved values highlighted.

**Model C — Staged Pipeline (Build-system-style)**
Submit triggers a visual pipeline: Parse → Resolve (per sub-prompt, possibly parallel) → Augment → Execute. Each stage is a collapsible section. User can pause between Augment and Execute to review/edit.

**Model D — Ghost Text (Copilot-style)**
As the user types a bracket expression, the system begins resolving it immediately (debounced). Ghost text appears showing the likely resolution. User can Tab to accept or keep editing. Parent prompt doesn't send until all brackets are resolved.

**Model E — Agent Delegation (Crew-style)**
Sub-prompts aren't just resolved — they're *delegated* to named agents with persistent context. `[@terminology-agent: ...]` routes to an agent that maintains a session of resolved terms. `[@research-agent: ...]` routes to an agent that can search the web. Each agent has its own system prompt, model, and tools.

### Nesting

```
Explain [the concept where [@terminology: the phenomenon of forgetting old tasks
when learning new ones] leads to [what's the mitigation strategy?]] in the context
of large language model fine-tuning.
```

Resolution order: innermost first (like parentheses in math).
1. `[@terminology: ...]` → "catastrophic forgetting"
2. `[what's the mitigation strategy?]` → "elastic weight consolidation (EWC)"
3. Outer `[the concept where catastrophic forgetting leads to elastic weight consolidation]` → resolves with enriched context
4. Parent prompt executes with all resolved values

### Error & Confidence Handling

What happens when a sub-prompt can't resolve confidently?

- **Confidence threshold**: Resolution includes a confidence score. Below threshold → flag for user review.
- **Ambiguity surfacing**: Multiple possible resolutions shown as options. User picks.
- **Graceful fallback**: If resolution fails, the original bracket text passes through (clearly marked) so the parent model still gets the user's intent.
- **Timeout**: Sub-prompts that take too long get a partial resolution or fallback.

---

## Key Open Questions

1. **Does the overhead of sub-prompt resolution actually save total tokens/time vs. just being vague?** Need empirical data.
2. **Where's the sweet spot between transparency and flow?** Too much trace = friction. Too little = opacity.
3. **Should sub-prompts be explicit (user writes them) or suggested (system detects knowledge gaps)?** Hybrid?
4. **How does this interact with system prompts and conversation context?** Do sub-prompts see the full conversation?
5. **Can sub-prompts be reusable?** Define once, reference multiple times in the same prompt?
6. **What's the economic model?** Sub-prompts cost tokens. Is the precision gain worth the cost?

---

## Sources

- [Query Expansion by Prompting LLMs](https://arxiv.org/abs/2305.03653) — Academic validation of decomposition
- [Jina AI: LLM Query Expansion](https://github.com/jina-ai/llm-query-expansion) — OSS implementation
- [DSPy](https://dspy.ai/) — "Programming not prompting" paradigm
- [LangChain](https://langchain.com/) — Developer-layer prompt chaining
- [Recursive LLM](https://github.com/andyk/recursive_llm) — Prompts that return prompts
- Cursor @-mentions, Wolfram Alpha in ChatGPT — Production precedents
