# Quick Start: Codebase Improvements

**TL;DR:** This guide gets you started on improving the codebase based on the December 31, 2025 audit.

## 🚀 Get Started in 5 Minutes

### 1. Read the Audit Summary
Read the [Executive Summary from the audit](./CODEBASE_AUDIT_2025-12-31.md) to understand what needs fixing.

**Key Findings:**
- 🔴 **CRITICAL:** TypeScript errors ignored, zero tests
- 🟡 **HIGH:** Security issues (CORS, logging, env vars)
- 🟢 **GOOD:** Architecture is solid, recent fixes were excellent

### 2. Choose Your Path

**Path A: Fix Critical Issues Only (1 week)**
```bash
# Essential for production
Phase 0: Testing setup (3 hours)
Phase 1: TypeScript fixes (6 hours)
Phase 2: Core tests (12 hours)
Phase 3: Security (4 hours)
Phase 4: Rate limiting (3 hours)
```
**Total: ~28 hours over 5-7 days**

**Path B: Full Quality Improvements (3 weeks)**
```bash
# All 8 phases for production-grade quality
Week 1: Phases 0-4 (critical path)
Week 2: Phases 5-7 (monitoring + tests)
Week 3: Phase 8 (performance)
```
**Total: ~50 hours over 3 weeks**

**Path C: One Phase at a Time (flexible)**
Pick phases as needed, merge incrementally.

### 3. Start Phase 0 Right Now

```bash
# Create feature branch
git checkout -b phase-0-foundation

# Install dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @vitest/ui happy-dom

# Create config file
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
EOF

# Add test script to package.json
npm pkg set scripts.test="vitest"

# Verify it works
npm run test

# Commit
git add .
git commit -m "test: add Vitest configuration (Phase 0)"
git push -u origin phase-0-foundation
```

**Time: 30 minutes**

✅ **Done!** You've completed Phase 0. Create a PR and merge it.

---

## 📋 Phase Checklist

Use this checklist to track your progress through each phase:

### ✅ Phase 0: Foundation & Setup (2-3 hours)
- [ ] Install Vitest
- [ ] Create `vitest.config.ts`
- [ ] Add test scripts to `package.json`
- [ ] Create `__tests__/utils/test-helpers.ts`
- [ ] Run `npm run test` successfully
- [ ] Commit and create PR
- [ ] Merge to main

### ✅ Phase 1: TypeScript Enforcement (4-6 hours)
- [ ] Generate Supabase types: `npx supabase gen types typescript --local > lib/types/database.generated.ts`
- [ ] Update type imports
- [ ] Fix errors in `lib/types/*.ts`
- [ ] Fix errors in `lib/*.ts`
- [ ] Fix errors in `components/**/*.tsx`
- [ ] Fix errors in `app/**/*.tsx`
- [ ] Remove `ignoreBuildErrors: true` from `next.config.ts`
- [ ] Run `npm run build` without errors
- [ ] Commit and create PR
- [ ] Merge to main

### ✅ Phase 2: Core CRUD Tests (8-12 hours)
- [ ] Set up test database config
- [ ] Write journey CRUD tests
- [ ] Write N+1 query performance tests
- [ ] Write pagination tests
- [ ] Configure coverage reporting
- [ ] Achieve 50%+ test coverage
- [ ] All tests pass
- [ ] Commit and create PR
- [ ] Merge to main

### ✅ Phase 3: Security Hardening (3-4 hours)
- [ ] Create `lib/config/env.ts` for validation
- [ ] Update Supabase client
- [ ] Remove debug logging
- [ ] Restrict OAuth CORS
- [ ] Create `lib/utils/logger.ts`
- [ ] Replace `console.log` with `logger`
- [ ] Add CSP headers to `next.config.ts`
- [ ] Test in production mode
- [ ] Commit and create PR
- [ ] Merge to main

### ✅ Phase 4: AI Rate Limiting (2-3 hours)
- [ ] Create `lib/auth/session.ts`
- [ ] Add rate limiting to `/api/ai/generate`
- [ ] Update AI hook to handle rate limits
- [ ] Add rate limit UI indicator
- [ ] Test rate limit enforcement
- [ ] Commit and create PR
- [ ] Merge to main

---

## 🎯 Daily Goals (Suggested)

### Day 1: Testing Foundation
**Goal:** Complete Phase 0
**Time:** 2-3 hours
**Output:** Vitest configured, tests runnable

### Day 2-3: TypeScript Fixes
**Goal:** Complete Phase 1
**Time:** 4-6 hours
**Output:** Zero TypeScript errors, build succeeds

### Day 4: Write Tests
**Goal:** Start Phase 2
**Time:** 4 hours
**Output:** Journey CRUD tests written

### Day 5: Finish Tests
**Goal:** Complete Phase 2
**Time:** 4-8 hours
**Output:** 50%+ test coverage, all tests pass

### Day 6: Security
**Goal:** Complete Phase 3
**Time:** 3-4 hours
**Output:** Environment vars validated, CORS restricted, logging sanitized

### Day 7: Rate Limiting
**Goal:** Complete Phase 4
**Time:** 2-3 hours
**Output:** AI endpoints protected from abuse

**Result after 1 week: Production-ready codebase** ✅

---

## 🛠️ Development Workflow

### Starting a New Phase

```bash
# Pull latest
git checkout main
git pull origin main

# Create phase branch
git checkout -b phase-N-description

# Make changes...

# Run checks locally
npm run test          # Tests pass?
npm run build         # Build succeeds?
npm run lint          # No lint errors?

# Commit with conventional commits
git add .
git commit -m "feat: implement Phase N - Description"

# Push and create PR
git push -u origin phase-N-description
```

### PR Template

Use this template for each phase PR:

```markdown
## Phase N: [Title]

[Brief description from improvement plan]

### Changes
- List major changes
- Use checkboxes for features

### Testing
```bash
# Commands to test this PR
npm run test
npm run build
```

### Checklist
- [ ] Tests added/updated
- [ ] Tests passing
- [ ] Build succeeds
- [ ] No new TypeScript errors
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

### Related Issues
- Addresses findings from [Codebase Audit](./CODEBASE_AUDIT_2025-12-31.md)
- Implements [Phase N of Improvement Plan](./CODEBASE_IMPROVEMENT_PLAN.md#phase-N)

### Screenshots
[If applicable]
```

### Merging

```bash
# After PR approval
git checkout main
git merge --squash phase-N-description
git commit -m "feat: complete Phase N - Description"
git push origin main

# Tag the release
git tag -a phase-N-complete -m "Phase N: Description"
git push --tags

# Update progress tracker
# Edit docs/IMPROVEMENT_PROGRESS.md
```

---

## 🆘 Troubleshooting

### "Vitest not found"
```bash
npm install -D vitest
```

### "TypeScript errors won't fix"
Start with lib files first, then work up to components and pages. Ignore app routes until the end.

### "Tests fail to import Supabase client"
Create a mock in `__tests__/utils/test-helpers.ts`:
```typescript
export const mockSupabaseClient = () => {
  return createClient('http://localhost:54321', 'test-key')
}
```

### "Build still failing after Phase 1"
Check that you:
1. Generated Supabase types
2. Updated all imports to use generated types
3. Fixed all `any` type errors
4. Removed both `ignoreBuildErrors` flags

### "CORS errors in development"
Add `http://localhost:3000` to `OAUTH_ALLOWED_ORIGINS` in `.env.local`:
```bash
OAUTH_ALLOWED_ORIGINS=http://localhost:3000,https://www.jonfriis.com
```

### "Rate limiting not working"
Ensure KV environment variables are set:
```bash
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

---

## 📚 Documentation Index

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [Codebase Audit](./CODEBASE_AUDIT_2025-12-31.md) | Full audit findings | Before starting |
| [Improvement Plan](./CODEBASE_IMPROVEMENT_PLAN.md) | Detailed phase descriptions | During each phase |
| [Progress Tracker](./IMPROVEMENT_PROGRESS.md) | Track your progress | Update weekly |
| **This Document** | Quick start guide | Right now! |

---

## 🎓 Learning Resources

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Supabase TypeScript Guide](https://supabase.com/docs/guides/api/generating-types)

### Testing
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

### Performance
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Database Indexing Best Practices](https://use-the-index-luke.com/)

---

## 💡 Pro Tips

1. **Don't skip Phase 0** - Testing infrastructure is essential
2. **Fix TypeScript errors file-by-file** - Don't try to fix everything at once
3. **Commit frequently** - Small commits are easier to review and revert
4. **Test locally before pushing** - Run `npm run build` to catch issues early
5. **Update progress tracker** - Helps you see how far you've come
6. **Celebrate small wins** - Each merged phase is progress!

---

## 🚦 Status Indicators

Track your overall progress:

```
⬜⬜⬜⬜⬜⬜⬜⬜  Not Started (0/8 phases)
🚧⬜⬜⬜⬜⬜⬜⬜  In Progress (1/8 phases)
✅✅✅✅⬜⬜⬜⬜  Halfway (4/8 phases)
✅✅✅✅✅✅✅✅  Complete! (8/8 phases)
```

Current Status: **⬜⬜⬜⬜⬜⬜⬜⬜** (Ready to start!)

---

## 🎉 Success Criteria

You'll know you're done when:

- ✅ `npm run build` succeeds without errors
- ✅ `npm run test` shows 50%+ coverage
- ✅ No security warnings in audit
- ✅ Rate limiting protects AI endpoints
- ✅ Pre-commit hooks enforce quality
- ✅ Production deployment succeeds

---

**Ready to start? Jump to [Phase 0 in the improvement plan](./CODEBASE_IMPROVEMENT_PLAN.md#phase-0-foundation--setup-pre-work)!**

**Questions?** Review the [full improvement plan](./CODEBASE_IMPROVEMENT_PLAN.md) for detailed guidance.

**Stuck?** Check [Troubleshooting](#-troubleshooting) above.

Good luck! 🚀
