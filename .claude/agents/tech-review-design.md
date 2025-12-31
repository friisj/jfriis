# Technical Review Agent: Design & Prompting Strategy

## Overview

The `tech-review` agent is designed to perform critical technical reviews with the expertise and rigor of a Principal Engineering Architect. This document explains the prompting strategies and design decisions that enable it to provide maximum-quality oversight.

## Key Prompting Strategies

### 1. **Expert Persona with Specific Credentials**

**Strategy**: Establish deep expertise through specific experience markers
```
"Principal Engineering Architect with 15+ years of experience leading technical excellence at high-growth technology companies"
```

**Why This Works**:
- Sets expectation of senior-level judgment
- Implies experience with scale, growth, and production systems
- Communicates both technical depth and business awareness

### 2. **Comprehensive Technical Domain Coverage**

**Strategy**: List specific technologies and expertise areas rather than generic terms

**Domains Covered**:
- Modern Web Stack (Next.js 15, React 19, TypeScript)
- Architecture Patterns (SOLID, DDD, Clean Architecture)
- Performance Engineering (Core Web Vitals, profiling)
- Security (OWASP Top 10, specific attack vectors)
- Database Design (PostgreSQL specifics)
- Accessibility (WCAG standards)
- Testing strategies
- DevOps practices

**Why This Works**:
- Grounds the agent in current, specific technologies
- Prevents generic or outdated advice
- Enables pattern matching against concrete best practices
- Creates mental model of interconnected concerns

### 3. **Tech Stack Grounding**

**Strategy**: Explicitly list the project's exact tech stack with version numbers

**Why This Works**:
- Ensures advice is relevant to actual dependencies
- Prevents suggesting incompatible patterns
- Enables version-specific guidance (React 19 vs 18 patterns differ)
- Grounds recommendations in project reality

### 4. **Multi-Dimensional Review Framework**

**Strategy**: Define 8 distinct review dimensions with specific criteria

**Dimensions**:
1. Architecture & Design
2. Code Quality
3. Performance
4. Security
5. Accessibility
6. Data Integrity
7. Error Handling
8. Testing

**Why This Works**:
- Ensures comprehensive coverage (prevents blind spots)
- Provides structured thinking process
- Mimics how experienced engineers mentally organize reviews
- Creates consistency across reviews

### 5. **Severity-Based Triage System**

**Strategy**: Four-tier classification (CRITICAL/HIGH/MEDIUM/LOW) with explicit criteria

**CRITICAL Examples**:
- "Security vulnerabilities exploitable in production"
- "Data loss or corruption risks"
- "Complete feature breakage"

**Why This Works**:
- Forces prioritization discipline
- Enables clear ship/hold decisions
- Matches industry-standard incident severity levels
- Separates urgent from important
- Prevents "everything is critical" syndrome

### 6. **Immediate vs Backlog Separation**

**Strategy**: Explicitly bifurcate findings into action-now vs defer-and-track

**Why This Works**:
- Prevents overwhelming developers with long fix lists
- Enables pragmatic shipping decisions
- Acknowledges that perfect is the enemy of good
- Provides roadmap for future improvement
- Matches real-world development constraints

### 7. **Structured Output Format**

**Strategy**: Prescriptive markdown template with required sections

**Required Sections**:
- Executive Summary (ship/hold recommendation)
- Severity Breakdown (counts)
- Immediate Action Required (CRITICAL/HIGH)
- Backlog Items (MEDIUM/LOW)
- Architectural Assessment
- Testing & Verification Needs
- Overall Recommendation

**Why This Works**:
- Ensures consistent, scannable output
- Executives can read summary; developers can drill into details
- Clear separation of concerns
- Actionable format (checklists, code examples)
- Mimics professional code review reports

### 8. **File:Line Specificity Requirement**

**Strategy**: Every finding must include `path/to/file.ts:123` format

**Why This Works**:
- Forces precision (can't be vague)
- Enables immediate navigation to issues
- Proves the agent actually read the code
- Makes remediation faster
- Industry standard for issue tracking

### 9. **Impact-Driven Explanations**

**Strategy**: Three-part finding structure:
1. **What** is the issue
2. **Why** it matters (impact)
3. **How** to fix it (remediation with code)

**Example Structure**:
```markdown
**Description**: Missing input validation on user input
**Why This Matters**: SQL injection vulnerability allowing data theft
**Remediation**: Use parameterized queries [code example]
```

**Why This Works**:
- Educates developers (not just directives)
- Justifies severity classification
- Provides learning opportunity
- Increases buy-in for fixes
- Matches senior engineer communication style

### 10. **Red Flags Checklist**

**Strategy**: Explicit list of "always catch" issues organized by category

**Categories**:
- 🚨 Security (8 specific items)
- 🚨 Data Integrity (6 specific items)
- 🚨 Performance (7 specific items)
- 🚨 Architecture (6 specific items)

**Why This Works**:
- Acts as forcing function / mental checklist
- Ensures critical issues aren't missed
- Reflects accumulated wisdom of experienced engineers
- Prevents recency bias (focusing only on recent issues)

### 11. **Context Awareness & Project Standards**

**Strategy**: Reference project-specific rules (`.claude/rules/site-development.md`)

**Referenced Standards**:
- TypeScript strict mode
- WCAG AA minimum
- Core Web Vitals targets (specific numbers)
- Next.js App Router conventions
- Performance budgets (< 200KB JS)

**Why This Works**:
- Enforces project-specific quality bar
- Enables "rule violation" detection
- Provides objective standards for subjective judgments
- Ensures consistency with existing codebase

### 12. **Systematic Review Process**

**Strategy**: Five-step process defined in detail

**Steps**:
1. Understand the Change
2. Systematic Analysis
3. Integration Check
4. Testing Verification
5. Documentation Check

**Why This Works**:
- Provides reproducible methodology
- Prevents skipping steps under time pressure
- Mimics how expert engineers actually review
- Ensures breadth (not just depth in one area)

### 13. **Balance & Pragmatism Guidance**

**Strategy**: Explicit instructions to balance rigor with shipping needs

**Examples**:
- "Not overly pedantic on minor issues"
- "Balance idealism with shipping needs"
- "Focuses on what matters for ship/hold decision"

**Why This Works**:
- Prevents analysis paralysis
- Acknowledges real-world constraints
- Differentiates from junior/academic reviews
- Enables confident shipping decisions

### 14. **Communication Style Definition**

**Strategy**: Six explicit communication attributes

**Attributes**:
- Direct and Clear (no hedging)
- Respectful but Firm
- Educational (explain why)
- Pragmatic (balance ideals with reality)
- Evidence-Based (cite standards)
- Actionable (path forward always provided)

**Why This Works**:
- Sets tone for feedback delivery
- Prevents overly soft or overly harsh reviews
- Ensures psychological safety while maintaining standards
- Models senior engineer communication

### 15. **Success Criteria Definition**

**Strategy**: Six measurable outcomes for successful review

**Criteria**:
1. Catches critical issues (prevents production incidents)
2. Provides clear priorities (enables ship/hold decisions)
3. Educates the team
4. Balances rigor with pragmatism
5. Improves code quality
6. Strengthens architecture

**Why This Works**:
- Defines "done" for the review task
- Enables self-assessment
- Prevents gold-plating
- Focuses on value delivery

## Incorporated Industry Protocols

### Google's Code Review Best Practices
- **The Standard**: Code should improve overall code health
- **Implementation**: "Overall Recommendation" section requires net improvement assessment
- **Small Changes**: Encourages focused reviews (implicit in immediate/backlog split)

### Microsoft's Engineering Excellence
- **Security Development Lifecycle (SDL)**: Embedded in security review dimension
- **Accessibility Requirements**: WCAG standards explicitly required
- **Performance Budgets**: Core Web Vitals targets

### OWASP Standards
- **Top 10 Coverage**: Explicit checklist for common vulnerabilities
- **Secure Coding Practices**: Referenced in security dimension
- **Defense in Depth**: Multi-layer validation checks

### WCAG 2.1 Compliance
- **AA Minimum**: Explicitly stated in standards
- **AAA Where Feasible**: Stretch goal noted
- **Keyboard Navigation**: Specific requirement
- **Screen Reader Compatibility**: Testing verification needed

### DORA Metrics Influence
- **Speed + Stability Balance**: Immediate vs backlog separation
- **Change Failure Rate Focus**: Catching issues pre-production
- **Lead Time Consideration**: Pragmatic shipping guidance

### Clean Code Principles (Robert C. Martin)
- **Single Responsibility**: Explicit checkpoint
- **Meaningful Names**: Code quality dimension
- **Small Functions**: Complexity assessment
- **DRY Principle**: Violation detection

### SOLID Principles
- **Explicit Reference**: Listed in architecture expertise
- **Design Pattern Evaluation**: Part of architectural assessment
- **Coupling/Cohesion**: Architecture red flags

## Advanced Techniques

### 1. **Specific Anti-Pattern Detection**

Rather than generic advice, the agent is prompted to catch project-specific anti-patterns:
- "Using `any` type" (TypeScript-specific)
- "Client Components without clear interactivity need" (Next.js App Router pattern)
- "Missing RLS policies" (Supabase security pattern)

### 2. **Quantitative Benchmarks**

Specific numbers create objective standards:
- "FCP < 1.8s" (not "fast loading")
- "< 200KB JS bundle" (not "small bundle")
- "WCAG AA" (not "accessible")

### 3. **Scalability Questions**

Forcing functions to think about scale:
- "Will this handle 10x traffic? 100x data?"
- Prevents myopic focus on current state

### 4. **Educational Framing**

Every issue is a teaching moment:
- "Why This Matters" section
- Code examples showing correct patterns
- References to standards and documentation

### 5. **Psychological Safety**

Balanced feedback approach:
- "Acknowledge good work, but don't sugarcoat problems"
- "Respectful but Firm"
- Separates code quality from developer competence

## Usage Patterns

### When to Invoke

**✅ DO Use tech-review For**:
- Major feature additions (>500 lines changed)
- Security-sensitive code (auth, payments, data access)
- Database schema changes
- Performance-critical paths
- Pre-release audits
- Large refactoring efforts
- API design changes
- Complex algorithm implementations

**❌ DON'T Use tech-review For**:
- Typo fixes
- Documentation updates
- Simple CSS tweaks
- Single-line bug fixes
- Routine maintenance

### Integration with Development Workflow

**Optimal Integration Points**:
1. **Pre-PR**: Before creating pull request for large changes
2. **Post-Implementation**: After completing major feature
3. **Pre-Release**: Final audit before production deployment
4. **Post-Incident**: Reviewing fixes for production issues
5. **Refactoring**: Validating large-scale code restructuring

## Calibration & Tuning

### Adjusting Severity Thresholds

If agent is too strict or too lenient, adjust:
- **Too Many CRITICALs**: Tighten CRITICAL definition, add "production impact" requirement
- **Missing Real Issues**: Expand red flags checklist, add specific examples
- **Too Pedantic**: Strengthen "pragmatic balance" language, add "ship/hold focus"

### Tech Stack Updates

When dependencies change:
- Update "Tech Stack for This Project" section
- Add new anti-patterns discovered
- Update version-specific guidance

### Project Standards Evolution

As code quality bar raises:
- Update performance budgets in context awareness
- Add new required standards
- Strengthen accessibility requirements

## Measuring Effectiveness

**Success Indicators**:
- ✅ Catches issues that would cause production incidents (before they ship)
- ✅ Issues are accurately prioritized (urgent vs. important correctly classified)
- ✅ Developers implement recommended fixes (guidance is actionable)
- ✅ Team code quality improves over time (educational value)
- ✅ Review time is reasonable (< 10 minutes for typical change)

**Warning Signs**:
- ⚠️ Missing critical issues (false negatives)
- ⚠️ Too many false positives (low signal/noise)
- ⚠️ Developers ignore recommendations (not persuasive/actionable)
- ⚠️ Reviews taking too long (> 30 minutes typical)
- ⚠️ Ship/hold recommendations feel arbitrary

## Future Enhancements

Potential improvements:
1. **Automated Metric Collection**: Pull Core Web Vitals, bundle sizes automatically
2. **Historical Pattern Recognition**: Track recurring issues, suggest systemic fixes
3. **Dependency Vulnerability Scanning**: Integration with npm audit, Snyk
4. **Test Coverage Analysis**: Parse coverage reports, identify gaps
5. **Complexity Metrics**: Calculate cyclomatic complexity, suggest refactoring targets

---

**Last Updated**: 2025-12-31
**Agent Version**: 1.0
**Design Philosophy**: Maximize technical rigor while maintaining pragmatic shipping velocity
