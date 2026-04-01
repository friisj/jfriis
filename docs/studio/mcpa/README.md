# MCPA

> Prototyping MCP App affordances — exploring architecture, states, transformations, and interaction patterns for embedded UI resources within MCP hosts.

## Status

- **Phase:** Active — Stage 1 (Shell Prototype)
- **Temperature:** Hot
- **Started:** 2026-03-31

## Overview

MCP Apps are a novel interaction model: embedded HTML UIs rendered inside AI conversation contexts via sandboxed iframes, communicating bidirectionally with the host through JSON-RPC over postMessage. This project explores what's possible within that model — its affordances, constraints, and emergent patterns.

The goal is hands-on prototyping to discover effective architectures for state management, data flow, capability delegation, and UX within MCP hosts. Some experiments will adopt established functional patterns (reducers, state machines, event sourcing); others will push into uncharted territory specific to the AI-embedded context (context-aware rendering, tool-driven UI, streaming state hydration).

No commercial ambitions — this is pure exploration of a new interaction primitive.

## Design Principles

1. **Constraint-aware from the start.** Every architectural decision records its sandbox assumptions. Patterns that rely on APIs that may not survive the sandbox (localStorage, fetch to arbitrary origins, WebSocket, clipboard) are flagged, not avoided — but the assumption is tracked.
2. **Framework-agnostic.** Patterns should transfer across React, vanilla JS, or any framework. No framework opinions in outputs.
3. **Stage-gated validation.** Assumptions move through: `assumed` → `validated` / `invalidated` at each stage. The constraint map is a key output, not a side effect.
4. **Shell-first architecture.** Build the app as a standalone component tree first. The host boundary is introduced later, not assumed from the start.

## Key Outputs

| Output | Description | Living? |
|--------|------------|---------|
| **Sandbox Constraint Map** | API-by-API catalog of what works in MCP app sandboxes | Yes — updated at each stage |
| **State Pattern Catalog** | Viable state management approaches with trade-offs | Yes |
| **Component Architecture Patterns** | How to structure iframe-embedded UIs | Final at Stage 2 |
| **Data Flow Patterns** | Bidirectional app↔host communication patterns | Final at Stage 3 |

## Stages

### Stage 1: Shell Prototype ← current
Build the app as a standalone component — no iframe, no host, no postMessage. Explore state machines, component composition, and rendering patterns. Produce the initial constraint map with assumptions that need host validation.

**Experiment:** `mcpa-shell`

### Stage 2: Mock Chat Client
Lightweight `<iframe>` + `postMessage` harness simulating an MCP host. Validates the boundary contract, message timing, serialization overhead, and sandbox API availability against shell-stage assumptions.

**Experiment:** `mcpa-mock-host`

### Stage 3: Real MCP Server Integration
Rehabilitate `jfriis-mcp` to serve `ui://` resources. End-to-end validation in a real host (Claude Desktop or VS Code). Finalize the constraint map.

**Experiment:** `mcpa-real-server`

## Hypotheses

- **H1:** A well-structured shell prototype can discover viable state management, component architecture, and data flow patterns for MCP Apps before any real host integration
  - **Validation:** Shell surfaces at least 3 architectural decisions costly to change post-integration; produces constraint map distinguishing shell-validated vs host-requiring assumptions

- **H2:** A lightweight mock chat client can validate the app/host boundary contract and expose timing, serialization, and capability-negotiation patterns before real MCP integration
  - **Validation:** Mock host validates or invalidates shell-stage assumptions about message timing, capability lifecycle, state persistence, sandbox API availability

- **H3:** An existing MCP server (jfriis-mcp) can be rehabilitated to serve `ui://` resources and host a real MCP app, validating the full pattern end-to-end
  - **Validation:** Real app runs in at least one host, calls tools bidirectionally, constraint map finalized

## Reference

- [MCP Apps Overview](https://modelcontextprotocol.io/extensions/apps/overview) — official spec
- Key concepts: `ui://` resource URIs, preloading, sandboxed iframes, JSON-RPC over postMessage, capability delegation, CSP policies

## Project Structure

### Documentation
- `/docs/studio/mcpa/README.md` — This file
- `/docs/studio/mcpa/exploration/definitions.md` — Glossary
- `/docs/studio/mcpa/exploration/research.md` — Landscape survey
- `/docs/studio/mcpa/exploration/constraint-map.md` — Sandbox constraint map (created at Stage 1)

### Code
- `/components/studio/prototypes/mcpa/` — Prototype components

---

**Started:** 2026-03-31
**Status:** Active — Stage 1
