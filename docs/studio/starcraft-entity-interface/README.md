# StarCraft-Inspired Entity Interface

**Status**: Phase 1 (Exploration) - Initial conceptual theorizing
**Created**: 2026-01-09
**Focus**: RTS-style interface patterns for complex entity relationship management

---

## Premise

What if we treated entity management (projects, hypotheses, evidence, experiments, canvas items) like commanding units in StarCraft? Both domains involve:

1. **Managing many interconnected units** with different types and states
2. **Complex dependency graphs** (tech trees vs validation chains)
3. **Information uncertainty** (fog of war vs unvalidated assumptions)
4. **Resource constraints** (minerals/gas vs attention/confidence)
5. **Strategic vs tactical views** (minimap vs detailed unit inspection)

This exploration examines both **literal UI patterns** from StarCraft and **abstract conceptual mappings** that could inform entity interface design.

---

## Document Index

- `literal-mappings.md` - Direct UI pattern translations from StarCraft
- `abstract-mappings.md` - Conceptual framework inspired by RTS mechanics
- `worked-example.md` - Concrete walkthrough of managing a venture's entities
- `definitions.md` - Glossary of terms and concepts

---

## Core Question

**How might StarCraft's proven interaction patterns for managing 200+ units inform interfaces for managing 200+ interconnected entities in a product development system?**

StarCraft players routinely coordinate:
- 200 units across the map
- Multiple production buildings
- Resource collection
- Tech tree progression
- Tactical engagements
- Strategic positioning

Product teams routinely coordinate:
- 200+ entities (assumptions, experiments, canvas items, journeys)
- Multiple validation workflows
- Evidence collection
- Hypothesis dependency chains
- Tactical decisions (what to test next)
- Strategic positioning (where to focus)

**The interface challenge is similar: How do you maintain situational awareness and control over a complex, evolving system?**

---

## Key Insights (Preview)

### From Literal Mappings
1. **Minimap for entity graphs** - See the entire relationship network at a glance
2. **Selection panels** - Multi-select entities and bulk operations
3. **Wireframe grids** - Visual confirmation of what's selected
4. **Command cards** - Context-sensitive actions based on entity type
5. **Control groups** - Hotkey access to entity collections (Ctrl+1 for "Critical Assumptions")

### From Abstract Concepts
1. **Fog of War = Epistemic Uncertainty** - Visualize validated vs unvalidated territory
2. **Creep Spread = Validated Knowledge** - Territory controlled by evidence
3. **Supply Cap = Attention Budget** - Can't manage unlimited entities effectively
4. **Tech Trees = Validation Dependencies** - Can't test B until A is validated
5. **Build Orders = Validated Sequences** - Proven paths through entity creation

---

## Why This Matters

Current entity management UIs (including this codebase's admin interfaces) typically use:
- **List/table views** - Good for browsing, poor for relationships
- **Detail pages** - Good for focus, poor for context
- **Basic filtering** - Good for narrowing, poor for spatial reasoning

StarCraft solved a harder problem: **maintain control over hundreds of interdependent units in real-time**. The interface innovations from 1998 remain relevant because they address fundamental cognitive constraints:

1. **Limited working memory** - Can't hold entire system state in head
2. **Context switching cost** - Need to move between strategic and tactical views
3. **Spatial reasoning strength** - Humans are good at maps, not tables
4. **Pattern recognition** - Visual clusters reveal insights that lists hide

---

## Next Steps

1. ✅ Document literal UI mappings
2. ✅ Document abstract conceptual mappings
3. Document worked example (venture entity lifecycle)
4. Create visual mockups/sketches
5. Prototype minimap view for entity graph
6. Test with real entity data from this codebase

---

**Version**: 0.1 (Initial theorizing)
**Maintained By**: Jon Friis + Claude
**License**: MIT (if spun off)
