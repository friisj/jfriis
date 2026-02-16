# Plan: Harden Claude Code Configuration

Address oversights and risks identified in the branch critique.

## 1. Remove `SUPABASE_SERVICE_ROLE_KEY` from session-init.sh

**File:** `.claude/hooks/session-init.sh`

Remove `SUPABASE_SERVICE_ROLE_KEY` from the allowlist in the `case` statement. The MCP server reads `.env.local` directly — it doesn't need this injected into the Claude env. Leaving it exposes the most privileged credential unnecessarily.

## 2. Tighten `npx supabase *` permissions

**File:** `.claude/settings.json`

Replace the blanket `Bash(npx supabase *)` with specific allowlisted subcommands:
- `Bash(npx supabase migration *)`
- `Bash(npx supabase db push)`  (local only, no flags)
- `Bash(npx supabase db diff*)`
- `Bash(npx supabase gen types *)`
- `Bash(npx supabase migration list*)`
- `Bash(npx supabase start*)`
- `Bash(npx supabase status*)`

This excludes `db reset`, `db push --linked`, and other destructive subcommands by omission.

## 3. Block git push to main/master in the guard hook

**File:** `.claude/hooks/guard-destructive-ops.sh`

Add a block (not just warning) for `git push` when on `main` or `master`, matching the same pattern used for force-push. Non-force pushes to main should also be blocked — all work goes through feature branches.

## 4. Remove `Bash(node *)` from permissions

**File:** `.claude/settings.json`

Remove the blanket `Bash(node *)` allow rule. If a specific need arises (e.g., running a script), Claude can request permission at that point. Arbitrary `node -e` execution is too open.

## 5. Expand `rm` deny patterns

**File:** `.claude/settings.json`

Add to the deny list:
- `Bash(rm -r *)`
- `Bash(find * -delete*)`

This closes the most obvious bypasses of the existing `rm -rf` deny.

## 6. Add `supabase db reset` to guard hook block list

**File:** `.claude/hooks/guard-destructive-ops.sh`

Add a block rule for `supabase db reset` since it drops and recreates the entire local database. This is a destructive operation that should require manual execution.

---

**Out of scope** (noted but not worth the complexity):
- MCP `db_delete` guardrails — single-user project, record-level deletes via MCP are fine
- Heredoc/pipe SQL injection edge cases — diminishing returns
- `/review` command enforcement — it's guidance for Claude, not a CI gate
