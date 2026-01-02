#!/bin/bash
# Studio Scaffold Prompt Hook
# Runs when user mentions scaffolding studio projects
# Queries DB for projects needing scaffold/sync and outputs actionable context
set -e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Run the candidates script and capture output
candidates_output=$(cd "$PROJECT_DIR" && npx tsx scripts/scaffold-candidates.ts 2>/dev/null)

if [[ -z "$candidates_output" ]] || echo "$candidates_output" | jq -e '.error' > /dev/null 2>&1; then
  # Error or empty - fall back to protocol doc
  cat "$PROJECT_DIR/docs/infrastructure/STUDIO_PROJECT_PROTOCOL.md"
  exit 0
fi

# Parse the JSON
needs_scaffold=$(echo "$candidates_output" | jq -r '.needsScaffold')
needs_sync=$(echo "$candidates_output" | jq -r '.needsSync')
recently_scaffolded=$(echo "$candidates_output" | jq -r '.recentlyScaffolded')

scaffold_count=$(echo "$needs_scaffold" | jq 'length')
sync_count=$(echo "$needs_sync" | jq 'length')
recent_count=$(echo "$recently_scaffolded" | jq 'length')

# Build output
cat << 'HEADER'
# Studio Project Scaffolding

HEADER

# Projects needing initial scaffold
if [[ "$scaffold_count" -gt 0 ]]; then
  echo "## Projects Ready for Scaffolding"
  echo ""
  echo "These projects have never been scaffolded:"
  echo ""
  echo "$needs_scaffold" | jq -r '.[] | "- **\(.name)** (`\(.slug)`) - \(.status), \(.experimentCount) experiments"'
  echo ""
  echo "Command: \`npm run scaffold:studio <slug>\`"
  echo ""
fi

# Projects needing sync
if [[ "$sync_count" -gt 0 ]]; then
  echo "## Projects Needing Sync"
  echo ""
  echo "These projects have new experiments added since last scaffold:"
  echo ""
  echo "$needs_sync" | jq -r '.[] | "- **\(.name)** (`\(.slug)`) - \(.newExperiments) new: \(.newExperimentNames | join(", "))"'
  echo ""
  echo "Command: \`npm run scaffold:studio:sync <slug>\`"
  echo ""
fi

# Recently scaffolded (for context)
if [[ "$recent_count" -gt 0 ]]; then
  echo "## Recently Scaffolded"
  echo ""
  echo "$recently_scaffolded" | jq -r '.[] | "- \(.name) (`\(.slug)`) - scaffolded \(.scaffoldedAt | split("T")[0])"'
  echo ""
fi

# No candidates
if [[ "$scaffold_count" -eq 0 ]] && [[ "$sync_count" -eq 0 ]]; then
  echo "## No Projects Pending"
  echo ""
  echo "All studio projects are up to date. To scaffold a new project:"
  echo ""
  echo "1. Create the project in the admin UI or via MCP"
  echo "2. Add hypotheses and experiments"
  echo "3. Run \`npm run scaffold:studio <slug>\`"
  echo ""
fi

# Workflow reminder
cat << 'WORKFLOW'
---

## Workflow

1. **Select a project** from above (or specify one)
2. **Run scaffold command** - I'll execute `npm run scaffold:studio <slug>` or `scaffold:studio:sync <slug>`
3. **Follow up actions** after scaffolding:
   - Create Linear project for task tracking
   - Enrich generated files with project-specific content
   - Implement prototype components (for prototype-type experiments)
4. **Add more experiments** in admin UI if needed, then sync again

WORKFLOW
