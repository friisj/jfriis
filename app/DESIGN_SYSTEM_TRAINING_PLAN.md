# Design System Skills: Training Plan & Feedback Framework

## Purpose

This document establishes a **shared language and feedback loop** to iteratively develop skills for frontend design and development. We don't yet know what the design system *is* - we're discovering it through experimentation and refinement.

## Understanding: What Are Skills?

### Technical Reality
- Skills are **folders** containing a `SKILL.md` file + resources
- Claude **automatically scans and invokes** them when relevant
- Format: Markdown instructions that get loaded into context on-demand
- Location for Claude Code: `~/.claude/skills/[skill-name]/`
- Key file: `SKILL.md` containing the instructions

### What Skills Actually Do
- Provide **specialized instructions** that activate during relevant tasks
- Load **only when needed**, not permanently in context
- Can include **executable code, reference files, examples**
- Multiple skills can **compose together** automatically

## The Training Loop

```
1. DEFINE → What behavior do we want?
2. DRAFT → Write initial SKILL.md instructions
3. TEST → Use the skill on real tasks
4. OBSERVE → What worked? What didn't?
5. REFINE → Update the skill based on feedback
6. REPEAT → Until the skill produces consistent results
```

## Phase 1: Discovery & Shared Language

### Questions We Need to Answer

**About Design Direction:**
- [ ] What visual aesthetic are we targeting? (examples, references)
- [ ] What should feel distinctive about this system?
- [ ] What are the anti-patterns to avoid?
- [ ] What emotions/impressions should the design evoke?

**About Typography:**
- [ ] What font families do we want? (need specific names)
- [ ] Display vs body text - same family or different?
- [ ] What about code/mono fonts?
- [ ] Type scale philosophy - modular scale? Custom ratios?

**About Color:**
- [ ] Starting color direction? (warm/cool, vibrant/muted, etc)
- [ ] How many themes initially? (just one to start?)
- [ ] Dark mode approach? (separate palette or derived?)
- [ ] Semantic naming conventions for colors?

**About Spacing & Layout:**
- [ ] Grid philosophy? (12-column? Custom?)
- [ ] Spacing scale - T-shirt sizes (sm/md/lg) or numeric (4/8/16)?
- [ ] Container widths and breakpoints?
- [ ] Layout density - generous whitespace or compact?

**About Motion:**
- [ ] Animation personality - playful, subtle, purposeful?
- [ ] Default durations and easing?
- [ ] Which interactions deserve animation?

### First Exercise: Establishing Baseline

**Task**: Create one example component (e.g., a card) **without** any skills active.

**Goal**: See what default choices Claude makes, identify what needs guidance.

**Observation Checklist**:
- [ ] Font choices made
- [ ] Color values used
- [ ] Spacing decisions
- [ ] Animation approach
- [ ] Code structure patterns

**Debrief Questions**:
1. What about this feels generic or AI-generated?
2. What would we change to make it distinctive?
3. What patterns here do we want to encode into skills?

## Phase 2: Skill Prototyping

### Skill Structure Template

```markdown
# Skill Name

## Purpose
[One sentence: what this skill does]

## When to Use
[Specific trigger conditions]

## Core Directives

### Must Do
- [Specific, actionable rule]
- [Another rule]

### Must Not Do
- [Anti-pattern to avoid]
- [Another anti-pattern]

### Prefer
- [Best practice preference]
- [Another preference]

## Examples

### Good Example
[Code or description]

### Bad Example
[What to avoid]

## Constraints
[Hard limits, requirements, technical boundaries]
```

### Skill Candidates (To Be Defined)

**1. Typography Skill**
- **Status**: Not yet defined
- **Needs**: Font selections, type scale, hierarchy rules
- **First iteration goal**: Avoid generic fonts, establish consistent scale

**2. Color/Theme Skill**
- **Status**: Not yet defined
- **Needs**: Palette definition, semantic naming, usage rules
- **First iteration goal**: Avoid purple gradients, establish CSS variable pattern

**3. Component Pattern Skill**
- **Status**: Not yet defined
- **Needs**: File structure, prop patterns, variant systems
- **First iteration goal**: Consistent component structure, proper TypeScript

**4. Animation Skill**
- **Status**: Not yet defined
- **Needs**: Duration standards, easing preferences, use cases
- **First iteration goal**: CSS-only animations, respect reduced-motion

## Phase 3: Feedback Mechanisms

### After Each Skill Use: Rate These Dimensions

**Adherence** (1-5): Did Claude follow the skill instructions?
- 1 = Completely ignored
- 3 = Partially followed
- 5 = Perfectly followed

**Utility** (1-5): Did the skill improve the output?
- 1 = Made it worse
- 3 = No real difference
- 5 = Significantly better

**Clarity** (1-5): Were the instructions clear enough?
- 1 = Ambiguous/confusing
- 3 = Mostly clear
- 5 = Crystal clear

**Gaps** (Open): What did the skill miss? What should we add?

### Refinement Triggers

**Weak Adherence** → Instructions unclear or too vague
**Low Utility** → Wrong behaviors being encoded
**Clarity Issues** → Need better examples or more specific rules
**Gaps Identified** → Add new sections to skill

## Phase 4: Integration & Testing

### Real-World Test Cases

Once skills are drafted, test them on actual project tasks:

1. **Create new component from scratch**
   - Skills: Component Pattern, Typography, Color, Animation
   - Observe: How well do they compose?

2. **Modify existing component**
   - Skills: Same as above
   - Observe: Do they handle refactoring well?

3. **Build complete page**
   - Skills: All skills active
   - Observe: Do they create cohesive result?

### Success Criteria

A skill is "working" when:
- [ ] Consistently followed across multiple uses
- [ ] Produces observably different/better output than baseline
- [ ] Doesn't create new problems or conflicts
- [ ] Composes well with other skills
- [ ] Requirements are clear enough to be actionable

## Current Status: Phase 1 (Discovery)

### Immediate Next Steps

1. **You define**: What aesthetic/direction for the design system?
   - Share references, examples, or descriptions
   - Identify specific anti-patterns to avoid
   - Name specific fonts if you have preferences

2. **We experiment**: Create baseline examples without skills
   - See what default patterns emerge
   - Identify what needs correction

3. **We draft**: Write first SKILL.md based on observations
   - Start with one skill (probably typography or color)
   - Make it minimal and specific

4. **We test**: Use the skill on 3-5 real tasks
   - Score adherence, utility, clarity
   - Document gaps and issues

5. **We refine**: Update skill based on feedback
   - Add missing rules
   - Clarify ambiguous instructions
   - Remove ineffective directives

6. **We repeat**: Until skill is reliable and useful

## Shared Language: Key Terms

**Design Token**: Named variable representing a design decision (color, spacing, etc)
**Semantic Naming**: Names describe purpose not appearance (`action.primary` not `blue.500`)
**Anti-Pattern**: Behavior/choice to explicitly avoid
**Directive**: Specific instruction in a skill
**Skill Composition**: Multiple skills working together on same task
**Feedback Loop**: Test → Observe → Refine → Test cycle

## Open Questions

Before we can write effective skills, we need answers:

1. **Visual Direction**: What are we aiming for aesthetically?
2. **Font Choices**: What specific font families? (need names to load)
3. **Color Starting Point**: One example color or palette to build from?
4. **Priority**: Which skill should we build first?
5. **Success Definition**: What would "good" look like for the first component?

## Anti-Premature Optimization

We are NOT doing yet:
- ❌ Building complete token systems
- ❌ Setting up complex tooling
- ❌ Migrating existing components
- ❌ Creating comprehensive documentation
- ❌ Multi-theme systems

We ARE doing:
- ✅ Discovering design direction through experimentation
- ✅ Writing minimal skills to guide specific behaviors
- ✅ Testing and refining skills iteratively
- ✅ Building shared vocabulary for feedback
- ✅ Learning what works and what doesn't

## Next Action

**Your move**: Define the design direction, or ask me to create baseline examples so we can see what needs improvement.
