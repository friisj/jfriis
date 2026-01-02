# Claude Rule: Linear Issue Tracking

**Active when**: Working on tasks that have corresponding Linear issues (OJI-XX)

---

## Context

Linear is the single source of truth for task tracking in this project. When working on implementation tasks, Claude should proactively keep Linear issues updated to maintain accurate project status.

## Core Behaviors

### When Starting Work on a Linear Issue

1. **Update issue status** to "In Progress" using `mcp__linear__update_issue`
2. **Note the issue ID** (OJI-XX) for reference in commits

```typescript
// Example: Starting work on OJI-15
await mcp__linear__update_issue({
  id: "OJI-15",
  state: "In Progress"
});
```

### During Work

1. **Add comments** for significant decisions or blockers
2. **Update description** if scope changes
3. **Create sub-issues** if task needs breakdown

### When Completing Work

1. **Include issue ID in commit message**: `git commit -m "feat: Add evidence helper functions (OJI-15)"`
2. **Update issue status** to "Done" after successful commit
3. **Add completion comment** summarizing what was done

```typescript
// Example: Completing OJI-15
await mcp__linear__update_issue({
  id: "OJI-15",
  state: "Done"
});
await mcp__linear__create_comment({
  issueId: "OJI-15",
  body: "Implemented `lib/evidence.ts` with helper functions:\n- getEvidence()\n- addEvidence()\n- syncEvidence()\n\nCommit: abc123"
});
```

### When Blocked

1. **Add blocking comment** explaining the issue
2. **Create blocking relationship** if blocked by another issue
3. **Consider creating a new issue** for the blocker if it's new work

## Commit Message Format

Include Linear issue IDs in commit messages for traceability:

```
<type>: <description> (OJI-XX)

<optional body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

Examples:
- `feat: Add evidence table migration (OJI-11)`
- `fix: Handle null entity_type in links (OJI-16)`
- `refactor: Simplify sync logic (OJI-15, OJI-16)`

## When to Track vs Not Track

### DO Track in Linear
- Implementation tasks from project backlogs
- Bug fixes with known scope
- Features being actively developed
- Anything with an existing OJI-XX issue

### DON'T Track in Linear
- Quick questions/research
- One-off fixes without existing issues
- Exploratory work (unless it becomes a task)
- Session-specific todos (use TodoWrite instead)

## Proactive Behaviors

1. **Before starting work**: Check if there's a relevant Linear issue
2. **When user mentions a task**: Suggest creating a Linear issue if none exists
3. **After commits**: Hook will remind to update Linear (if issue ID detected)
4. **At session end**: Consider updating any in-progress issues

## Available Linear MCP Tools

- `mcp__linear__list_issues` - Find issues
- `mcp__linear__get_issue` - Get issue details
- `mcp__linear__create_issue` - Create new issues
- `mcp__linear__update_issue` - Update status, description, etc.
- `mcp__linear__create_comment` - Add progress comments
- `mcp__linear__list_projects` - List projects

## Project Context

This workspace uses:
- **Team**: Oji
- **Issue prefix**: OJI-
- **Projects**: Site, Studio, Personal, Entity Relationship Simplification

---

**Rule Version**: 1.0
**Last Updated**: 2026-01-02
**Active For**: All development work with Linear issues
