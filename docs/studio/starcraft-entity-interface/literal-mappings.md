# Literal UI Mappings: StarCraft → Entity Management

**How specific StarCraft interface elements could translate to entity management**

---

## 1. The Minimap

### StarCraft
- Top-right corner, always visible
- Shows entire map at reduced scale
- Color-coded units (green = yours, red = enemy, yellow = ally)
- Click to jump camera to that location
- Alerts (red dots) show where action is happening

### Entity Interface
**Minimap = Entity Graph Overview**

```
┌─────────────────────────────────┐
│  Entity Relationship Minimap    │
│                                 │
│    [Ventures]──┬──[Hypotheses]  │
│                │                │
│                ├──[Assumptions] │
│                │                │
│                └──[Experiments] │
│                                 │
│  Legend:                        │
│  🟢 Validated                   │
│  🟡 In Progress                 │
│  🔴 Invalidated                 │
│  ⚪ Not Started                 │
└─────────────────────────────────┘
```

**Features:**
- See all entities across all ventures simultaneously
- Color-coded by validation state
- Clustered by entity type or venture
- Click to zoom into detail view
- Red pulses = evidence conflicts detected
- Size = number of linked entities (bigger nodes have more connections)

**Use Cases:**
- "Where do I have invalidated hypotheses?" → Red clusters
- "Which ventures have the most activity?" → Densest areas
- "Are there isolated entities?" → Disconnected nodes
- Quick navigation across large entity sets

---

## 2. Selection Panel

### StarCraft
- Bottom-center of screen
- Shows detailed stats for selected unit(s)
- Single unit: Full details (HP, armor, upgrades, abilities)
- Multiple units: Shared stats + wireframe grid

### Entity Interface
**Selection Panel = Entity Inspector**

**Single Entity Selected:**
```
┌─────────────────────────────────────────┐
│ Hypothesis: "Users want dark mode"     │
├─────────────────────────────────────────┤
│ Status: 🟡 Testing (Experiment #3)     │
│ Confidence: ████████░░ 85%             │
│ Evidence: 4 supporting, 1 contradicting│
│                                         │
│ Links:                                  │
│  → Tests: Assumption #12               │
│  → Derived from: Canvas Item #5        │
│  → Tested by: Experiment #3, #7        │
│                                         │
│ Last Updated: 2 days ago               │
└─────────────────────────────────────────┘
```

**Multiple Entities Selected (Mixed Types):**
```
┌─────────────────────────────────────────┐
│ 12 entities selected                    │
├─────────────────────────────────────────┤
│ Wireframe:                              │
│ [H] [H] [H] [E] [E] [A] [A] [A]        │
│ [A] [C] [C] [C]                        │
│                                         │
│ Types: 3 Hypotheses, 2 Experiments,    │
│        5 Assumptions, 3 Canvas Items   │
│                                         │
│ Bulk Actions:                          │
│ [ Tag All ] [ Link to... ] [ Export ]  │
└─────────────────────────────────────────┘
```

**Key:** H=Hypothesis, E=Experiment, A=Assumption, C=Canvas Item

---

## 3. Command Card

### StarCraft
- Bottom-right grid of buttons
- Context-sensitive: Shows abilities available to selected unit(s)
- Grouped by type (basic commands, special abilities, build options)
- Hotkeys (Q, W, E, R for row 1, etc.)

### Entity Interface
**Command Card = Contextual Actions**

**Hypothesis Selected:**
```
┌─────────────────────────────┐
│ Q: Create     │ W: Link     │
│    Experiment │    Evidence │
├───────────────┼─────────────┤
│ A: Update     │ S: Mark     │
│    Status     │    Invalid  │
├───────────────┼─────────────┤
│ Z: View Graph │ X: Duplicate│
└─────────────────────────────┘
```

**Assumption Selected:**
```
┌─────────────────────────────┐
│ Q: Create     │ W: Add      │
│    Hypothesis │    Evidence │
├───────────────┼─────────────┤
│ A: Edit       │ S: Archive  │
├───────────────┼─────────────┤
│ Z: View Tests │ X: Clone    │
└─────────────────────────────┘
```

**Features:**
- Muscle memory: Same hotkey positions for similar actions across types
- Q often = "Create related entity"
- W often = "Add evidence/link"
- Z often = "View relationships"
- Disabled buttons grayed out (can't create experiment for invalidated hypothesis)

---

## 4. Control Groups (Hotkeys)

### StarCraft
- Select units, press Ctrl+Number to save group
- Press Number to select that group instantly
- Double-tap Number to jump camera to group
- Up to 10 groups (0-9)

### Entity Interface
**Control Groups = Saved Entity Collections**

```
Ctrl+1 → "Critical Path Hypotheses" (your top priorities)
Ctrl+2 → "This Sprint's Experiments"
Ctrl+3 → "Invalidated Items Needing Review"
Ctrl+4 → "Venture A Core Assumptions"
...
Ctrl+9 → "Recently Modified"
Ctrl+0 → "All Unvalidated"
```

**Workflows:**
1. Select 5 hypotheses you're focused on this week
2. Press Ctrl+1 to save as group
3. Throughout week, press 1 to instantly select them all
4. See their collective status in selection panel
5. Run bulk actions via command card

**Smart Defaults:**
- System could auto-populate common groups
- Groups persist across sessions
- Groups can be shared with team

---

## 5. Wireframe Grid

### StarCraft
- When multiple units selected, shows small icon for each
- Quickly see composition of selection
- Click individual icons to inspect specific units
- Visual confirmation of what you're about to command

### Entity Interface
**Wireframe = Selection Composition**

```
Selected: 18 entities

┌────┬────┬────┬────┬────┬────┐
│ H1 │ H2 │ H3 │ H4 │ H5 │ H6 │
├────┼────┼────┼────┼────┼────┤
│ E1 │ E2 │ E3 │ E4 │ A1 │ A2 │
├────┼────┼────┼────┼────┼────┤
│ A3 │ A4 │ A5 │ A6 │ C1 │ C2 │
└────┴────┴────┴────┴────┴────┘

Click any box to inspect that entity
Right-click to remove from selection
```

**Visual Encoding:**
- Color = validation state (green/yellow/red)
- Border = entity type
- Icon = entity subtype
- Pulsing = has recent updates

**Use Case:**
"I selected a bunch of entities from the graph. What did I actually grab?"
The wireframe gives instant visual confirmation before you apply bulk actions.

---

## 6. Resource Display

### StarCraft
- Top-right: Minerals, Vespene Gas, Supply
- Always visible, critical information
- Color changes when resources are low

### Entity Interface
**Resources = Attention & Validation Budget**

```
┌──────────────────────────────────┐
│ 🎯 Focus: 12/20 entities         │
│ ✅ Validated: 45%                │
│ 🔬 Active Experiments: 3/5       │
│ 📊 Evidence Quality: ████░ 82%   │
└──────────────────────────────────┘
```

**Metrics:**
- **Focus** - Number of entities you're actively managing (like supply cap)
- **Validated** - % of entities with supporting evidence
- **Active Experiments** - Running experiments vs your capacity
- **Evidence Quality** - Average confidence scores across evidence

**Warning States:**
- Red flash when you exceed focus capacity
- Yellow when validation % drops below threshold
- Pulse when experiments complete and need review

---

## 7. Tab Panels & Subgroups

### StarCraft
- Building selected? Tab shows production queue
- Barracks? Shows units being trained + queue
- Can add to queue, cancel units, adjust rally point

### Entity Interface
**Tabs = Entity Relationships**

**Hypothesis Selected → Tabs Show:**
```
┌─────────────────────────────────────────┐
│ [Overview] [Evidence] [Experiments]     │
│            [Linked Items] [History]     │
├─────────────────────────────────────────┤
│  Evidence Tab (4 items):                │
│                                         │
│  ✅ User survey (n=50) - 90% conf      │
│  ✅ Analytics spike - 75% conf         │
│  ❌ Interview feedback - 60% conf      │
│  ✅ Competitor analysis - 85% conf     │
│                                         │
│  Overall: 3 supporting, 1 contradicting│
└─────────────────────────────────────────┘
```

**Quick Actions in Tab:**
- Click evidence to expand details
- Drag to reorder by strength
- Right-click for context menu (edit, delete, flag)
- Inline add new evidence

---

## 8. Alerts & Notifications

### StarCraft
- "Your base is under attack!" (red alert)
- "Construction complete" (notification)
- "Unit ready" (production alert)
- "Not enough minerals" (warning)

### Entity Interface
**Alerts = System Events**

```
🔴 CRITICAL: Hypothesis #14 invalidated by new evidence
🟡 UPDATE: Experiment #7 completed - results available
🟢 SUCCESS: 5 assumptions validated this week
⚠️  WARNING: Canvas Item #23 has conflicting links
```

**Alert Types:**
1. **Invalidation detected** - Evidence contradicts hypothesis
2. **Experiment completion** - Results need review
3. **Orphaned entities** - Links broken, entity isolated
4. **Conflict detection** - Multiple experiments contradict each other
5. **Threshold breached** - Validation % below target

**Click alert to:**
- Jump to affected entity
- See full context
- Take remedial action

---

## 9. Camera Control

### StarCraft
- Arrow keys/edge scroll to pan
- Spacebar to jump to last alert
- F1-F4 to jump to bases
- Click minimap to jump to location
- Scroll wheel to zoom (SC2)

### Entity Interface
**Camera = View Focus**

**Pan:** Navigate entity graph spatially
**Jump to Alert:** Spacebar → latest validation conflict
**Jump to Anchors:** F1-F4 → key ventures or workflows
**Minimap Click:** Jump to cluster of entities
**Zoom:** Scroll to see more/less detail

**Zoom Levels:**
1. **Strategic (Far)** - See all ventures, high-level clusters
2. **Operational (Mid)** - See entity types, link types
3. **Tactical (Close)** - See individual entity details, evidence

**Smooth Transitions:**
Like StarCraft camera movement, panning between views should be animated so you maintain spatial awareness of where you are in the graph.

---

## 10. Production Queue / Build Orders

### StarCraft
- Queue up 5 Marines at Barracks
- See production progress as a queue
- Cancel, reorder, or add to queue

### Entity Interface
**Queue = Validation Pipeline**

**Venture "Mobile App" Pipeline:**
```
┌─────────────────────────────────────┐
│ Validation Queue (6 items)          │
├─────────────────────────────────────┤
│ 1. ⏳ Testing H#12 (Exp #4) - 60%  │
│ 2. 📋 Queued: Test H#13 (Exp #5)   │
│ 3. 📋 Queued: Validate A#8         │
│ 4. 📋 Queued: Test H#14            │
│ 5. 📋 Queued: Collect evidence A#9 │
│ 6. 📋 Queued: Survey for CP#2      │
│                                     │
│ [+ Add to Queue]  [Reorder]        │
└─────────────────────────────────────┘
```

**Features:**
- Drag to reorder priority
- Cancel queued validations
- Estimated completion based on effort
- Blockers highlighted (can't test H#14 until H#13 validated)

---

## Summary: Power of Literal Mappings

These aren't just visual metaphors - they're **proven interaction patterns** for managing complexity:

1. **Minimap** - Situational awareness across large datasets
2. **Selection** - Inspect what you're about to operate on
3. **Command Card** - Context-sensitive actions with muscle memory
4. **Control Groups** - Instant access to important subsets
5. **Wireframe** - Visual confirmation of selection composition
6. **Resources** - Always-visible constraints and budgets
7. **Tabs** - Related information grouped logically
8. **Alerts** - System draws attention to what matters
9. **Camera** - Navigate spatial representation of data
10. **Queue** - Planned sequence of operations

**Next:** See `abstract-mappings.md` for deeper conceptual parallels.
