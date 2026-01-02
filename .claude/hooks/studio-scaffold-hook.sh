#!/bin/bash
# Studio Project Scaffold Hook
# Runs after scaffold:studio command to suggest Linear project creation and enrichment
set -e

# Read input from stdin
input=$(cat)

# Extract tool info
tool_name=$(echo "$input" | jq -r '.tool_name // ""')
command=$(echo "$input" | jq -r '.tool_input.command // ""')
exit_code=$(echo "$input" | jq -r '.tool_response.exitCode // .tool_response.exit_code // 0')

# Only process successful scaffold commands
if [[ "$tool_name" != "Bash" ]]; then
  exit 0
fi

if [[ ! "$command" =~ scaffold:studio|scaffold-studio ]]; then
  exit 0
fi

if [[ "$exit_code" != "0" ]]; then
  exit 0
fi

# Extract project slug from command
project_slug=""
if [[ "$command" =~ scaffold:studio[[:space:]]+([a-z0-9_-]+) ]]; then
  project_slug="${BASH_REMATCH[1]}"
elif [[ "$command" =~ scaffold-studio\.ts[[:space:]]+([a-z0-9_-]+) ]]; then
  project_slug="${BASH_REMATCH[1]}"
fi

if [[ -n "$project_slug" ]]; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Studio project '${project_slug}' scaffolded successfully. Consider:\n\n1. **Create Linear project**: Use mcp__linear__create_project to create a corresponding Linear project for task tracking\n2. **Enrich generated files**: Review and enhance the generated components with project-specific content\n3. **Add hypotheses/experiments**: If not already in DB, add them via admin UI or directly\n4. **Prototype implementation**: For any prototype-type experiments, implement the component in src/prototypes/"
  }
}
EOF
fi

exit 0
