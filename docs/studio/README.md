# Studio: Concept Incubation & Prototyping

**Purpose**: Shape early-stage ideas, conduct R&D, build prototypes, demonstrate emerging practices

---

## What Is "Studio"?

The Studio is a dedicated space within the jonfriis.com repository for:

1. **Exploring new paradigms** - Research and define conceptual frameworks
2. **Iterative thinking** - Document evolution of ideas through multiple perspectives
3. **Prototyping** - Build demonstrations of concepts before they mature
4. **Spin-off preparation** - Incubate projects that will become standalone repos

**Studio is NOT**:
- Production website features (those go in `/app` and `/docs/site/`)
- Client work or deliverables
- Finalized, polished products

**Studio IS**:
- R&D and exploration
- "Thinking out loud" in structured ways
- Proofs-of-concept
- Pre-production experiments

---

## Project Lifecycle

### Phase 1: Exploration
**Location**: `/docs/studio/{project-name}/exploration/`
**Activities**:
- Research industry landscape
- Define paradigm or thesis
- Create whitepapers and conceptual docs
- Iterate with multiple perspectives (multi-model if relevant)
- Establish definitions and terminology

**Artifacts**:
- Whitepapers
- Iteration logs
- Definitions glossary
- Research summaries
- ERD/architecture diagrams

**Duration**: Varies (weeks to months)

**Example**: Experience Systems (currently here)

### Phase 2: Prototype
**Location**: `/app/studio/{project-name}/` + `/docs/studio/{project-name}/prototype/`
**Activities**:
- Build working demonstration
- Validate concepts with code
- Test assumptions
- Document implementation learnings
- Create demos for portfolio/showcase

**Artifacts**:
- Functional prototype code
- Implementation notes
- Demo videos/screenshots
- Performance data
- Lessons learned

**Duration**: Varies (days to weeks per prototype)

**Example**: Experience Systems will enter this phase after exploration completes

### Phase 3: Demonstration
**Location**: Public on jonfriis.com/studio/{project-name}
**Activities**:
- Showcase on website
- Write case studies
- Share with community
- Gather feedback
- Refine based on usage

**Artifacts**:
- Live demo
- Case study writeup
- Public documentation
- Community feedback log

**Duration**: Ongoing (as long as demonstrated)

**Example**: Future state for mature studio projects

### Phase 4: Spin-Off
**Location**: New standalone repository
**Activities**:
- Extract to independent repo
- Set up CI/CD
- Create public documentation
- Establish contribution guidelines
- Maintain separately

**Artifacts**:
- Standalone repo with clean history
- Public README
- Installation/usage docs
- Examples and tutorials

**Decision Criteria**: Project has proven value, external interest, requires independent development

---

## Active Studio Projects

### Trux
**Status**: Phase 2 (Prototype) - Specification complete, implementation pending
**Location**: `/components/studio/trux/` + `/docs/studio/trux/`
**Focus**: Side-scrolling monster truck survival game with parametric vehicle customization

**Current State**:
- ✅ Game design specification complete
- ✅ Technical architecture defined
- ⏳ Implementation pending

**Concept**:
Monochrome line-art browser game inspired by Excite Bike. Players tune a monster truck's parameters (wheel size, suspension, weight) and attempt to survive procedurally generated terrain. Physics-based gameplay with emphasis on vehicle customization and the tuning → crash → retry loop.

**Next Steps**:
1. Set up Canvas component and game loop
2. Implement basic physics (Vector2D, forces, collision)
3. Create procedural terrain generator
4. Build vehicle customization UI
5. Polish and tune gameplay feel

**Documents**: `/docs/studio/trux/prototype/` (game-design.md, technical-spec.md)

---

### Design System Tool
**Status**: Phase 2 (Prototype) - Phases 1-3 complete, active development
**Location**: `/app/studio/design-system-tool` + `/docs/studio/design-system-tool/`
**Focus**: Interactive design system configuration and theme generation tool

**Current State**:
- ✅ Phase 1-3 Complete: Typography, Colors, Spacing, Grid, Elevation
- ✅ Live preview system with 7 templates (Card, Form, Dashboard, Blog, etc.)
- ✅ OKLCH color space implementation
- ✅ Brand color palette generator (complementary, vibrant, muted, monochrome)
- ✅ Tailwind v4 CSS export + JSON configuration export
- ✅ Custom font loading with @font-face injection
- ✅ Public demo route at `/studio/design-system-tool`
- 🔄 Phase 4 In Progress: Motion & Interaction tokens

**Dual Purpose**:
1. **Site Utility**: Being used to create the jonfriis.com theme
2. **Portfolio Showcase**: Demonstrates "eating own dog food" approach

**Next Steps**:
1. Complete Phase 4: Motion & Interaction tokens (needed for site UX)
2. Finalize jonfriis.com theme using the tool
3. Continue roadmap: Theme packages → AI integration → Figma sync → Marketplace

**Documents**: `/docs/studio/design-system-tool/design-system-roadmap.md` (10 phases planned)
**Demo**: [/studio/design-system-tool](/studio/design-system-tool)

---

### Armature
**Status**: Phase 1 (Exploration) - Initial research and interaction model design
**Location**: `/components/studio/prototypes/armature/` + `/docs/studio/armature/`
**Focus**: Browser-based Three.js tool for shaping and posing a human character model

**Current State**:
- ✅ Project scaffolding and initial research
- ⏳ Surveying existing posable figure tools and Three.js rigging approaches
- ⏳ Resolving core interaction models (anatomy modification + pose manipulation)

**Concept**:
A lightweight, browser-based posable figure inspired by traditional artist armatures. Users modify anatomy (proportions, body type) and manipulate poses via a rigged Three.js character model. Fills the gap between overly complex 3D suites and overly rigid static reference images.

**Next Steps**:
1. Complete landscape research (existing tools, Three.js rigging patterns)
2. Define interaction model for anatomy modification vs. pose manipulation
3. Select base model approach (blend shapes, procedural scaling, or hybrid)
4. Build minimal rigged figure prototype
5. Validate: can a user shape + pose a figure in under 60 seconds?

**Documents**: `/docs/studio/armature/exploration/` (research.md, definitions.md)

---

### Verbivore
**Status**: Phase 2 (Prototype) - Core platform migrated, AI features operational
**Location**: `/app/(private)/studio/verbivore/` + `/docs/studio/verbivore/`
**Focus**: AI-assisted glossary publishing platform

**Current State**:
- Entry + term CRUD with categories and publishing workflow
- AI content generation using customizable style guides
- AI term suggestions with rejection-based preference learning
- AI-powered term metadata (definitions, pronunciation, etymology, usage examples, synonyms)
- Entry splitting with AI analysis and execution
- Style guide system with evaluation criteria and AI enhancement
- 10 database tables (`verbivore_` prefix), 6 AI actions, dedicated route tree

**Hypothesis**: AI can meaningfully accelerate glossary publishing by handling research-heavy tasks (definitions, etymology, pronunciation) while the editor focuses on curation and narrative.

**Experiments**:
| Experiment | Type | Status |
|-----------|------|--------|
| Core Platform | prototype | in_progress |
| AI Content Generation | experiment | in_progress |
| Style Guide System | experiment | in_progress |
| Entry Splitting | experiment | planned |
| Public Reader | prototype | planned |

**Documents**: `/docs/studio/verbivore/` (README.md, definitions.md)
**Routes**: `/studio/verbivore` (dashboard, entries, terms, style guides)

---

### Experience Systems
**Status**: Phase 1 (Exploration) - Iteration 8 complete
**Location**: `/docs/studio/experience-systems/exploration/`
**Focus**: Machine-readable creative direction for cross-media brand coherence

**Current State**:
- ✅ Paradigm defined (8 iteration whitepaper evolution)
- ✅ Architecture documented (ERD, schemas, contracts)
- ✅ Governance workflow specified (SCP process)
- ✅ Worked example created (TechCo brand)
- ✅ Definitions glossary (80+ terms)
- ✅ Roadmap (NOW/NEXT/LATER phases)

**Next Steps**:
1. Create README.md entry point
2. Implement TechCo example as code (validate architecture)
3. Build MVP rule engine + web adapter
4. Transition to Phase 2 (Prototype)

**Documents**: 21 files, 10,000+ lines
**Collaborators**: Claude (Sonnet), Gemini, Codex (multi-model iteration)

---

## Future Studio Projects

### Ideas Under Consideration
- AI-powered content generation tools
- Interactive data visualization frameworks
- Experimental UI component patterns
- Novel interaction paradigms

**Criteria for Starting New Projects**:
1. Aligns with personal practice/portfolio goals
2. Requires R&D (not just implementation of known patterns)
3. Could benefit others if shared/open-sourced
4. Fits the "studio" exploratory mindset

---

## Documentation Standards

### Every Studio Project Must Have

**`/docs/studio/{project-name}/README.md`**:
- Project overview and status
- Current phase
- Key documents index
- How to navigate the project

**`/docs/studio/{project-name}/exploration/definitions.md`**:
- Glossary of project-specific terms
- Disambiguate jargon
- Provide examples

**`/docs/studio/{project-name}/exploration/{conceptual-docs}`**:
- Whitepapers, research, iterations
- Architecture diagrams
- Roadmaps and plans

**`/docs/studio/{project-name}/prototype/{implementation-docs}`** (if in Phase 2+):
- Implementation notes
- Code architecture
- Technical decisions
- Performance benchmarks

### Optional But Recommended

- **Iteration logs**: Track evolution of thinking (especially for multi-model collaboration)
- **Worked examples**: Concrete walkthroughs with real data
- **ERD/architecture diagrams**: Visual system mapping
- **Case studies**: Real or fictional usage scenarios

---

## Working with Studio Projects

### When to Create a New Studio Project

✅ **Yes, create a studio project if**:
- You're exploring a new paradigm or framework
- The concept requires iterative thinking and research
- You want to document the evolution of an idea
- The work could become a standalone project later
- It's experimental/R&D rather than production

❌ **No, this belongs in site development if**:
- It's a feature for jonfriis.com website
- It's a known pattern being implemented
- It's production-ready and not experimental
- It doesn't need research/exploration phase

### How to Start a New Studio Project

```bash
# 1. Create project directory structure
mkdir -p docs/studio/{project-name}/exploration

# 2. Create initial README
touch docs/studio/{project-name}/README.md

# 3. Add entry to this index
# Edit: docs/studio/README.md → Add to "Active Studio Projects"

# 4. Start documenting
# Create conceptual docs in exploration/
```

### How to Transition from Exploration to Prototype

```bash
# 1. Mark exploration phase as complete
# Update project README with status change

# 2. Create prototype directories
mkdir -p app/studio/{project-name}
mkdir -p docs/studio/{project-name}/prototype

# 3. Move from concepts to code
# Implement working demonstration

# 4. Document implementation
# Track technical decisions, learnings
```

### How to Spin Off a Studio Project

1. **Prepare**: Ensure documentation is comprehensive and standalone
2. **Create repo**: Initialize new repo with clean history
3. **Extract**: Move relevant code and docs to new repo
4. **Archive**: Keep link in studio README to new repo location
5. **Maintain**: Independent development in new repo

---

## Studio vs Site: Decision Matrix

| Aspect | Studio Project | Site Feature |
|--------|---------------|-------------|
| **Purpose** | Explore, research, prototype | Ship, maintain, serve users |
| **Timeline** | Variable, experimental | Planned sprints, deadlines |
| **Documentation** | Extensive conceptual docs | Implementation-focused |
| **Code Quality** | Prototype-grade, experimental | Production-grade, tested |
| **Audience** | Future self, researchers, portfolio | Website visitors, clients |
| **Success Metric** | Learning, refinement, spin-off potential | User engagement, performance, accessibility |
| **Location** | `/docs/studio/`, `/app/studio/` (demos) | `/app/`, `/components/`, `/docs/site/` |

---

## Claude Code Integration

### Rules for Studio Work

**`.claude/rules/studio-research.md`** provides:
- Research methodologies
- Iteration protocols
- Multi-model collaboration patterns
- Documentation expectations
- Prototype standards

**Active when**: Working in `/docs/studio/` or `/app/studio/`

### Skills for Studio Navigation

**`project-navigator`**: Help locate and understand studio projects
**`context-switcher`**: Manage mental model when moving between studio and site work

---

## Maintenance

### Weekly Review
- Update project statuses
- Document progress in iteration logs
- Identify blockers or next steps

### Monthly Assessment
- Evaluate phase transitions (exploration → prototype → demo → spin-off)
- Consider if new studio projects should start
- Archive completed or abandoned projects

### Quarterly Reflection
- Review studio portfolio
- Document lessons learned
- Share case studies publicly
- Update demonstration sites

---

## Questions?

**"How do I know if this should be a studio project?"**
→ If you're asking "what should this be?" rather than "how do I build this?", it's probably studio work.

**"Can a studio project become a site feature?"**
→ Yes! Prototypes can be polished and integrated into the main site. Just move from `/app/studio/` to `/app/` with production-grade refactoring.

**"How long should a project stay in exploration?"**
→ As long as needed. Some projects may never leave exploration (that's okay - documented thinking has value even without code).

**"What if a studio project fails?"**
→ Document why, archive it, move on. Failed experiments still teach valuable lessons.

---

**Document Version**: 1.0
**Date**: 2025-11-22
**Maintained By**: Jon Friis
**Status**: Living document (evolves with studio practice)
