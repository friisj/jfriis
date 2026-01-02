#!/bin/bash
# Linear Issue Commit Tracker
# Runs after git commits to detect Linear issue IDs and suggest updates
set -e

# Read input from stdin
input=$(cat)

# Extract tool info
tool_name=$(echo "$input" | jq -r '.tool_name // ""')
command=$(echo "$input" | jq -r '.tool_input.command // ""')
exit_code=$(echo "$input" | jq -r '.tool_response.exitCode // .tool_response.exit_code // 0')

# Only process successful git commit commands
if [[ "$tool_name" != "Bash" ]]; then
  exit 0
fi

if [[ ! "$command" =~ git[[:space:]]+(commit|cherry-pick|revert) ]]; then
  exit 0
fi

if [[ "$exit_code" != "0" ]]; then
  exit 0
fi

# Extract commit message - handle various formats
# Format 1: git commit -m "message"
# Format 2: git commit -m "$(cat <<'EOF' ... EOF)"
# Format 3: git commit --message="message"
commit_msg=""

# Try to extract from -m flag
if [[ "$command" =~ -m[[:space:]]+[\"\']([^\"\']+)[\"\'] ]]; then
  commit_msg="${BASH_REMATCH[1]}"
elif [[ "$command" =~ -m[[:space:]]+\"\$\(cat ]]; then
  # HEREDOC format - extract the message content
  commit_msg=$(echo "$command" | sed -n "s/.*<<'EOF'//p" | sed "s/EOF.*//")
fi

# Find Linear issue IDs (OJI-XX pattern for this workspace)
issues=$(echo "$command" | grep -oE 'OJI-[0-9]+' | sort -u | tr '\n' ' ' || true)

if [[ -n "$issues" && "$issues" != " " ]]; then
  # Return JSON output suggesting Linear updates
  issues_trimmed=$(echo "$issues" | xargs)
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Commit references Linear issues: ${issues_trimmed}. Consider updating issue status or adding a comment with progress notes using the Linear MCP tools."
  }
}
EOF
fi

exit 0
