# Studio Project Registry

> **Last updated:** 2025-12-26
> **Quick pulse:** DST hot (Phase 5). ES paused. Hando (home platform) starting with Twin (digital building model).

---

## Active Projects

### Design System Tool

| Field | Value |
|-------|-------|
| **Path** | `/app/components/studio/`, `/app/docs/studio/design-system-tool/` |
| **Status** | Active - Phase 5 in progress |
| **Temperature** | Hot |
| **Public URL** | `/studio/design-system-tool` |

**Current focus:** Completing interaction & state system (Phase 5). Foundation done (state opacity, scale transforms, focus rings, feedback colors). Advanced features pending (loading states, timing thresholds, blur effects).

**Next milestone:** Phase 5 completion, then evaluate whether to continue with Phases 4a-4g or export theme for site use.

**Blockers:** None

**Deferred:**
- Phase 4f full implementation (nested radius context system) - reverted, keeping calculator only
- Phase 4.5 (motion modes) - deferred for future cycle
- Phases 6-10 (theme packages, AI integration, Figma sync, marketplace)

**Recent wins:**
- Semantic motion profiles complete
- Radius configuration with custom editing
- Button styles now use dynamic border radius from config

---

### Experience Systems

| Field | Value |
|-------|-------|
| **Path** | `/app/docs/studio/experience-systems/exploration/` |
| **Status** | Paused - exploration complete |
| **Temperature** | Warm |

**Current focus:** N/A (paused)

**Parked because:** Conceptual exploration complete (8 whitepaper iterations, 21 docs, 10k+ lines). Ready for prototype phase but Design System Tool has momentum and delivers near-term value.

**Resume trigger:**
- Design System Tool reaches stable state (Phase 5 complete)
- Opportunity to use DST as first ES adapter emerges
- External interest/collaboration opportunity

**Exploration artifacts ready:**
- Whitepaper iterations (Claude, Gemini, Codex collaboration)
- ERD and architecture diagrams
- SCP governance workflow
- TechCo worked example with BCS calculation
- 80+ term glossary

---

### Hando

| Field | Value |
|-------|-------|
| **Path** | `/app/components/studio/hando/` |
| **Status** | Planning - platform foundation |
| **Temperature** | Warm |
| **Database Tables** | Sub-projects use `studio_hando_{subproject}_*` |

**Current focus:** Defining twin (digital building model) as first sub-project

**Next milestone:** Twin data model and initial prototype

**Blockers:** None

**Sub-projects:**
- `twin` - Digital twin for residential buildings (Planning)

**Notes:** Platform for home maintenance and management. Twin provides the foundational building model that other sub-projects (maintenance scheduling, cost tracking, etc.) could build upon.

---

## Shared Infrastructure

- [ ] Auth system - not yet needed for studio projects
- [ ] Component library - emerging in Design System Tool, not extracted
- [x] Supabase database - shared instance, studio tables prefixed `studio_*`
- [x] Deployment pipeline - Vercel, working
- [ ] Token validation utilities - potential extraction from DST

---

## Cross-Project Notes

**Synergies identified:**
- Design System Tool could become the first Experience Systems web adapter
- Both use three-tier token architecture (Primitive → Semantic → Component)
- OKLCH color implementation in DST could power ES color derivation
- SCP governance from ES could inform DST theme versioning

**Strategic observation:**
DST is "eating our own dog food" - building the jonfriis.com theme while creating a portfolio showcase piece. This dual purpose keeps it grounded in real needs.

**Future consideration:**
When DST matures, consider whether to:
1. Keep it as a portfolio demo only
2. Extract as standalone tool/library
3. Integrate as ES's first production adapter

---

*Maintenance: Update when starting/pausing projects or hitting major milestones. Don't update for every commit - this tracks strategic state, not task state.*
