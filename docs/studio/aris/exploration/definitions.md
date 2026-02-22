# ARIS — Definitions

> Glossary of terms specific to this project. Maintain as concepts evolve.

---

## Core Terms

| Term | Definition | Example |
|------|-----------|---------|
| **Agent** | A named AI unit with a persistent identity, specialized role, and trackable state. Not a chat thread — an entity that exists over time. | "Researcher-1", "Planner-A", "Executor-3" |
| **Commander** | The human operator who sets strategic direction, delegates tasks, and governs agent behavior. Analogous to the player in an RTS. | Jon Friis directing a research mission |
| **Mission** | A bounded, goal-directed unit of work assigned to one or more agents. Has a start state, success criteria, and resource budget. | "Research competitor landscape for topic X and produce a briefing doc" |
| **Control Group** | A named set of agents that can receive broadcast commands as a unit. Inspired by RTS Ctrl+1/2/3 grouping. | "Research Team", "Execution Squad" |
| **Command Layer** | The strategic interface through which the commander issues direction, monitors agents, and reallocates resources. | The ARIS UI itself |
| **Fog of War** | Information invisible to the commander — agent internal state, pending decisions, uncertainty — that must be made legible or managed. | Agent confidence levels, blocked states, pending tool calls |
| **Delegation** | The act of assigning a mission or subtask to an agent or control group with defined authority and constraints. | Assigning a research task to Researcher-1 with a time budget |
| **Autonomy Throttle** | A configurable constraint on how far an agent can act without human confirmation. High throttle = more interrupts; low throttle = more autonomy. | "Require confirmation before any external API call" |
| **Agent Role** | A specialization that shapes an agent's capabilities, system prompt, and tool access. Analogous to unit type in RTS. | Researcher, Planner, Executor, Critic, Scout |
| **Memory Layer** | The tier of memory an agent has access to: individual (private), team (shared within control group), or strategic (global command layer). | A research agent's individual context vs. shared team notes |
| **Risk Heatmap** | A visual or structured representation of uncertainty and failure probability across active missions. | "Mission X is yellow — high ambiguity on step 3" |
| **Agent Lifecycle** | The stages of an agent's existence: spawn, idle, active, blocked, completed, retired. | Spawning a Researcher, retiring it after mission completion |
| **Minimap** | An overview representation of all active agents and missions at a glance. Borrows from RTS spatial awareness. | Dashboard showing 6 agents across 3 missions |

---

## Related Concepts

| Concept | Relationship to ARIS |
|---------|----------------------|
| **Multi-agent frameworks** (LangGraph, AutoGen, CrewAI) | ARIS is a command interface *on top of* or *alongside* these — it's the human governance layer, not the orchestration engine |
| **RTS games** (StarCraft, Age of Empires) | Primary UI metaphor donor — unit selection, control groups, command queues, fog of war |
| **Human-in-the-loop AI** | ARIS is an opinionated implementation of HITL: humans remain commanders even as agents gain autonomy |
| **Agentic AI** | ARIS assumes agentic behavior (tool use, multi-step reasoning) but adds visibility and control |
| **Cognitive load** | ARIS aims to reduce cognitive load of orchestration through spatial/strategic UI patterns borrowed from games |
| **AI governance** | ARIS is a micro-governance system — autonomy throttles, mission budgets, and confirmation requirements are governance mechanisms |

---

*Add terms as they emerge during exploration. Precise definitions prevent confusion in later phases.*
