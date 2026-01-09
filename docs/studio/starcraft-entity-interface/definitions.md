# Definitions: StarCraft Entity Interface Concepts

**Glossary of terms used in this exploration**

---

## Interface Components

### Minimap
**StarCraft:** Small always-visible map showing entire battlefield at reduced scale.
**Entity Interface:** Always-visible graph showing all entities and their relationships, color-coded by validation state. Primary navigation and situational awareness tool.

### Selection Panel
**StarCraft:** Bottom-center UI showing detailed stats for selected unit(s).
**Entity Interface:** Inspector panel showing details for selected entity/entities, including evidence, links, confidence, and status.

### Command Card
**StarCraft:** Grid of buttons (usually 3x3) showing available actions for selected unit.
**Entity Interface:** Context-sensitive action buttons for selected entities. Changes based on entity type and current state.

### Wireframe Grid
**StarCraft:** When multiple units selected, shows small icon for each in a grid.
**Entity Interface:** Visual grid of all selected entities, shows type/status icons, allows individual inspection before bulk operations.

### Control Groups
**StarCraft:** Saved selection sets bound to number keys (1-0). Press Ctrl+Number to save, Number to recall.
**Entity Interface:** Saved entity collections bound to hotkeys (1-0). Examples: "Critical Assumptions" (1), "Active Experiments" (2), "This Sprint" (3).

### Resource Display
**StarCraft:** Top-right UI showing minerals, gas, and supply.
**Entity Interface:** Top UI showing attention budget metrics: entities managed, validation %, active experiments, evidence quality.

---

## Systemic Concepts

### Fog of War
**StarCraft:** Unexplored areas (black), explored but not currently visible (dark), visible (light).
**Entity Interface:** Epistemic uncertainty. Black = unexamined, dark = stated but unvalidated, light = testing, clear = validated.

### Creep Spread
**StarCraft:** Zerg mechanic where purple organic terrain spreads from structures.
**Entity Interface:** "Territory" of validated knowledge. Purple visual glow around clusters of entities with strong evidence. Strategic goal: Expand validated territory.

### Supply / Supply Cap
**StarCraft:** Resource representing unit capacity. Each unit costs supply (1-8), max 200.
**Entity Interface:** Attention budget. Each entity costs mental "supply" based on complexity. Simple assumption = 1, active hypothesis = 2, complex experiment = 3. Cap = realistic attention capacity (~50 for individual).

### Tech Tree
**StarCraft:** Dependency graph of buildings/upgrades. Must build A before B.
**Entity Interface:** Validation dependency graph. Can't test hypothesis B until assumption A is validated. Visual tree showing locked/available/completed paths.

### APM (Actions Per Minute)
**StarCraft:** Metric of how many commands player issues per minute. Indicator of activity level.
**Entity Interface:** Validation velocity. Rate of evidence collection, entity updates, experiment completion. Measures momentum, not just activity.

### Macro
**StarCraft:** Strategic layer - economy, production, tech progression.
**Entity Interface:** Portfolio health view - overall validation %, resource allocation, pipeline status, critical path progress.

### Micro
**StarCraft:** Tactical layer - individual unit control, specific engagements.
**Entity Interface:** Entity detail view - specific hypothesis wording, evidence interpretation, link management, confidence calculations.

### Scouting
**StarCraft:** Sending units to explore map and gather information about opponent.
**Entity Interface:** User research, market validation, competitor analysis. Reveals "hidden" information (user needs, market dynamics). Multiple scout types (interviews, surveys, analytics).

### Cheese
**StarCraft:** High-risk, high-reward strategies that rely on opponent not scouting.
**Entity Interface:** Assumption-heavy product launches. Shipping without validation, founder intuition over research. Works sometimes but risky.

### Build Order
**StarCraft:** Memorized, optimized sequence of buildings/units executed at start of game.
**Entity Interface:** Validation playbook. Proven sequence of entity creation and validation for specific venture types (e.g., "SaaS MVP Validation" playbook).

### Matchup
**StarCraft:** Context-specific strategy. Terran vs Zerg requires different approach than Terran vs Protoss.
**Entity Interface:** Market context. B2B SaaS vs Enterprise requires different validation than B2C Mobile vs Consumer.

---

## Entity System Terms

### Entity
General term for any managed object in the system: hypothesis, assumption, experiment, canvas item, journey stage, touchpoint, etc.

### Entity Type
Category of entity. Current types in codebase:
- **Portfolio:** project, log_entry, specimen
- **Studio:** studio_project, hypothesis, experiment
- **Canvases:** business_model_canvas, customer_profile, value_proposition_canvas, value_map, canvas_item
- **Journeys:** user_journey, journey_stage, touchpoint
- **Validation:** assumption

### Entity Link
Relationship between two entities. Has source, target, and link type.

### Link Type
Nature of relationship. Examples:
- **Generic:** related, references
- **Derivation:** evolved_from, inspired_by, derived_from
- **Validation:** validates, tests, tested_by, supports, contradicts
- **Composition:** contains, part_of
- **Canvas-specific:** addresses_job, relieves_pain, creates_gain
- **Documentation:** documents, demonstrates

### Link Strength
Weight of relationship: strong, moderate, weak, tentative.

### Evidence
Supporting or contradicting data attached to an entity. Has type, confidence, content, source.

### Evidence Type
Category of evidence:
- **Research:** interview, survey, observation, research
- **Quantitative:** analytics, metrics, ab_test
- **Validation:** experiment, prototype, user_test, heuristic_eval
- **External:** competitor, expert, market_research
- **Internal:** team_discussion, stakeholder_feedback

### Confidence
Numerical value (0.0 - 1.0) representing certainty in evidence or entity validation.

### Validation State
Status of entity:
- **🔳 Not Started** - Not yet examined
- **🟡 In Progress** - Currently being tested/validated
- **🟢 Validated** - Strong supporting evidence
- **🔴 Invalidated** - Strong contradicting evidence
- **⚪ Unknown** - Insufficient evidence

---

## Workflow Concepts

### Critical Path
Sequence of must-validate entities to reach key milestone (usually MVP launch).

### Validation Pipeline
Queue of planned validation activities: experiments to run, evidence to collect, hypotheses to test.

### Pivot
Updating invalidated hypothesis based on evidence insights. Not deletion, but revision.

### Archive
Moving entity out of active management without deleting. Frees attention supply.

### Cascade
Automatic propagation of changes. Validating A enables B, invalidating C blocks D.

### Dependency
Prerequisite relationship. Entity B depends on entity A being validated first.

### Blocker
Entity or condition preventing progress on another entity.

### Evidence Decay
Reduction in confidence over time as evidence ages. Old research becomes stale.

### Scout Mission
Planned research activity to refresh or expand evidence in a domain.

### Orphan
Entity with no incoming or outgoing links. Isolated, disconnected from graph.

### Cluster
Group of tightly interconnected entities, often representing a coherent concept or domain area.

### Territory
Visual metaphor for validated knowledge. "Expanding territory" = increasing validation coverage.

---

## Metrics

### Validation Percentage
% of entities with validation state = validated. Higher is better. Target: 60-80%.

### Evidence Quality
Average confidence score across all evidence. Range: 0-100%. Target: 80%+.

### Supply Used / Supply Cap
Current attention load vs maximum sustainable load. Approaching cap triggers warnings.

### Validation Velocity
Rate of change in validation percentage over time. Measures progress momentum.

### Evidence Freshness
Age distribution of evidence. Older evidence less reliable due to market/user changes.

### Dependency Depth
Longest chain of dependent entities. Deep chains = high risk (early failure cascades).

### Orphan Count
Number of disconnected entities. High count suggests poor information architecture.

### Coverage
% of entity types that have representative entities. Identifies gaps (e.g., "No experiments created yet").

---

## Interface Modes

### Strategic View (Macro)
High-level dashboard showing portfolio health, critical path status, resource allocation. Access via F1 key.

### Tactical View (Micro)
Detailed entity inspection showing evidence, links, confidence, history. Default view when entity selected.

### Graph View
Spatial visualization of entity relationships. Shows clusters, dependencies, validation states as colors/sizes.

### List View
Tabular display of entities with filtering and sorting. Good for finding specific items.

### Queue View
Linear display of planned validation activities in priority order. Supports drag-to-reorder.

### Evidence View
Filtered view showing all evidence across entities, sortable by confidence, freshness, type.

### Timeline View
Chronological view of entity creation, validation events, evidence collection over time.

---

## Interaction Patterns

### Select → Inspect → Act
1. Select entity/entities (click, box select, hotkey)
2. Inspect details (selection panel)
3. Execute action (command card)

### Macro → Micro → Macro
1. Check portfolio health (F1)
2. Identify problem area
3. Zoom to detail (click minimap)
4. Fix issue
5. Return to portfolio (F1)

### Scout → Collect → Validate
1. Identify knowledge gap (fog of war)
2. Run research (scout mission)
3. Gather evidence
4. Update entity validation

### Queue → Execute → Review
1. Plan validation activities (queue)
2. Run experiments
3. Review results
4. Update entities

### Link → Cascade → Verify
1. Create entity link
2. System propagates dependencies
3. Verify cascading effects correct

---

## Anti-Patterns

### Supply Bloat
Creating too many entities, exceeding attention capacity. Symptoms: Nothing gets validated, low progress.

### Fog Blindness
Ignoring unvalidated areas, assuming they're fine. Leads to false confidence.

### Micro Trap
Getting stuck in entity details, losing strategic context. Hours pass without macro progress.

### Macro Neglect
Never zooming into details, making decisions on incomplete information.

### Stale Evidence
Not refreshing old research. Confidence in outdated assumptions.

### Orphan Proliferation
Creating entities without linking them. Graph becomes disconnected, context lost.

### Validation Theater
Collecting evidence that doesn't actually test hypotheses. High activity, low learning.

### Cheese Addiction
Repeatedly skipping validation, assuming intuition. Works until it doesn't.

---

## Design Principles

### Information Scent
UI provides clues about where to find information. Color-coding, visual hierarchy, consistent patterns.

### Spatial Consistency
Entities maintain stable positions in graph view. Muscle memory for navigation.

### Progressive Disclosure
Show overview by default, details on demand. Prevent information overload.

### Contextual Actions
Available commands change based on selection. Irrelevant options hidden/disabled.

### Feedback Immediacy
Visual changes reflect actions instantly. No "did it work?" uncertainty.

### Undo Safety
All destructive actions reversible. Archive instead of delete. Confidence to experiment.

### Muscle Memory
Consistent hotkeys, button positions. F1 always = macro, Q often = primary action.

### Ambient Awareness
Peripheral vision info (minimap, resources) maintains context during focused work.

---

**Version:** 0.1
**Last Updated:** 2026-01-09
**Status:** Living document (will expand as concepts evolve)
