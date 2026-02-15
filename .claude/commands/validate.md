---
description: Run full project validation (lint, type-check, tests). Use before committing or pushing.
allowed-tools: "Bash, Read"
---

# Full Project Validation

Run the complete validation suite to ensure code quality.

## Steps

1. Run linting:
   ```bash
   npm run lint
   ```

2. Run type checking:
   ```bash
   npm run type-check
   ```

3. Run test suite:
   ```bash
   npm run test:run
   ```

4. Report results:
   - Lint: pass/fail with issue count
   - Types: pass/fail with error count
   - Tests: pass/fail with test count and failures
   - Overall: ready to commit or needs fixes

If any step fails, analyze the errors and suggest fixes. Do NOT automatically fix — present the issues and ask what to do.
