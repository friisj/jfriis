# Worked Example: Managing a Venture with StarCraft Interface Patterns

**Scenario:** You're developing "TaskFlow" - a B2B SaaS project management tool. You have 47 entities across assumptions, hypotheses, experiments, canvas items, and journeys. Let's walk through a day of management using StarCraft-inspired patterns.

---

## Morning: Strategic Review (Macro)

### 9:00 AM - Open Interface

**Minimap appears (top-right):**
```
TaskFlow Entity Graph:
       [Core Value Prop]
           /    |    \
    [Customer] [Jobs] [Pains]
         |       |       |
    [Hypotheses cluster - 12 items]
         |
    [Experiments - 5 active, 3 queued]
         |
    [Evidence - scattered connections]

Color coding:
🟢 15 validated (32%)
🟡 23 in-progress (49%)
🔴 4 invalidated (9%)
⚪ 5 not started (10%)
```

**Resource Display (top-left):**
```
🎯 Focus: 47/50 entities (⚠️ Near cap!)
✅ Validated: 32%
🔬 Active Experiments: 5/5 (🔴 At capacity!)
📊 Evidence Quality: ████████░░ 82%
```

**Immediate Insights:**
1. Validation is low (32% - target is 60%)
2. You're near attention capacity
3. Experiment slots full - can't start new tests
4. Evidence quality good but could improve

### 9:05 AM - Press F1 for Macro Dashboard

**Portfolio Health Screen:**
```
┌────────────────────────────────────────┐
│ TaskFlow Venture Dashboard             │
├────────────────────────────────────────┤
│ Critical Path Status:                  │
│ ✅ Step 1: Problem validation          │
│ 🟡 Step 2: Solution validation (60%)   │
│ 🔴 Step 3: Market validation (BLOCKED) │
│                                        │
│ Blockers:                              │
│ • Experiment #3 needs completion       │
│ • 4 hypotheses invalidated - need pivot│
│ • Customer profile incomplete          │
│                                        │
│ Recommendations:                       │
│ 1. Review invalidated hypotheses       │
│ 2. Complete Experiment #3              │
│ 3. Archive old assumptions (free supply)│
└────────────────────────────────────────┘
```

**Decision:** Focus on invalidated hypotheses first (red cluster on minimap).

---

## Mid-Morning: Tactical Work (Micro)

### 9:15 AM - Click Red Cluster on Minimap

Camera jumps to invalidated entities. Graph zooms to show detail:

```
🔴 Invalidated Cluster (4 items):

[H#12: "Users want Gantt charts"]
  ❌ Evidence: User interviews (8/10 said "not needed")
  ❌ Evidence: Survey results (72% prefer Kanban)
  Links:
    → Tests: A#8 (Timeline features critical)
    → Derived from: Canvas Item "Pain Reliever #3"

[H#15: "Teams will pay $50/user/month"]
  ❌ Evidence: Pricing survey (max $30)
  ❌ Evidence: Competitor analysis ($20-35 range)
  Links:
    → Tests: A#12 (Market size assumptions)
    → Blocks: Experiment #7 (Pricing test)
```

### 9:20 AM - Select All Invalidated (Box Select)

**Wireframe Grid appears:**
```
Selected: 4 entities
┌────┬────┬────┬────┐
│ H12│ H15│ H18│ H22│
└────┴────┴────┴────┘
All red (invalidated)
```

**Command Card shows:**
```
┌──────────────────────────┐
│ Q: Pivot      │ W: Archive│
│    Hypothesis │    All    │
├───────────────┼───────────┤
│ A: View       │ S: Export │
│    Dependencies│    Report │
└──────────────────────────┘
```

Press **Q** (Pivot Hypothesis) for each:

### 9:25 AM - Pivot H#12

**Pivot Dialog:**
```
┌─────────────────────────────────────────┐
│ Pivot: H#12 "Users want Gantt charts"  │
├─────────────────────────────────────────┤
│ Evidence suggests:                      │
│ • Users prefer Kanban (72%)            │
│ • Gantt seen as "too complex"          │
│                                         │
│ Suggested Pivot:                       │
│ "Users want flexible views (Kanban,    │
│  List, Calendar) not just Gantt"       │
│                                         │
│ This will:                             │
│ • Update H#12 text                     │
│ • Mark original as "pivoted"           │
│ • Preserve evidence links              │
│ • Update dependent experiments         │
│                                         │
│ [Confirm Pivot] [Edit Manually]        │
└─────────────────────────────────────────┘
```

Confirm. System updates:
- H#12 text changed
- Status: 🔴 Invalidated → 🟡 Needs Testing
- Dependencies updated
- Supply freed: 4 units (complex hypothesis reduced to simple one)

**Alert appears:**
```
✨ INSIGHT: Pivoting H#12 unblocked:
   • Experiment #7 (now can proceed)
   • Hypothesis #20 (dependency resolved)

   [View Changes] [Dismiss]
```

### 9:35 AM - Review Changes on Minimap

**Minimap updates in real-time:**
- Red cluster partially cleared (1 red → 3 yellow)
- Green lines show newly unblocked experiments
- Pulsing yellow indicates "ready to test"

**Resource Display updates:**
```
🎯 Focus: 43/50 entities (✅ Buffer restored!)
✅ Validated: 33% (↑ 1%)
🔬 Active Experiments: 4/5 (✅ Slot available!)
📊 Evidence Quality: ████████░░ 82%
```

---

## Late Morning: Queue Management

### 10:00 AM - Check Experiment Queue (Tab Panel)

Select "Experiments" control group (press **2** - saved as Ctrl+2):

**Queue View:**
```
┌─────────────────────────────────────────┐
│ Experiment Queue (7 items)              │
├─────────────────────────────────────────┤
│ ACTIVE (5/5 capacity):                  │
│ 1. ⏳ E#3: Pricing survey - 85% done   │
│ 2. ⏳ E#4: Onboarding test - 40% done  │
│ 3. ⏳ E#5: Feature usage tracking - 20%│
│ 4. ⏳ E#6: Competitor comparison - 90% │
│ 5. ⏳ E#7: Integration tests - 10%     │
│                                         │
│ QUEUED (3):                            │
│ 6. 📋 E#8: User interviews (needs H#12)│
│ 7. 📋 E#9: Analytics validation        │
│ 8. 📋 E#10: Beta feedback collection   │
│                                         │
│ [+ Add] [Reorder] [Cancel]             │
└─────────────────────────────────────────┘
```

**Decision:** E#3 and E#6 are almost done. Check them first.

### 10:05 AM - Click E#3 (Pricing Survey)

**Detail View:**
```
┌─────────────────────────────────────────┐
│ Experiment #3: Pricing Survey           │
├─────────────────────────────────────────┤
│ Status: ⏳ 85% complete (42/50 responses)│
│ Tests: H#15 (pricing hypothesis)        │
│                                         │
│ Preliminary Results:                    │
│ • Median willingness-to-pay: $28/user  │
│ • Preferred: $25-30 range (68%)        │
│ • Premium tier interest: 34%           │
│                                         │
│ Evidence Generated:                     │
│ ✅ Survey response (n=42) - 85% conf   │
│                                         │
│ [Mark Complete] [View Raw Data]        │
└─────────────────────────────────────────┘
```

**Press Enter to Mark Complete.**

**Alert:**
```
🎉 EXPERIMENT COMPLETE!

Results: H#15 partially validated
   Original: "$50/user/month"
   Revised: "$28/user/month"

Evidence added:
   • Survey (n=50, conf: 88%)

Cascading effects:
   • A#12 (Market size) needs update
   • Canvas: BMC Revenue needs revision
   • H#20 now testable (was blocked)

[Update Dependencies] [Dismiss]
```

**Click "Update Dependencies".**

System propagates changes:
- H#15 status: 🔴 Invalidated → 🟢 Validated (with revision)
- Evidence linked automatically
- Dependent entities flagged for review
- Supply: Experiment completes, frees 3 units

### 10:15 AM - Minimap View

**Visual update:**
```
Minimap now shows:
🟢 16 validated (37% ↑)
🟡 24 in-progress
🔴 3 invalidated
⚪4 not started

Experiment cluster shifts:
└─[Pricing]─✅ (was red, now green!)
```

**Resource Display:**
```
🎯 Focus: 40/50 entities
✅ Validated: 37% (↑5% today!)
🔬 Active Experiments: 4/5
📊 Evidence Quality: ████████░░ 83%
```

---

## Afternoon: Expansion & Scouting

### 2:00 PM - Evidence Decay Alert

**Alert appears:**
```
⚠️ EVIDENCE AGING:

3 hypotheses have stale evidence:
• H#7: Customer interviews 7 months old
• H#9: Market research 9 months old
• H#14: Competitor analysis 5 months old

Confidence auto-reduced:
   H#7: 85% → 70% (-15%)
   H#9: 90% → 75% (-15%)
   H#14: 80% → 68% (-12%)

Recommendation: Schedule new validation
[Create Scout Mission] [Dismiss]
```

**Click "Create Scout Mission".**

**Scout Mission Creator:**
```
┌─────────────────────────────────────────┐
│ New Scout Mission                       │
├─────────────────────────────────────────┤
│ Target: Customer segment understanding  │
│                                         │
│ Scout Type:                             │
│ [•] User Interviews (5-10 participants) │
│ [ ] Survey (50+ responses)              │
│ [ ] Analytics Review (passive)          │
│ [ ] Competitor Analysis (desk research) │
│                                         │
│ Entities to Re-validate:                │
│ ☑️ H#7 (Customer pain points)          │
│ ☑️ H#9 (Market size)                   │
│ ☐ H#14 (Competitor features)           │
│                                         │
│ Resources:                              │
│ Time: ~2 weeks                          │
│ Supply Cost: 3 units                    │
│                                         │
│ [Add to Queue] [Cancel]                 │
└─────────────────────────────────────────┘
```

Add to queue. New experiment E#11 created.

---

## Late Afternoon: Control Groups & Hotkeys

### 4:00 PM - Quick Status Checks

You've set up control groups throughout the project:

**Press 1:** "Critical Path" (8 entities)
- Shows: All must-validate hypotheses for MVP
- Status: 6/8 validated
- Action: Focus on remaining 2

**Press 2:** "Active Experiments" (4 entities)
- Shows: Currently running tests
- Status: All progressing normally
- Action: None needed

**Press 3:** "Invalidated Review" (3 entities)
- Shows: Items needing pivot or archive
- Status: 3 pivoted earlier today
- Action: Archive if no longer relevant

**Press 4:** "This Sprint" (12 entities)
- Shows: Items committed for 2-week sprint
- Status: 9/12 complete
- Action: Push remaining 3 or reschedule

**Press 5:** "Customer Profile Dependencies" (6 entities)
- Shows: Canvas items depending on CP completion
- Status: Blocked until CP updated
- Action: Escalate CP completion

### 4:10 PM - Bulk Actions via Wireframe

**Press 3** (Invalidated Review group):

```
Selected: 3 entities
┌────┬────┬────┐
│ H18│ H22│ A15│
└────┴────┴────┘
```

**Command Card:**
```
┌──────────────────────────┐
│ Q: Bulk     │ W: Export   │
│    Archive  │    All      │
├─────────────┼─────────────┤
│ A: Tag All  │ S: Link to..│
└──────────────────────────┘
```

**Press Q (Bulk Archive).**

Confirmation:
```
Archive 3 entities?

This will:
• Move to archive (not deleted)
• Preserve all evidence links
• Free 6 supply units
• Notify linked entity owners

⚠️ Warning: A15 has 3 dependents
   Review dependencies first?

[Review Dependencies] [Archive Anyway] [Cancel]
```

**Click "Review Dependencies".**

Dependency tree appears showing A15 blocks 2 experiments. Decide to keep A15, archive only H18 and H22.

Final confirmation → 4 supply units freed.

---

## End of Day: Macro Review

### 5:30 PM - Press F1 (Macro Dashboard)

**Daily Summary:**
```
┌────────────────────────────────────────┐
│ TaskFlow - End of Day Summary          │
├────────────────────────────────────────┤
│ Progress Today:                        │
│ • Validated: 32% → 37% (↑5%)          │
│ • Experiments: 2 completed             │
│ • Hypotheses: 3 pivoted                │
│ • Supply: 47 → 40 (freed 7)           │
│                                        │
│ Velocity:                              │
│ • Actions: 47 (team avg: 38)          │
│ • Evidence added: 8 items              │
│ • Confidence change: +12 points        │
│                                        │
│ Tomorrow's Priorities:                 │
│ 1. Complete E#6 (90% done)             │
│ 2. Update Customer Profile (blocking 6)│
│ 3. Review H#20 (newly unblocked)       │
│                                        │
│ Team Pulse: 🟢 Healthy momentum        │
└────────────────────────────────────────┘
```

**Minimap final state:**
```
🟢 16 validated (37%)
🟡 21 in-progress (52%)
🔴 0 invalidated (cleared!)
⚪ 3 not started (11%)

Validation territory expanding (purple creep):
└─[Core Value Prop]──🟣🟣🟣──[Jobs]
      └──🟣🟣──[Pains]──🟣──[Hypotheses]
```

---

## Key Patterns Demonstrated

### 1. Minimap Navigation
- Constant awareness of full entity graph
- Visual state changes (red → yellow → green)
- Quick jumping to problem areas

### 2. Macro ↔ Micro Rhythm
- F1 for strategic view (3 times today)
- Zoomed into detail when needed
- Always returned to macro context

### 3. Control Groups
- Saved 5 groups (1-5 hotkeys)
- Instant access to relevant subsets
- Muscle memory building over time

### 4. Wireframe Confirmation
- Visual check before bulk actions
- Saw exactly what would be affected
- Prevented accidental operations

### 5. Command Card Context
- Different actions per entity type
- Q consistently = primary action
- Hotkeys faster than mouse

### 6. Resource Management
- Supply cap respected (didn't exceed 50)
- Freed supply by archiving/validating
- Experiment capacity monitored

### 7. Queue System
- Clear view of active vs queued work
- Dependencies automatically flagged
- Reordering priorities visually

### 8. Evidence Decay
- System proactively flagged aging evidence
- Confidence auto-adjusted
- "Scout missions" to refresh knowledge

### 9. Cascading Updates
- Validating one entity unblocked others
- Automatic dependency propagation
- Green pulse showed newly available work

### 10. Territory Visualization
- "Purple creep" = validated clusters
- Expanding validation territory visible
- Strategic goal: Connect validated zones

---

## Comparison: Table View vs StarCraft View

### Traditional Table Interface
```
Hypotheses (Showing 1-10 of 47)
─────────────────────────────────────────
ID  | Title                  | Status
─────────────────────────────────────────
12  | Users want Gantt...    | Invalid
15  | Teams will pay $50...  | Invalid
18  | Integration critical...| Invalid
20  | Mobile app needed...   | Testing
...
```

**Problems:**
- Can't see relationships
- No spatial context
- Status is abstract text
- Must remember IDs
- No sense of progress
- Can't see system health

### StarCraft-Inspired Interface

**Minimap shows:**
- Entire entity graph
- Relationship clusters
- Color-coded status
- Progress territory
- Problem hotspots
- System health

**Result:** Made 47 entity management decisions in one day efficiently because:
1. Always knew where you were (minimap)
2. Could jump between strategic/tactical (F1/F2)
3. Had instant access to important subsets (hotkeys 1-5)
4. Saw cascading effects visually (green pulses)
5. Maintained situational awareness (resource display)

---

## Next Steps

This worked example demonstrates feasibility. Next phases:

1. **Prototype minimap** - Build entity graph visualization
2. **Implement hotkeys** - Control groups and navigation
3. **Build command card** - Context-sensitive actions
4. **Create resource display** - Attention budget metrics
5. **Test with users** - Validate interface patterns

**See `prototype-plan.md` for technical implementation roadmap.**
