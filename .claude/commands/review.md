---
description: Review recent changes before committing. Runs diff analysis and identifies issues.
allowed-tools: "Bash, Read, Glob, Grep"
---

# Pre-Commit Review

Review all staged and unstaged changes before committing.

## Steps

1. Check git status:
   ```bash
   git status
   ```

2. Show the full diff:
   ```bash
   git diff
   git diff --cached
   ```

3. Analyze the changes for:
   - **Security**: No secrets, API keys, or credentials in diff
   - **Types**: No new `any` types introduced
   - **Accessibility**: Any UI changes maintain a11y standards
   - **Performance**: No obvious performance regressions
   - **Testing**: Are there tests for new functionality?
   - **Conventions**: Code follows project patterns

4. If there are migration files in the diff:
   - Verify RLS policies are included
   - Check for proper indexes
   - Ensure no existing migrations were modified

5. Report:
   - Summary of what changed
   - Any issues or concerns found
   - Suggested commit message
   - Whether it's ready to commit
