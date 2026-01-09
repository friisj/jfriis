# Abstract Mappings: RTS Concepts → Entity Management

**How StarCraft's systemic mechanics could inform entity management paradigms**

---

## 1. Fog of War = Epistemic Uncertainty

### StarCraft Concept
- Map starts black (unexplored)
- Scouting reveals terrain (explored but not currently visible)
- Vision reveals units (currently visible)
- Lose vision when units leave → fog returns

### Entity Management Analog
**Fog = Confidence Levels & Validation State**

```
🔳 Black (Unexplored)     → Unexamined assumption
🌫️  Dark Gray (Fog)       → Assumption stated, not tested
👁️  Light Gray (Vision)   → Actively being tested
✨ Clear (Full Vision)    → Validated with evidence
```

**Mapping:**
- **Unexplored Territory** - Problem spaces you haven't analyzed yet
- **Explored (Fog)** - Assumptions documented but not validated
- **Visible** - Currently running experiments
- **Fully Scouted** - Strong evidence, high confidence

**Interface Implications:**
1. Entity graph starts mostly "dark" (low confidence)
2. As you add evidence, areas "light up"
3. Old evidence "fogs over" (decay of relevance)
4. Need to "scout" regularly to maintain visibility
5. Can see aggregate fog level: "Your venture is 60% validated"

**Gameplay Parallel:**
StarCraft players constantly scout to avoid surprises. Product teams should constantly validate to avoid false assumptions. Both need **active maintenance of visibility**.

---

## 2. Creep Spread = Territory of Validated Knowledge

### StarCraft Concept (Zerg-specific)
- Creep is purple terrain spread by Zerg structures
- Buildings can only be built on creep
- Creep slowly spreads from tumors
- Controlling creep = controlling map presence

### Entity Management Analog
**Creep = Evidence-Backed Territory**

Visualize the entity graph with "validated zones":

```
Legend:
🟣 = Validated cluster (creep)
⬜ = Unvalidated space
🟡 = Contested (conflicting evidence)

     [Venture Core]──🟣🟣🟣──[Hypothesis A]
           │          🟣
           │          🟣
     ⬜⬜⬜├──────🟡🟡──[Hypothesis B] (contested!)
           │
           └──⬜⬜⬜⬜──[Assumption X] (isolated!)
```

**Validated clusters** (creep-covered):
- Tightly linked entities with strong evidence
- Can safely build new hypotheses on this foundation
- Represents "ground truth" you control

**Unvalidated space** (no creep):
- Isolated assumptions
- Weak evidence links
- Risky to build on

**Contested zones** (mixed):
- Conflicting evidence
- Multiple experiments with different results
- Like creep touching opponent's buildings

**Strategic Goals:**
1. **Expand your creep** - Validate more assumptions
2. **Connect creep clusters** - Link validated areas
3. **Deny opponent's creep** - Invalidate competitor assumptions
4. **Protect your creep** - Maintain evidence quality

**Interface Implications:**
- Graph visualization shows "heat map" of validation
- Purple glow around validated entity clusters
- Red glow around invalidated clusters
- Can measure "validation territory" as a metric

---

## 3. Supply Cap = Attention Budget

### StarCraft Concept
- Each unit costs supply (Marines = 1, Tanks = 2, etc.)
- Maximum supply = 200
- Must build supply structures (Depots, Pylons, Overlords)
- When supply-capped, can't build more units
- Strategic choice: What unit composition to maintain?

### Entity Management Analog
**Supply = Cognitive Load / Attention Capacity**

```
🧠 Mental Supply: 47 / 50

   12 Hypotheses      (@ 2 supply each = 24)
    8 Experiments     (@ 1 supply each = 8)
   15 Assumptions     (@ 1 supply each = 15)
   ─────────────────────────────────────────
   Total: 47 supply used

   ⚠️  Approaching cap! Archive or validate.
```

**Mapping:**
- **Supply Used** - Number of entities requiring active management
- **Supply Cap** - Your realistic attention capacity
- **Supply Cost** - Complexity weight of entity type
  - Simple assumption = 1
  - Active hypothesis under test = 2
  - Complex experiment = 3

**Strategic Decisions:**
1. **Hit supply cap?** Must archive, validate, or delegate entities
2. **Low-supply unit composition** - Many simple assumptions
3. **High-supply composition** - Few complex experiments
4. **Increase cap** - Bring in team members (more overlords)

**Interface Implications:**
- Supply meter always visible (top-right)
- Entities have visible "supply cost"
- Creating entity shows how it affects supply
- Validation/archival frees supply
- Warning when approaching cap
- Team view shows combined supply across members

**Psychological Truth:**
You *cannot* meaningfully track 200 hypotheses simultaneously. StarCraft teaches this brutally - exceed 200 supply and performance degrades. Same with cognitive load.

---

## 4. Tech Tree = Validation Dependency Graph

### StarCraft Concept
- Must build Barracks before Factory
- Must build Factory before Starport
- Some units require specific tech buildings
- Research upgrades unlock in sequence

### Entity Management Analog
**Tech Tree = Hypothesis Dependencies**

```
[Assumption: "Market exists"]
         │
         ├─ Blocks → [Hypothesis: "We can reach market"]
         │                │
         │                ├─ Enables → [Experiment: "Ad campaign"]
         │                │
         │                └─ Enables → [Experiment: "SEO test"]
         │
         └─ Blocks → [Hypothesis: "Market will pay"]
                          │
                          └─ Enables → [Experiment: "Price test"]
```

**Dependency Rules:**
- Can't test "market will pay" until "market exists" is validated
- Invalidating root assumption cascades down tree
- Some experiments require multiple assumptions validated (AND gate)
- Some hypotheses are alternative approaches (OR gate)

**Tech Tree States:**
- 🔒 **Locked** - Dependencies not met
- 🟡 **Available** - Can start testing now
- ⏳ **In Progress** - Currently testing
- ✅ **Completed** - Validated
- ❌ **Invalidated** - Path blocked

**Interface Implications:**
- Visual tree showing what's buildable now
- Gray out locked experiments
- Highlight newly available paths after validation
- Show critical path (must-validate sequence)
- Warn before invalidating entities with dependents

**Strategic Gameplay:**
StarCraft players optimize "build orders" - the sequence of buildings to construct. Product teams need optimized "validation orders" - the sequence of experiments to run.

---

## 5. APM (Actions Per Minute) = Validation Velocity

### StarCraft Concept
- APM measures how many commands player issues per minute
- Pro players: 300+ APM
- Beginners: 50-100 APM
- More APM ≠ better (efficiency matters), but it's an indicator

### Entity Management Analog
**APM = Evidence Collection Rate**

```
📊 Your Stats This Week:

   Evidence Added: 12
   Experiments Started: 3
   Hypotheses Updated: 8
   Links Created: 15
   ───────────────────────
   Validation APM: 38 actions

   Team Average: 45 actions
   Top Performer: 67 actions (Sarah)
```

**Metrics:**
- **Raw APM** - Total entity operations per time period
- **Effective APM** - Operations that advance validation (not busywork)
- **Validation Velocity** - Rate of confidence increase across portfolio

**Anti-Patterns:**
- High APM, low progress (like clicking randomly in StarCraft)
- Creating entities without evidence (supply-blocked)
- Updating same entities repeatedly (micro without macro)

**Interface Implications:**
- Dashboard showing validation velocity
- Compare to team baseline
- Identify bottlenecks (low APM periods)
- Celebrate high-impact actions (experiment completion = big APM spike)

---

## 6. Macro vs Micro = Strategic vs Tactical Views

### StarCraft Concept
- **Macro** - Economy, production, tech progression (strategic)
- **Micro** - Unit control in battles (tactical)
- Bad players: All micro, no macro → lose to economy
- Good players: Balance both
- Pro players: Excellent macro + micro under time pressure

### Entity Management Analog

**Macro = Portfolio Health**
```
Strategic View (Macro):
- Overall validation percentage
- Evidence quality trends
- Resource allocation
- Pipeline health
- Critical path status
```

**Micro = Entity Details**
```
Tactical View (Micro):
- Individual hypothesis wording
- Experiment design
- Evidence interpretation
- Link types and strength
- Confidence calculations
```

**Interface Implications:**
- **F1 key** - Jump to macro view (portfolio dashboard)
- **F2 key** - Jump to micro view (selected entity detail)
- **Contextual zoom** - Scroll wheel zooms between macro/micro
- **Alerts pull you to micro** - "Entity needs attention!"
- **Timer returns you to macro** - "Check pipeline every 5 min"

**Common Failure Modes:**
1. **All Macro** - Never dig into entity details, make uninformed decisions
2. **All Micro** - Obsess over one hypothesis, lose sight of portfolio
3. **Macro → Micro → Lost** - Zoom into detail, forget strategic context

**Solution:**
Like StarCraft, develop **rhythm**: Macro → Micro → Macro → Micro. Check portfolio, act on detail, return to portfolio, repeat.

---

## 7. Scouting = Discovery & Research

### StarCraft Concept
- Send worker or fast unit to explore
- Reveals enemy base location, tech choices, unit composition
- Continual scouting to track enemy progress
- Counter-scouting to deny information

### Entity Management Analog
**Scouting = User Research & Market Validation**

**Scout Types:**
```
Worker Scout (early game):
→ User interviews (cheap, basic info)

Fast Unit Scout (mid game):
→ Surveys (broader coverage, less depth)

Cloaked Scout (late game):
→ Analytics (ongoing invisible monitoring)

Scan (one-time reveal):
→ Competitor analysis (expensive, limited use)
```

**What Scouting Reveals:**
- User needs (like enemy unit composition)
- Market dynamics (like enemy tech choices)
- Competitive landscape (like enemy base locations)
- Behavioral patterns (like enemy attack timing)

**Interface Implications:**
- "Scout report" entities (interview insights)
- Map of "explored" customer segments
- Timeline of scouting activities
- Alerts when new information discovered
- "Counter-scouting" - privacy concerns, NDA limits

---

## 8. Cheese = Risky Validation Shortcuts

### StarCraft Concept
- "Cheese" - High-risk, high-reward strategies
- Cannon rush, proxy barracks, 6-pool
- If defended, you're behind; if it works, instant win
- Relies on opponent not scouting

### Entity Management Analog
**Cheese = Assumption-Heavy Product Launches**

```
🧀 Classic Cheese Strategies:

1. "Ship it and see" - Launch without validation
2. "Founder intuition" - Skip research, trust gut
3. "Copy competitor" - Assume their validation applies
4. "Viral or die" - All-in on growth hack
```

**When Cheese Works:**
- Market window closing fast
- Low cost to test
- Informed intuition (actually have domain expertise)

**When Cheese Fails:**
- Critical assumptions wrong
- Defensible moat absent
- Didn't scout (no user research)

**Interface Implications:**
- Flag "unvalidated launch paths" as ⚠️ RISKY
- Show confidence level for entire venture
- Warn: "You're going all-in with 23% validation"
- Success rate stats for similar "cheese" paths

**Strategic Wisdom:**
Cheese sometimes wins games, but you can't rely on it. Solid macro (validation) beats cheese long-term.

---

## 9. Expand or Die = Evidence Decay

### StarCraft Concept
- Can't survive on one base forever
- Must expand to new resource locations
- Mining depletes; must constantly seek new patches
- Late-game map control determines winner

### Entity Management Analog
**Expand = Continuous Validation**

```
⏰ Evidence Freshness:

[Hypothesis: "Users want feature X"]
├─ Evidence: User survey (6 months old) ⚠️ STALE
├─ Evidence: Interview (3 months old) ⚠️ AGING
├─ Evidence: Analytics (1 week old) ✅ FRESH
└─ Evidence: A/B test (today) ✅ FRESH

Overall: 🟡 Needs refresh
```

**Evidence Decay:**
- Research older than 6 months "mines out"
- Market conditions change
- User preferences shift
- Competitor moves invalidate assumptions

**Interface Implications:**
- Evidence freshness indicators
- Alerts: "3 hypotheses need re-validation"
- Automatic confidence decay over time
- "Expand validation" reminders
- Show trending: Confidence going up or down?

**Strategic Imperative:**
Like StarCraft economy, validation requires continuous effort. One-time research isn't enough - you must "expand" to new evidence sources constantly.

---

## 10. Build Orders = Validated Playbooks

### StarCraft Concept
- "Build order" - Optimized sequence of buildings/units
- E.g., "1 Rax FE" (One Barracks Fast Expand)
- Memorized sequences that pros execute perfectly
- Variations for different matchups
- Tested through thousands of games

### Entity Management Analog
**Build Orders = Validation Playbooks**

```
📖 Playbook: "SaaS MVP Validation"

Sequence:
1. Validate: Problem exists (interviews, n=10)
2. Validate: Problem is painful (willingness-to-pay survey)
3. Validate: Our solution is desired (landing page test)
4. Validate: Solution is usable (prototype testing, n=5)
5. Validate: Solution is valuable (beta cohort, $)
6. Validate: Solution scales (onboarding funnel metrics)

Expected Timing: 8-12 weeks
Success Rate: 68% (based on 50 similar ventures)
```

**Playbook Types:**
- **Early SaaS** - Problem → Solution → Market
- **Marketplace** - Chicken-egg sequencing
- **Hardware** - Technical → Desirability → Manufacturing
- **Platform** - Developer adoption → User acquisition

**Interface Implications:**
- Library of playbooks (like StarCraft build orders)
- Templated entity creation following playbook
- Progress tracker: "Step 3 of 6 complete"
- Deviation warnings: "Off-script, playbook success rate drops"
- Custom playbooks based on your history

**Strategic Value:**
StarCraft players don't invent build orders mid-game - they execute memorized, validated sequences. Product teams shouldn't reinvent validation sequences - use proven playbooks.

---

## 11. Matchup Knowledge = Domain Expertise

### StarCraft Concept
- Terran vs Zerg requires different strategy than Terran vs Protoss
- "Matchup" knowledge crucial - same race, different opponent
- Unit counters: Marines beat Zerglings, Banelings beat Marines
- Map-specific strategies

### Entity Management Analog
**Matchups = Market Contexts**

```
🎮 Validation Strategy Matchups:

Your Venture Type    vs    Market Type
─────────────────────────────────────────
B2B SaaS            →    Enterprise buyers
  → Long validation cycles, pilot programs

B2C Mobile          →    Consumer market
  → Rapid testing, viral loops, retention

Marketplace         →    Two-sided platform
  → Chicken-egg sequencing, network effects

Hardware            →    Manufacturing reality
  → Technical validation first, market second
```

**Interface Implications:**
- Select venture type + market context
- System suggests appropriate evidence types
- Warns about context mismatches
  - ⚠️ "Using B2C playbook for B2B venture - risky!"
- Success benchmarks specific to matchup
- Playbooks filtered by relevant matchups

---

## 12. Perfect Information vs Fog = Evidence Completeness

### StarCraft Contrast
- Chess = Perfect information (see entire board)
- StarCraft = Fog of war (limited information)
- Managing uncertainty is core skill

### Entity Management Analog
**Product development operates under StarCraft-like fog:**

```
What You Can See:
✅ Your own entities & evidence
✅ Public competitor moves
✅ Market research you've conducted

Hidden Under Fog:
❌ Competitor internal data
❌ User thoughts you haven't researched
❌ Future market shifts
❌ Unknown unknowns
```

**Interface Implications:**
- Explicitly mark information sources
  - 👁️ "First-hand" (your research)
  - 👥 "Second-hand" (reports, studies)
  - 🤷 "Assumed" (unverified)
- Confidence automatically lower for foggy areas
- Highlight "blind spots" - entity clusters with low evidence
- Recommend where to scout next

**Philosophical Point:**
You will never have perfect information. StarCraft players win by making good decisions under uncertainty. Product teams must do the same - the interface should make uncertainty visible, not hide it.

---

## Summary: System-Level Insights

These abstract mappings reveal **deep structural parallels**:

| StarCraft Mechanic | Entity Management Analog | Key Insight |
|-------------------|-------------------------|-------------|
| Fog of War | Epistemic uncertainty | Make uncertainty visible |
| Creep Spread | Validated knowledge territory | Expand evidence systematically |
| Supply Cap | Attention budget | Respect cognitive limits |
| Tech Tree | Validation dependencies | Sequence matters |
| APM | Validation velocity | Measure momentum |
| Macro/Micro | Strategic/Tactical views | Maintain both contexts |
| Scouting | User research | Continuous discovery |
| Cheese | Risky shortcuts | Quantify risk explicitly |
| Expand or Die | Evidence decay | Validation is ongoing |
| Build Orders | Validated playbooks | Learn from patterns |
| Matchups | Market contexts | Context determines strategy |
| Fog vs Perfect Info | Evidence completeness | Embrace uncertainty |

**Core Philosophy:**

StarCraft is a **resource management game under uncertainty**. So is product development. The interface patterns that help players manage 200 units while maintaining strategic coherence can inform how we manage 200 entities while maintaining validation coherence.

**Next:** See `worked-example.md` for a concrete walkthrough of these concepts in action.
