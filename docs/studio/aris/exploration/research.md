# ARIS — Initial Research

> Landscape survey and foundational research for the project.

---

## Problem Space

Current multi-agent AI interfaces fail commanders. The dominant patterns — chat threads, log streams, and backend orchestration chains — share a common flaw: they render AI activity invisible, sequential, and passive. The human waits. Agents run. Results appear (or don't).

This works for simple one-shot tasks. It breaks down when:
- Multiple agents run in parallel
- Agents have dependencies and need to coordinate
- Humans need to interrupt, redirect, or reprioritize mid-execution
- Accountability for agent actions matters
- Resource budgets (tokens, time, cost) need active management

The problem is structural, not a prompt engineering issue. The interface paradigm is wrong for the task.

**The ARIS thesis**: RTS games solved an analogous problem — how do you command many units, maintain strategic overview, delegate effectively, and intervene when needed — for complex real-time scenarios. That solution is a rich source of interface patterns for AI agent management.

---

## Prior Art

### Multi-Agent Orchestration Frameworks

| Approach | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| **LangGraph** | Graph-based, stateful, flexible | No UI, developer-only, no real-time visibility | Engine layer ARIS might sit above |
| **AutoGen** | Conversational multi-agent, extensible | Still chat-centric, hard to monitor | Execution layer candidate |
| **CrewAI** | Role-based agents, task chaining | Limited human interrupt model | Role taxonomy is relevant |
| **Swarm (OpenAI)** | Lightweight handoffs | Too minimal for complex orchestration | Shows what "agent handoff" looks like |
| **Semantic Kernel** | Enterprise-grade, planners | Complex, Microsoft-centric | Planning patterns useful |

### Existing Agent UIs

| Tool | Approach | Gap |
|------|----------|-----|
| **LangSmith** | Trace/debug view | Retrospective, not real-time command |
| **AgentOps** | Monitoring dashboard | Observability, not orchestration |
| **Flowise / Langflow** | Visual pipeline builder | Build-time, not runtime command |
| **Dify** | Workflow builder + chat | Still chat-centric at runtime |

**Key gap**: No existing tool treats the human as a real-time commander with live strategic overview and interrupt capability. All existing tools are either build-time (visual pipeline builders) or retrospective (trace/monitor dashboards). None are runtime command interfaces.

### RTS Interface Patterns Worth Studying

| RTS Mechanic | Knowledge Work Equivalent | ARIS Application |
|-------------|--------------------------|------------------|
| Unit selection box | Select one or multiple agents | Click to inspect, drag to multi-select |
| Control groups (Ctrl+1) | Named agent teams | Pre-configure research team, execution squad |
| Minimap | Mission + agent overview | Dashboard widget showing all active state |
| Resource panel | Token / cost budget | Remaining budget per agent/mission |
| Command queue | Pending task list | Agent's queued instructions |
| Fog of war | Agent uncertainty, hidden state | Confidence scores, blocked indicators |
| Unit morale | Agent coherence / context health | Context window health, confusion signals |
| Attack-move | Partially autonomous execution | "Work toward X, check in before API calls" |

---

## Key Questions

1. What is the minimum viable agent model? (identity, role, memory, tools, status)
2. How do control groups map to real workflow structures? Are they static or dynamic?
3. What interruption mechanisms feel natural vs. disruptive?
4. What does "fog of war" mean concretely for AI agents — and what should be revealed?
5. How does the autonomy throttle translate to practical UX? (toggles, sliders, mission-level settings?)
6. Does the commander metaphor resonate with knowledge workers, or does it create friction?
7. What's the relationship between ARIS and the underlying orchestration engine? Is ARIS engine-agnostic?
8. What does agent "morale" or "coherence" mean operationally — and is it measurable?
9. Can mission budgets be enforced, or only surfaced? Who owns enforcement?
10. How does agent spawning/retiring work in a live session?

---

## Initial Findings

*(Populated as research progresses)*

---

*This document captures the initial research phase. Update as exploration proceeds.*
