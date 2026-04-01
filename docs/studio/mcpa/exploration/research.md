# MCPA - Initial Research

> Landscape survey and foundational research for MCP App prototyping.

---

## Problem Space

MCP Apps embed interactive HTML UIs directly in AI conversation contexts. The interaction model is fundamentally different from standalone web apps:
- The app lives *inside* a conversation, not alongside it
- Data flows bidirectionally between app and AI host via JSON-RPC
- The host mediates all capability access — apps can't bypass restrictions
- Apps are sandboxed (no cookies, no DOM access to host, no navigation)
- Preloading means the UI can be ready before the user even triggers it

What are the right architectural patterns for building in this constrained but powerful environment?

## Prior Art

| Approach | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| `@modelcontextprotocol/ext-apps` SDK | Official helpers, typed protocol | May abstract away learning | Reference implementation |
| Vanilla postMessage apps | Full control, minimal deps | Verbose boilerplate | Good for understanding fundamentals |
| Artifacts (Claude) | Similar embed model | One-directional, no tool access | Precursor — MCPA goes further |
| Streamlit / Gradio | AI-adjacent UIs | Server-rendered, not embedded | Different paradigm |
| iframe-based micro-frontends | Isolation patterns | No AI context integration | Architectural reference |

## Key Questions

1. What state management patterns work best when state can be mutated by both user interaction and AI tool calls?
2. How do streaming tool inputs affect app architecture? Can you build progressive/optimistic UIs?
3. What are the practical limits of the sandbox? Which web APIs are available?
4. How should apps handle the conversation lifecycle (created, updated, revisited)?
5. Can apps maintain state across conversation turns, or is each render fresh?
6. What UX patterns emerge when the UI is *beside* the AI rather than standalone?
7. How does capability delegation change the app's responsibility boundaries?

## Initial Findings

*Populated as research progresses.*

---

*This document captures the initial research phase. Update as exploration proceeds.*
