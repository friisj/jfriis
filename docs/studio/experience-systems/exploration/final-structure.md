# Experience Systems: Final Information Architecture

**Claude v4 — Document organization and navigation guide**

---

## Purpose

This document provides the complete information architecture for the Experience Systems project, organizing all artifacts into a coherent, navigable structure with clear entry points for different stakeholder types.

---

## Quick Start by Role

### 👔 Executive / Decision Maker
**Goal**: Understand the paradigm shift and business value

**Start here**:
1. Read: `README.md` (30-second pitch + value prop)
2. Read: `experience-systems-whitepaper.md` → Part I (Industry Context) + Part VIII (Why Now)
3. Review: `worked-example.md` → See concrete output with actual BCS scores
4. Decide: Is this worth investing in?

### 🎨 Creative Director / Brand Steward
**Goal**: Understand how brand personality becomes executable code

**Start here**:
1. Read: `README.md` → Navigate to "For Brand Stewards"
2. Read: `design-system-principles.md` → Foundational philosophy
3. Read: `worked-example.md` → See how personality vectors drive outputs
4. Review: `gemini-v3-governance-flow.md` → Understand approval workflow
5. Explore: `gemini-v3-minimal-package.md` → See concrete files you'll work with

### 💻 Engineer / System Maintainer
**Goal**: Understand architecture and build the system

**Start here**:
1. Read: `README.md` → Navigate to "For Engineers"
2. Read: `claude-v3-roadmap.md` → Understand NOW/NEXT/LATER phases
3. Review: `claude-v3-erd.md` → Study system architecture
4. Build: `gemini-v3-minimal-package.md` → Start with MVP
5. Reference: `codex-v2.md` → Implementation contracts and BCS formula

### 📊 Product Manager / Program Lead
**Goal**: Understand roadmap, success criteria, and risks

**Start here**:
1. Read: `README.md` → Full context
2. Read: `claude-v3-roadmap.md` → Implementation phases with decision gates
3. Review: `codex-v2.md` → Success signals and risks
4. Understand: `gemini-v3-governance-flow.md` → Team workflow
5. Track: `iteration-log.md` → How we got here

### 🔬 Researcher / Strategist
**Goal**: Understand industry context, research questions, hypotheses

**Start here**:
1. Read: `design-system-research.md` → Industry landscape
2. Read: `tokenized-design-systems.md` → Current state of practice
3. Read: `experience-systems-research-log.md` → Active hypotheses
4. Review: `iteration-log.md` → Evolution of thinking
5. Explore: `claude-v3-roadmap.md` → Open questions per phase

---

## Complete Document Inventory

### 📂 Layer 1: Entry & Navigation

**`README.md`** (TO BE CREATED)
- 30-second pitch: "What is an Experience System?"
- Value proposition by stakeholder role
- Navigation map to all other documents
- Quick start paths
- Status: Current phase and next milestones

**`final-structure.md`** (THIS DOCUMENT)
- Complete information architecture
- Role-based reading paths
- Document inventory with relationships
- Version history and status tracking

---

### 📂 Layer 2: Strategic Vision

#### Core Paradigm Definition

**`experience-systems-whitepaper.md`** (Original, Draft 0)
- Status: Initial vision, superseded by iterations but foundational
- Purpose: Establishes paradigm claim and vision
- Audience: All stakeholders
- Key sections: Problem statement, paradigm shift, 7 components

**`gemini-v1.md`** (Iteration 1)
- Status: Industry-contextualized vision
- Purpose: Positions ES against current "AI-ready" design systems
- Audience: Stakeholders who need market validation
- Key addition: Industry context (Supernova, frog, Material/Carbon/Polaris)

**`claude-v2.md`** (Iteration 3)
- Status: Synthesis of vision + implementation
- Purpose: Balanced strategic narrative with technical architecture
- Audience: Cross-functional teams needing both "why" and "how"
- Key additions: Foundational principles, competitive positioning, case studies, concrete adapter schemas

**`gemini-v2.md`** (Iteration 4)
- Status: Unified blueprint
- Purpose: Comprehensive reference combining all prior iterations
- Audience: Teams ready to commit, needing complete specification
- Key additions: Unified architecture, detailed SCP workflow, refined schemas

**`codex-v2.md`** (Iteration 5)
- Status: Implementation contracts
- Purpose: Engineering-ready specification with build contracts
- Audience: Development teams starting implementation
- Key additions: BCS formula, adapter interface contracts, SCP template, minimal viable package checklist

#### Supporting Strategic Docs

**`design-system-principles.md`**
- Status: Foundational philosophy
- Purpose: 7 core principles for machine-readable creative direction
- Audience: Brand stewards, creative directors
- Key content: Semantic token structure, cross-media mapping examples

**`design-system-research.md`**
- Status: Industry research summary
- Purpose: Document future hypotheses about tokenized design systems
- Audience: Researchers, strategists
- Key content: 6 hypotheses (AI-native, generative UX, dynamic theming, etc.)

**`tokenized-design-systems.md`**
- Status: Industry landscape analysis
- Purpose: Document current state of design system evolution
- Audience: Strategists needing competitive intelligence
- Key content: Atomic tokens, Carbon/Polaris/Material, AI-ready systems (Supernova), frog's generative pipeline

**`experience-systems-research-log.md`**
- Status: Active R&D journal
- Purpose: Track hypothesis-driven exploration
- Audience: Research teams, product leadership
- Key content: 5 active hypotheses, 3 validated, 3 invalidated, experiment protocols

---

### 📂 Layer 3: Architecture & Design

**`claude-v3-erd.md`** (Iteration 6)
- Status: Comprehensive system architecture diagrams
- Purpose: Visual map of entities, relationships, and flows
- Audience: Engineers, architects, technical leads
- Key diagrams:
  - Core ERD with all entities and cardinalities
  - Knowledge graph layer
  - Adapter data flow
  - Governance state machine
  - Telemetry event flow
  - Package structure tree

**`codex-v1.md`** (Iteration 2)
- Status: Condensed implementation-first specification
- Purpose: Pragmatic technical foundation
- Audience: Engineering teams prioritizing speed
- Key content: Explicit schemas, minimal viable scope, rollout path

---

### 📂 Layer 4: Operational & Execution

#### Roadmap & Phases

**`claude-v3-roadmap.md`** (Iteration 6)
- Status: Simplified implementation path
- Purpose: NOW/NEXT/LATER phased approach with decision gates
- Audience: Product managers, engineering leads
- Key structure:
  - NOW: MVP with UI adapter (checklist format)
  - NEXT: Cross-media proof with one non-UI adapter
  - LATER: Multi-modal scale + ecosystem maturity
  - Decision gates, anti-patterns, open questions per phase

**`design-system-roadmap.md`**
- Status: Original detailed roadmap (10 phases)
- Purpose: Comprehensive project evolution plan
- Audience: Program managers, long-term planners
- Note: Timeline estimates removed per user feedback

#### Governance & Process

**`gemini-v3-governance-flow.md`** (Iteration 7)
- Status: Detailed governance workflow
- Purpose: Operationalize SCP (System Change Proposal) process
- Audience: Brand stewards, system maintainers, contributors
- Key content:
  - Role definitions and responsibilities
  - Mermaid flowchart of SCP lifecycle
  - Approval gates and evidence requirements
  - 7-step workflow explanation

**`design-system-index.md`**
- Status: Dimensional clarity framework
- Purpose: Separate Tool vs Principles vs Application vs Integration vs Governance
- Audience: Contributors needing structural clarity
- Key content: 5-dimension taxonomy, templates, reading paths

#### Implementation Artifacts

**`gemini-v3-minimal-package.md`** (Iteration 7)
- Status: Actionable v0.1.0 boilerplate
- Purpose: Concrete, buildable MVP package definition
- Audience: Engineers starting NOW phase
- Key content:
  - File-by-file boilerplate (manifest, creative-direction, seeds, rules, adapters, evals)
  - Minimal governance (human review required)
  - Focus on UI first

**`worked-example.md`** (TO BE CREATED - Iteration 8)
- Status: Concrete walkthrough with real data
- Purpose: Bridge concept ↔ implementation gap
- Audience: All stakeholders needing proof
- Key content:
  - Fictional brand "TechCo" with specific values
  - Show `creative-direction.json` → rules → tokens → `tailwind.config.js`
  - BCS calculation with actual scores
  - SCP example demonstrating governance

---

### 📂 Layer 5: Reference & Meta

**`iteration-log.md`**
- Status: Living document tracking evolution
- Purpose: Chronicle of multi-model collaboration
- Audience: Project historians, researchers
- Key content: Iterations 0-7, critiques, summaries, directives

**Additional Reference Docs** (in parent `/docs` directory):
- Research on Tailwind theme config extensions
- Motion tokens exploration
- Fluid typography patterns
- Container queries integration

---

## Document Relationships

### Dependency Graph

```
README.md
  ├─→ Strategic Layer
  │   ├─→ experience-systems-whitepaper.md (foundational)
  │   ├─→ gemini-v2.md (comprehensive reference)
  │   └─→ codex-v2.md (implementation contracts)
  │
  ├─→ Architecture
  │   └─→ claude-v3-erd.md (visual architecture)
  │
  ├─→ Operational
  │   ├─→ claude-v3-roadmap.md (phased path)
  │   ├─→ gemini-v3-governance-flow.md (workflow)
  │   ├─→ gemini-v3-minimal-package.md (MVP boilerplate)
  │   └─→ worked-example.md (proof)
  │
  └─→ Reference
      ├─→ iteration-log.md (evolution)
      └─→ design-system-research.md (industry context)
```

### Iteration Lineage

```
experience-systems-whitepaper.md (Draft 0)
  ↓
gemini-v1.md (Iteration 1: Industry context)
  ↓
codex-v1.md (Iteration 2: Implementation-first)
  ↓
claude-v2.md (Iteration 3: Synthesis)
  ↓
gemini-v2.md (Iteration 4: Unified blueprint)
  ↓
codex-v2.md (Iteration 5: Build contracts)
  ↓
claude-v3-erd.md + claude-v3-roadmap.md (Iteration 6: Architecture + roadmap)
  ↓
gemini-v3-governance-flow.md + gemini-v3-minimal-package.md (Iteration 7: Process + MVP)
  ↓
final-structure.md + worked-example.md (Iteration 8: Navigation + proof)
```

---

## Recommended Reading Sequences

### Sequence 1: Executive Briefing (30 min)
1. `README.md` (5 min)
2. `experience-systems-whitepaper.md` → Abstract + Part I + Part VIII (15 min)
3. `worked-example.md` → Skim output examples (10 min)

### Sequence 2: Technical Deep Dive (2 hours)
1. `README.md` (5 min)
2. `claude-v3-roadmap.md` → NOW phase (20 min)
3. `claude-v3-erd.md` → Core ERD + data flow (30 min)
4. `gemini-v3-minimal-package.md` → File-by-file review (30 min)
5. `codex-v2.md` → Adapter contracts + BCS formula (20 min)
6. `worked-example.md` → Full walkthrough (15 min)

### Sequence 3: Strategic Context (1.5 hours)
1. `README.md` (5 min)
2. `tokenized-design-systems.md` → Industry state (20 min)
3. `design-system-research.md` → Future hypotheses (15 min)
4. `gemini-v2.md` → Comprehensive blueprint (40 min)
5. `claude-v3-roadmap.md` → Implementation path (10 min)

### Sequence 4: Governance & Operations (1 hour)
1. `gemini-v3-governance-flow.md` → SCP workflow (20 min)
2. `gemini-v3-minimal-package.md` → Package structure (15 min)
3. `codex-v2.md` → Governance contracts (15 min)
4. `worked-example.md` → SCP example (10 min)

---

## Document Status Tracking

| Document | Status | Completeness | Audience | Last Updated |
|----------|--------|--------------|----------|--------------|
| `README.md` | ⚠️ MISSING | 0% | All | N/A |
| `final-structure.md` | ✅ ACTIVE | 100% | All | 2025-11-22 |
| `worked-example.md` | ⚠️ MISSING | 0% | All | N/A |
| `experience-systems-whitepaper.md` | 📄 SUPERSEDED | 100% | Strategic | 2025-11-21 |
| `gemini-v1.md` | 📄 ARCHIVED | 100% | Strategic | 2025-11-21 |
| `codex-v1.md` | 📄 ARCHIVED | 100% | Technical | 2025-11-21 |
| `claude-v2.md` | 📄 ARCHIVED | 100% | Cross-functional | 2025-11-22 |
| `gemini-v2.md` | ✅ REFERENCE | 100% | Cross-functional | 2025-11-21 |
| `codex-v2.md` | ✅ REFERENCE | 100% | Technical | 2025-11-21 |
| `claude-v3-erd.md` | ✅ ACTIVE | 100% | Technical | 2025-11-22 |
| `claude-v3-roadmap.md` | ✅ ACTIVE | 100% | Operational | 2025-11-22 |
| `gemini-v3-governance-flow.md` | ✅ ACTIVE | 100% | Operational | 2025-11-22 |
| `gemini-v3-minimal-package.md` | ✅ ACTIVE | 100% | Technical | 2025-11-22 |
| `design-system-principles.md` | ✅ ACTIVE | 100% | Strategic | 2025-11-21 |
| `design-system-research.md` | ✅ ACTIVE | 100% | Research | 2025-11-21 |
| `tokenized-design-systems.md` | ✅ ACTIVE | 100% | Research | Prior |
| `experience-systems-research-log.md` | ✅ ACTIVE | 100% | Research | 2025-11-21 |
| `design-system-roadmap.md` | 📄 ARCHIVED | 100% | Operational | 2025-11-21 |
| `design-system-index.md` | ✅ ACTIVE | 100% | Meta | 2025-11-21 |
| `iteration-log.md` | ✅ ACTIVE | 100% | Meta | 2025-11-22 |

**Legend**:
- ✅ ACTIVE: Current, recommended reading
- 📄 ARCHIVED: Superseded but valuable for historical context
- 📄 SUPERSEDED: Replaced by newer iteration
- ⚠️ MISSING: Planned but not yet created
- ✅ REFERENCE: Comprehensive reference document, may be dense

---

## Directory Structure Recommendation

```
/docs/
├── README.md                                          [ENTRY POINT]
├── studio/
│   └── experience-systems/
│       ├── final-structure.md                         [NAVIGATION]
│       ├── worked-example.md                          [PROOF]
│       │
│       ├── strategic/
│       │   ├── experience-systems-whitepaper.md       [Vision - Draft 0]
│       │   ├── gemini-v2.md                           [Unified Blueprint]
│       │   ├── design-system-principles.md            [Philosophy]
│       │   ├── design-system-research.md              [Hypotheses]
│       │   └── tokenized-design-systems.md            [Industry]
│       │
│       ├── architecture/
│       │   ├── claude-v3-erd.md                       [System Architecture]
│       │   └── codex-v2.md                            [Build Contracts]
│       │
│       ├── operational/
│       │   ├── claude-v3-roadmap.md                   [NOW/NEXT/LATER]
│       │   ├── gemini-v3-governance-flow.md           [SCP Workflow]
│       │   └── gemini-v3-minimal-package.md           [MVP Boilerplate]
│       │
│       ├── reference/
│       │   ├── iteration-log.md                       [Evolution Log]
│       │   ├── design-system-index.md                 [Dimensional Taxonomy]
│       │   └── experience-systems-research-log.md     [R&D Hypotheses]
│       │
│       └── exploration/                               [CURRENT LOCATION]
│           ├── [all iteration files]
│           └── [archive of superseded docs]
```

---

## Next Steps

### Immediate (Iteration 8)
1. ✅ Create `final-structure.md` (this document)
2. ⏳ Create `worked-example.md` with TechCo brand walkthrough
3. ⏳ Update `iteration-log.md` with Iteration 8 entry
4. 📋 Create `README.md` as entry point

### Short-term
1. Implement MVP per `gemini-v3-minimal-package.md`
2. Validate ERD against actual implementation
3. Answer open questions from `claude-v3-roadmap.md` NOW phase
4. Create first real SCP using `gemini-v3-governance-flow.md`

### Medium-term
1. Reorganize files into recommended directory structure
2. Archive superseded iterations
3. Create stakeholder-specific summary documents
4. Publish as coherent documentation site

---

## Maintenance Protocol

As the project evolves:

1. **New iterations**: Add to `iteration-log.md` with critique + summary
2. **Status changes**: Update document status tracking table in this file
3. **New artifacts**: Add to appropriate layer with relationship mapping
4. **Superseded docs**: Move to `exploration/archive/` but maintain in lineage graph
5. **README updates**: Reflect current phase and primary entry points

---

**Document Version**: Claude v4 - Final Structure
**Date**: 2025-11-22
**Status**: Active navigation and information architecture
**Related**: All documents (this is the map)
