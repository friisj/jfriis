# Jon Friis: Documentation Overview

**Repository**: jonfriis.com personal website + studio incubation space

---

## What This Repository Contains

This is a multi-purpose monorepo serving two primary functions:

### 1. **jonfriis.com** — Production Website & App
Your personal website with its own feature roadmap, portfolio, blog, and interactive capabilities.

**Status**: Active development
**Location**: `/app`, `/components`, `/lib`, `/public`
**Documentation**: `/docs/site/`

### 2. **/studio** — Concept Incubation & Prototyping
A dedicated workspace for shaping early-stage ideas, R&D experiments, and prototype demonstrations before they spin off into standalone projects.

**Status**: Active exploration
**Location**: `/docs/studio/`, `/app/studio/` (when prototypes are built)
**Documentation**: Each studio project has its own `/docs/studio/{project-name}/` folder

---

## Directory Structure

```
/
├── app/                          # Next.js application
│   ├── (site)/                   # jonfriis.com routes
│   ├── studio/                   # Studio prototypes (when implemented)
│   └── api/                      # API routes
│
├── docs/                         # All documentation
│   ├── README.md                 # This file (entry point)
│   ├── REPO-GUIDE.md            # How to work with this repo
│   │
│   ├── site/                     # jonfriis.com website docs
│   │   ├── ROADMAP.md
│   │   ├── ARCHITECTURE.md
│   │   └── FEATURES.md
│   │
│   └── studio/                   # Studio project documentation
│       ├── README.md             # Studio overview & index
│       ├── experience-systems/   # Example: ES project docs
│       ├── [future-project-1]/
│       └── [future-project-2]/
│
├── .claude/                      # Claude Code configuration
│   ├── rules/                    # Context-specific rules
│   │   ├── site-development.md
│   │   └── studio-research.md
│   └── skills/                   # Reusable agent capabilities
│       ├── project-navigator.md
│       └── context-switcher.md
│
└── components/                   # Shared React components
    ├── site/                     # Website-specific
    └── studio/                   # Studio-specific (when needed)
```

---

## How to Navigate This Repo

### Working on the Website (jonfriis.com)
**Start here**: `/docs/site/README.md`
- Site roadmap and feature planning
- Architecture decisions
- Design system (site-specific tokens, not Studio/ES)
- Deployment and performance

**Claude Rule**: Use `.claude/rules/site-development.md` for context

### Working on Studio Projects
**Start here**: `/docs/studio/README.md`
- Index of all studio projects
- Project lifecycle (exploration → prototype → spin-off)
- Research methodologies
- Documentation standards

**Claude Rule**: Use `.claude/rules/studio-research.md` for context

### Starting a New Studio Project
1. Create `/docs/studio/{project-name}/`
2. Add entry to `/docs/studio/README.md` project index
3. Document in exploration phase (research, iterations, definitions)
4. Prototype in `/app/studio/{project-name}/` when ready
5. Spin off to standalone repo when mature

---

## Documentation Standards

### For jonfriis.com (Site)
- **Focus**: Shipping features, user-facing functionality
- **Tone**: Implementation-focused, pragmatic
- **Artifacts**: Roadmaps, architecture docs, feature specs, component docs

### For Studio Projects (R&D)
- **Focus**: Shaping concepts, exploring possibilities, prototyping
- **Tone**: Research-oriented, iterative, hypothesis-driven
- **Artifacts**: Whitepapers, iteration logs, definitions, worked examples, prototypes

### Shared Standards
- Use Markdown for all documentation
- Mermaid for diagrams
- Keep docs close to code (co-located when possible)
- Version important documents
- Link related docs bidirectionally

---

## Claude Code Integration

### Rules (Context Switching)
Located in `.claude/rules/`:

**`site-development.md`**: Active when working on jonfriis.com features
- Site architecture context
- Component patterns
- Performance budgets
- Deployment considerations

**`studio-research.md`**: Active when working on studio projects
- Research methodologies
- Iteration protocols
- Documentation expectations
- Prototype standards

**Usage**: Claude automatically loads relevant rules based on file paths and context.

### Skills (Reusable Capabilities)
Located in `.claude/skills/`:

**`project-navigator.md`**: Help navigate between site and studio contexts
- Understand current working context
- Switch between site dev and studio research modes
- Locate relevant documentation
- Identify appropriate rules to apply

**`context-switcher.md`**: Manage mental model when switching contexts
- Summarize current project state before switching
- Load new context with relevant docs
- Maintain separation between site and studio work
- Prevent concept bleed between contexts

---

## Current State

### jonfriis.com Website
**Status**: Active development
**Focus**: Building core site features, design system, content management

**Recent Work**:
- Design system configuration (typography, colors, palette generator)
- Admin interfaces for projects, specimens, backlog, logs

**Next Steps**: See `/docs/site/ROADMAP.md`

### Studio: Experience Systems
**Status**: Conceptual foundation complete (Iteration 8)
**Focus**: Paradigm definition, architecture, worked examples

**Documents**: 20+ files in `/docs/studio/experience-systems/exploration/`
- Whitepapers (iterations 0-8)
- ERD diagrams
- Roadmap (NOW/NEXT/LATER)
- Governance workflow
- Minimal package boilerplate
- Worked example (TechCo)
- Definitions glossary

**Next Steps**: Implementation validation (build TechCo example as code)

### Future Studio Projects
**Status**: To be defined
**Examples**:
- AI-powered content tools
- Interactive data visualizations
- Design system generators
- Experimental UI patterns

---

## Key Files

### Must-Read for Any Work
1. This file (`/docs/README.md`) - Entry point
2. `/docs/REPO-GUIDE.md` - How to work with this structure
3. `.claude/rules/` - Active rules for context

### For Site Development
1. `/docs/site/ROADMAP.md` - Feature planning
2. `/docs/site/ARCHITECTURE.md` - Technical decisions
3. `/app/` - Source code

### For Studio Research
1. `/docs/studio/README.md` - Project index
2. `/docs/studio/{project}/` - Project-specific docs
3. `/docs/studio/{project}/definitions.md` - Project terminology

---

## Maintenance

### Weekly
- Review active work contexts (site vs studio)
- Update relevant roadmaps
- Sync documentation with code changes

### Monthly
- Review studio project statuses (exploration → prototype → spin-off)
- Evaluate whether studio prototypes are ready to build in `/app/studio/`
- Consider if mature studio projects should spin off

### Quarterly
- Assess overall repo organization
- Archive completed studio projects
- Document lessons learned from spin-offs

---

## Questions?

- **"Where do I document this feature?"** → Site feature = `/docs/site/`, Studio concept = `/docs/studio/{project}/`
- **"Should this be a studio project?"** → Is it R&D/exploration/paradigm-shaping? Yes = Studio. Production feature? No = Site.
- **"How do I switch contexts?"** → Use Claude skills `project-navigator` and `context-switcher`
- **"Where's the roadmap?"** → Site roadmap = `/docs/site/ROADMAP.md`, Studio project roadmaps = in each project folder

---

**Document Version**: 1.0
**Date**: 2025-11-22
**Maintained By**: Jon Friis + Claude Code
**Status**: Living document (update as repo evolves)
