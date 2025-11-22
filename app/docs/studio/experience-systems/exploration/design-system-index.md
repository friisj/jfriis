# Design System Documentation Index

**Purpose**: This index provides clear dimensional separation of design system concerns.

---

## 📐 Documentation Dimensions

Our design system documentation is organized across 5 distinct dimensions:

### 1. **The Tool** (What we're building)
What: The interactive design system configurator itself
Focus: Features, UI, technical implementation, user workflows

**Documents:**
- [Tool Roadmap](./design-system-tool/roadmap.md) - Feature development timeline
- [Tool Architecture](./design-system-tool/architecture.md) - Technical implementation
- [User Guide](./design-system-tool/user-guide.md) - How to use the tool

**Scope:** Only concerns the `/studio/design-system-tool` application and its direct features.

---

### 2. **Principles** (Why we're building it this way)
What: Theoretical foundation, design philosophy, future vision
Focus: Research, hypotheses, industry trends, strategic direction

**Documents:**
- [Research & Theory](./design-system-research.md) - Current state analysis and future hypotheses
- [Design Principles](./design-system-principles.md) - Core beliefs guiding decisions
- [Vision & Strategy](./design-system-vision.md) - Long-term strategic direction

**Scope:** Academic and strategic thinking. No implementation details.

---

### 3. **Application** (How to use it)
What: Practical guidance for using design tokens and themes
Focus: Patterns, recipes, best practices, component guidelines

**Documents:**
- [Token Usage Patterns](./design-system-application/patterns.md) - When to use what
- [Recipe Book](./design-system-application/recipes.md) - Common use cases
- [Best Practices](./design-system-application/best-practices.md) - Do's and don'ts
- [Component Guidelines](./design-system-application/components.md) - Building with tokens

**Scope:** "I have tokens, how do I build with them?"

---

### 4. **Integration** (How it fits the ecosystem)
What: Connecting with existing tools and workflows
Focus: Figma, Storybook, CI/CD, team processes, adoption strategy

**Documents:**
- [Ecosystem Overview](./design-system-integration/ecosystem.md) - Tool landscape
- [Workflow Integration](./design-system-integration/workflows.md) - Fitting existing process
- [Adoption Strategy](./design-system-integration/adoption.md) - Rollout plan
- [Tool Integrations](./design-system-integration/tools.md) - Figma, VSCode, etc.

**Scope:** "How does this fit our existing way of working?"

---

### 5. **Governance** (How we manage it)
What: Rules, processes, and policies for maintaining quality
Focus: Contribution, versioning, review, standards, deprecation

**Documents:**
- [Contribution Guide](./design-system-governance/contribution.md) - How to propose changes
- [Versioning Policy](./design-system-governance/versioning.md) - Breaking changes, semver
- [Quality Standards](./design-system-governance/quality.md) - What makes a good theme
- [Review Process](./design-system-governance/review.md) - Approval workflows

**Scope:** "How do we keep this from becoming chaos?"

---

## 🗺️ Current Document Status

### ✅ Completed
- [Design System Research](./design-system-research.md) - **Dimension 2: Principles**
  - Contains: Theory, hypotheses, industry research
  - Issue: Some tool/application mixing (minor)

### ⚠️ Needs Refactoring
- [Design System Roadmap](./design-system-roadmap.md) - **Mixed Dimensions**
  - Contains: Tool features (D1) + Integration (D4) + Governance (D5)
  - Should be split into:
    - Tool-specific roadmap (D1)
    - Integration roadmap (D4)
    - Governance framework (D5)

### ❌ Missing
- **Dimension 1**: Tool architecture, user guide
- **Dimension 3**: All application docs (critical gap!)
- **Dimension 4**: Integration/ecosystem docs
- **Dimension 5**: All governance docs (critical gap!)

---

## 📊 Cross-Dimensional Concerns

Some topics span multiple dimensions:

### Example: "AI-Generated Components"

**Dimension 1 (Tool):**
- UI for natural language theme generation
- Component generator interface
- Preview of AI-generated code

**Dimension 2 (Principles):**
- Why AI should understand design systems
- Hypothesis: AI-native design systems
- Vision of brand-consistent generative UI

**Dimension 3 (Application):**
- How to refine AI-generated components
- When to use AI generation vs manual coding
- Validating AI output against brand

**Dimension 4 (Integration):**
- Claude skills/rules integration
- CI/CD validation of AI components
- Storybook documentation of AI patterns

**Dimension 5 (Governance):**
- Review process for AI-generated code
- Quality standards for AI components
- When AI generation is/isn't appropriate

**How to document:**
- Create separate sections in each dimensional doc
- Cross-link between dimensions
- Maintain clear scope boundaries

---

## 🎯 Reading Paths

### "I want to understand the vision"
1. [Design Principles](./design-system-principles.md) - **D2**
2. [Research & Theory](./design-system-research.md) - **D2**
3. [Vision & Strategy](./design-system-vision.md) - **D2**

### "I want to use the tool"
1. [User Guide](./design-system-tool/user-guide.md) - **D1**
2. [Token Usage Patterns](./design-system-application/patterns.md) - **D3**
3. [Recipe Book](./design-system-application/recipes.md) - **D3**

### "I want to contribute"
1. [Contribution Guide](./design-system-governance/contribution.md) - **D5**
2. [Quality Standards](./design-system-governance/quality.md) - **D5**
3. [Review Process](./design-system-governance/review.md) - **D5**

### "I want to integrate with my workflow"
1. [Ecosystem Overview](./design-system-integration/ecosystem.md) - **D4**
2. [Workflow Integration](./design-system-integration/workflows.md) - **D4**
3. [Tool Integrations](./design-system-integration/tools.md) - **D4**

### "I'm a developer building components"
1. [Best Practices](./design-system-application/best-practices.md) - **D3**
2. [Component Guidelines](./design-system-application/components.md) - **D3**
3. [Token Usage Patterns](./design-system-application/patterns.md) - **D3**

---

## 🔧 Maintenance

### When creating new docs:
1. Identify which dimension it belongs to
2. Check for dimensional leakage (mixing concerns)
3. Cross-link to related docs in other dimensions
4. Update this index

### When updating existing docs:
1. Ensure they stay within dimensional scope
2. Extract mixed concerns into appropriate dimensions
3. Maintain cross-references
4. Update "Current Document Status" above

---

## 📝 Document Templates

Each dimension has a standard template:

### Dimension 1 (Tool) Template
```markdown
# [Feature Name]

**Status**: Planned | In Progress | Complete
**Phase**: [Roadmap phase number]
**Priority**: High | Medium | Low

## What
[One paragraph: What is this feature?]

## Why
[One paragraph: Why are we building it?]
Link to: [Design Principles](../design-system-principles.md)

## How
[Technical implementation]

## User Workflow
[Step-by-step user experience]

## Success Criteria
[How do we know it works?]
```

### Dimension 2 (Principles) Template
```markdown
# [Principle Name]

**Type**: Belief | Hypothesis | Research Finding

## Statement
[One sentence: The principle itself]

## Rationale
[Why we believe this]

## Evidence
[Research, examples, data supporting this]

## Implications
[What this means for our work]
Links to:
- [Tool Feature](../design-system-tool/...)
- [Application Pattern](../design-system-application/...)

## Counter-Arguments
[What arguments exist against this? Why do we still believe it?]
```

### Dimension 3 (Application) Template
```markdown
# [Pattern/Recipe Name]

**Use Case**: [When to use this]
**Difficulty**: Beginner | Intermediate | Advanced

## Problem
[What user need does this address?]

## Solution
[How to implement]

## Code Example
[Runnable code]

## Do's and Don'ts
✅ Do: ...
❌ Don't: ...

## Related Patterns
[Links to other recipes]

## Token Reference
[Which tokens are used and why]
```

### Dimension 4 (Integration) Template
```markdown
# [Tool/Workflow Name]

**Integration Status**: Planned | Beta | Stable
**External Tool**: [Figma | VSCode | etc.]

## Overview
[What does this integration enable?]

## Prerequisites
[What you need before using this]

## Setup
[Step-by-step setup instructions]

## Workflow
[How to use in daily work]

## Troubleshooting
[Common issues and solutions]

## Limitations
[What this integration can't do]
```

### Dimension 5 (Governance) Template
```markdown
# [Policy Name]

**Type**: Process | Standard | Rule
**Enforcement**: Required | Recommended | Optional

## Policy Statement
[Clear, one-sentence policy]

## Rationale
[Why this policy exists]

## Process
[Step-by-step: How to follow this policy]

## Examples
✅ Good: [Compliant example]
❌ Bad: [Non-compliant example]

## Enforcement
[How is this checked? Automated? Manual review?]

## Exceptions
[When can this be broken? Who approves?]
```

---

## 🚨 Anti-Patterns to Avoid

### ❌ Don't:
- **Mix dimensions in one document** - "This tool feature implements this principle" → Separate docs, cross-link
- **Repeat information** - State once, link everywhere else
- **Create orphan docs** - Every doc must be in the index
- **Write implementation in principles docs** - Keep principles abstract
- **Write philosophy in tool docs** - Keep tool docs practical

### ✅ Do:
- **Cross-link liberally** - Connect related concepts across dimensions
- **Use consistent terminology** - Token, theme, system (defined in glossary)
- **Keep scope tight** - One doc = one concern
- **Update index immediately** - When creating new docs
- **Version governance docs** - Policies change, track history

---

**Last Updated**: January 2025
**Maintainer**: Design System Working Group
**Next Review**: After Phase 4 completion
