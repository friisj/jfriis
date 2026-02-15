#!/bin/bash
# Guard against destructive operations
# PreToolUse hook for Bash commands
set -e

input=$(cat)

tool_name=$(echo "$input" | jq -r '.tool_name // ""')
if [[ "$tool_name" != "Bash" ]]; then
  exit 0
fi

command=$(echo "$input" | jq -r '.tool_input.command // ""')

# Block destructive git operations on main/master
current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

if [[ "$current_branch" == "main" || "$current_branch" == "master" ]]; then
  # Block any push on main/master (all work goes through feature branches)
  if echo "$command" | grep -qE 'git\s+push'; then
    cat <<EOF
{
  "decision": "block",
  "reason": "BLOCKED: Pushing to '$current_branch' is not allowed. All work must go through feature branches."
}
EOF
    exit 0
  fi

  # Warn about direct commits to main
  if echo "$command" | grep -qE 'git\s+commit'; then
    cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "WARNING: You are committing directly to '$current_branch'. Consider using a feature branch."
  }
}
EOF
    exit 0
  fi
fi

# Block dropping production tables
if echo "$command" | grep -qiE 'DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE\s+TABLE'; then
  cat <<EOF
{
  "decision": "block",
  "reason": "BLOCKED: Destructive database operations (DROP/TRUNCATE) must be done through migrations, not direct commands."
}
EOF
  exit 0
fi

# Block supabase db reset (drops and recreates entire local database)
# Only match when it looks like an actual command invocation, not a string in a commit message
if echo "$command" | grep -qE '^\s*(npx\s+)?supabase\s+db\s+reset|&&\s*(npx\s+)?supabase\s+db\s+reset|\|\s*(npx\s+)?supabase\s+db\s+reset'; then
  cat <<EOF
{
  "decision": "block",
  "reason": "BLOCKED: 'supabase db reset' drops and recreates the entire local database. Run this manually if needed."
}
EOF
  exit 0
fi

# Warn about running migrations against remote/production
if echo "$command" | grep -qE 'supabase\s+db\s+push\s+.*--linked|supabase\s+migration\s+.*--linked'; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "WARNING: This command targets the REMOTE/PRODUCTION database. Make sure this is intentional and the migration has been tested locally first."
  }
}
EOF
  exit 0
fi

exit 0
