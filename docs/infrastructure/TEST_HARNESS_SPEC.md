# Test Harness & CI Specification

**Status**: Draft
**Created**: 2026-01-22

---

## Problem

Recent regressions have shipped to production:
- Prop name mismatches (StatusBadge `status` → `value`)
- Import path errors
- TypeScript type drift
- Null reference errors

**Root cause**: No automated validation. Build errors are currently suppressed via `ignoreBuildErrors: true`.

---

## Goals

1. **Catch regressions before merge** - automated validation on every PR
2. **Fast feedback** - developers know within seconds if something broke
3. **Agent integration** - leverage AI agents for intelligent review
4. **Minimal maintenance** - simple tools, colocated tests

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Developer Workflow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Local Dev          Pre-commit           CI Pipeline            │
│   ─────────          ──────────           ───────────            │
│   npm run dev   →    lint-staged    →    GitHub Actions          │
│   npm test           (type check,        (full build,            │
│                       lint, format)       tests, coverage)       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Agent Review   │
                    │  (on large PRs) │
                    └─────────────────┘
```

---

## Phases

### Phase 1: Build Enforcement

**Goal**: Stop suppressing errors. Enforce build validation.

**Changes**:
1. Remove `ignoreBuildErrors` and `ignoreDuringBuilds` from `next.config.ts`
2. Fix all existing TypeScript/ESLint errors
3. Add GitHub Actions workflow for PR validation

**CI Pipeline** (`.github/workflows/ci.yml`):
```yaml
- npm ci
- npm run lint
- npx tsc --noEmit
- npm run build
```

**Success criteria**: PRs cannot merge if build fails.

---

### Phase 2: Testing Infrastructure

**Goal**: Add component and utility testing.

**Stack**:
- **Vitest** - Fast, Jest-compatible, native ESM
- **React Testing Library** - Behavior-focused component testing
- **happy-dom** - Lightweight DOM environment

**Test organization**: Colocate with source files
```
components/
  admin/
    status-badge.tsx
    status-badge.test.tsx    ← colocated
lib/
  entity-links.ts
  entity-links.test.ts       ← colocated
```

**Priority order** (by regression risk):
1. Shared UI components (`components/ui/`, `components/admin/`)
2. Utility functions (`lib/`)
3. API routes (`app/api/`)

**Success criteria**: `npm test` runs in <30s locally.

---

### Phase 3: Pre-commit Hooks

**Goal**: Immediate feedback before commit.

**Stack**:
- **Husky** - Git hooks
- **lint-staged** - Run checks on staged files only

**Pre-commit checks**:
```bash
*.{ts,tsx}  → eslint --fix + vitest related --run
*.{json,md} → prettier --write
```

**Success criteria**: Pre-commit completes in <10s.

---

### Phase 4: Agent Integration

**Goal**: Automated intelligent review on significant PRs.

**Trigger**: PRs with >500 lines changed

**Agent workflow**:
1. CI collects build output, test results, coverage
2. `tech-review` agent analyzes changes
3. Agent posts findings as PR comment

**Success criteria**: Significant PRs get automated architectural feedback.

---

## What We Test

| Layer | What | How | Priority |
|-------|------|-----|----------|
| Types | Props, interfaces, return types | `tsc --noEmit` | P0 |
| Lint | Code style, unused vars, imports | `eslint` | P0 |
| Build | App compiles, no runtime errors | `next build` | P0 |
| Components | Render, props, user interaction | Vitest + RTL | P1 |
| Utilities | Pure functions, edge cases | Vitest | P1 |
| API Routes | Request/response, error handling | Vitest | P2 |
| E2E | Full user flows | Playwright (future) | P3 |

---

## What We Don't Test (Yet)

- **E2E flows** - Overkill for current phase; add when there's clear need
- **Visual regression** - Snapshot testing is brittle; avoid
- **External integrations** - Mock Supabase, AI SDKs in tests
- **100% coverage** - Target 60-70% on critical paths, not vanity metrics

---

## File Structure

```
/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Build + test on PR
│       └── agent-review.yml    # Trigger tech-review
├── __tests__/
│   ├── setup.ts                # Vitest global setup
│   ├── fixtures/               # Shared test data
│   └── mocks/                  # Supabase, AI SDK mocks
├── vitest.config.ts
├── .husky/
│   └── pre-commit
└── components/
    └── *.test.tsx              # Colocated tests
```

---

## Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc --noEmit",
    "validate": "npm run lint && npm run type-check && npm run test:run"
  }
}
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| CI pipeline duration | <5 min |
| Pre-commit duration | <10 sec |
| Local test run | <30 sec |
| Regression catch rate | 90%+ |
| Test coverage (critical paths) | 60-70% |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Too many existing errors to fix | Fix incrementally; use `// @ts-expect-error` sparingly |
| Pre-commit hooks slow dev | Run only on staged files; allow `--no-verify` escape hatch |
| Test maintenance burden | Keep tests focused on behavior, not implementation |
| Over-testing | Prioritize by regression risk, not coverage % |

---

## Open Questions

1. Should pre-commit hooks be blocking or warning-only initially?
2. What's the threshold for triggering agent review (500 LOC? 10 files?)
3. Should we track a Linear issue for this work?

---

## Next Steps

1. [ ] Fix `next.config.ts` - remove error suppression
2. [ ] Create GitHub Actions CI workflow
3. [ ] Fix existing TypeScript/ESLint errors
4. [ ] Install Vitest + React Testing Library
5. [ ] Add first test (StatusBadge)
6. [ ] Set up Husky pre-commit hooks
