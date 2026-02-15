#!/bin/bash
# SessionStart hook — bootstrap environment for Claude Code sessions
# Sources .env.local vars into CLAUDE_ENV_FILE so they persist across Bash calls
set -e

# Only act if CLAUDE_ENV_FILE is set (provided by Claude Code runtime)
if [[ -z "$CLAUDE_ENV_FILE" ]]; then
  exit 0
fi

ENV_FILE=".env.local"

# Fall back to .env if .env.local doesn't exist
if [[ ! -f "$ENV_FILE" ]]; then
  ENV_FILE=".env"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  # No env file found — nothing to bootstrap
  exit 0
fi

# Source specific variables needed by MCP server and build tools
# (We're selective to avoid leaking secrets into the full env)
while IFS='=' read -r key value; do
  # Skip comments and blank lines
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  # Remove surrounding quotes from value
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  # Only export known safe variables
  case "$key" in
    NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY)
      echo "export $key=\"$value\"" >> "$CLAUDE_ENV_FILE"
      ;;
    NEXT_PUBLIC_SHOW_SPLASH)
      echo "export $key=\"$value\"" >> "$CLAUDE_ENV_FILE"
      ;;
    NODE_ENV)
      echo "export $key=\"$value\"" >> "$CLAUDE_ENV_FILE"
      ;;
  esac
done < "$ENV_FILE"

exit 0
