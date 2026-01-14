# Claude Agents for This Project

## Available Agents

### 🔴 tech-review (Technical Review)

**Purpose**: Critical technical review after significant code changes

**When to Use**:
- After major feature implementations (>500 lines changed)
- Before important releases
- After database schema changes
- After large refactoring efforts
- For security-sensitive code (auth, payments, data access)
- When you need architectural assessment

**Invocation**:
```
User: "I just finished the authentication system, please review"
Assistant: [Launches tech-review agent]
```

**What It Does**:
- Comprehensive multi-dimensional code review
- Security vulnerability detection (OWASP Top 10)
- Performance assessment (Core Web Vitals, bundle size)
- Accessibility compliance (WCAG AA/AAA)
- Architecture evaluation (scalability, maintainability)
- Issue triage (CRITICAL/HIGH/MEDIUM/LOW)
- Separates immediate fixes from backlog items
- Provides ship/hold recommendation

**Output**: Structured technical review report with:
- Executive summary with ship/hold decision
- Severity-categorized findings with file:line references
- Concrete remediation steps with code examples
- Architectural assessment
- Testing and verification needs

See [tech-review-design.md](./tech-review-design.md) for complete prompting strategy details.

---

### 🟡 studio-mgr (Studio Manager)

**Purpose**: Strategic guidance for managing portfolio of studio projects

**When to Use**:
- Deciding what to work on next
- Planning new projects
- Identifying synergies between projects
- Designing shared infrastructure
- Prioritization decisions

**What It Does**:
- Portfolio-level project awareness
- Dependency mapping
- Synergy identification
- Shared services planning
- Prioritization guidance

---

### 🟣 product-arch (Product Architecture)

**Purpose**: Product architecture review, workflow design, and simplicity advocacy

**When to Use**:
- Planning major features (before implementation)
- Reviewing feature complexity
- Designing user workflows
- Making integration decisions
- Challenging architectural assumptions
- Auditing against simplicity principles

**What It Does**:
- Workflow coherence analysis
- Entity model integrity review
- Simplicity audits (Maeda's Laws)
- Integration elegance assessment
- Alternatives generation
- Architectural decision records (ADRs)
- Collaboration with other agents

**Invocation**:
```
User: "I want to add a tagging system for projects"
Assistant: [Launches product-arch agent to evaluate entity model impact]
```

**Output**: Product architecture assessment with:
- Workflow analysis and simplicity scoring
- Entity/integration review
- Simplicity audit (Maeda's Laws)
- Alternatives analysis with complexity/value tradeoffs
- Architectural decision record
- Collaboration recommendations

**Persona**: Principal Product Architect combining technical expertise with design philosophy (John Maeda, Dieter Rams) and systems thinking

---

### 🔵 doc-mgr (Documentation Manager)

**Purpose**: Managing planning documents and markdown files

**When to Use**:
- Creating new planning documents
- Finding existing documentation
- Organizing docs into right locations
- Updating roadmaps
- Cleaning up stale documents

**Key Feature**: Separates **documents** (specs, context, decisions) from **Linear** (actionable tasks)

**Persona**: Documentation Manager specializing in organized, useful planning docs

---

## Agent Design Principles

1. **Specialized Expertise**: Each agent has a specific domain and depth
2. **Clear Invocation Criteria**: When to use is unambiguous
3. **Structured Output**: Consistent, actionable format
4. **Context Aware**: References project-specific standards and tech stack
5. **Educational**: Explains why, not just what
6. **Pragmatic**: Balances idealism with shipping reality

## Creating New Agents

When creating a new agent, include:

### Frontmatter
```yaml
---
name: agent-slug
description: When to use this agent (shown to main assistant)
model: opus|sonnet|haiku
color: red|yellow|blue|green|purple
---
```

### Examples Section
Provide 3-5 examples showing:
- Context triggering agent use
- User request
- How agent would be invoked
- Commentary explaining why

### Persona & Expertise
Define:
- Role and experience level
- Specific technical expertise
- Domain knowledge
- Relevant industry experience

### Core Responsibilities
List specific tasks with concrete criteria

### Process/Methodology
Step-by-step approach the agent should follow

### Output Format
Prescriptive template showing exact structure expected

### Quality Checks
Self-assessment criteria before completing

### Communication Style
Tone, directness, educational approach

## Best Practices

### For Maximum Effectiveness

**DO**:
- ✅ Use specific technologies and version numbers
- ✅ Include concrete examples and anti-patterns
- ✅ Reference industry standards (OWASP, WCAG, etc.)
- ✅ Provide quantitative benchmarks (< 200KB, < 1.8s)
- ✅ Define clear success criteria
- ✅ Balance rigor with pragmatism

**DON'T**:
- ❌ Use vague expertise claims ("experienced developer")
- ❌ Create generic catch-all agents
- ❌ Overlap significantly with existing agents
- ❌ Skip the examples section
- ❌ Use rigid checklists without context
- ❌ Forget to ground in project tech stack

### Prompting Strategies That Work

1. **Expert Persona**: Specific titles and years of experience
2. **Multi-Dimensional Frameworks**: 6-8 distinct evaluation dimensions
3. **Severity Systems**: Tiered classification with explicit criteria
4. **Red Flags Lists**: Explicit "always catch" checklists
5. **Structured Output**: Prescriptive templates with required sections
6. **Impact Explanations**: What/Why/How format for findings
7. **Project Context**: Reference actual standards and tech stack
8. **Balance Language**: Explicit pragmatism vs perfectionism guidance

See [tech-review-design.md](./tech-review-design.md) for deep dive on prompting strategies.

---

**Last Updated**: 2025-12-31
