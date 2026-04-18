#!/usr/bin/env bash
# PreToolUse hook for `git commit`: require /simplify skill to run first.
# Uses a per-session sentinel file to avoid blocking retries after Claude
# invokes the skill and acknowledges via `touch $SENTINEL`.

set -euo pipefail

INPUT=$(cat)
SID=$(printf '%s' "$INPUT" | jq -r '.session_id // empty')

if [ -z "$SID" ]; then
  # No session id — fail open to avoid blocking legitimate commits.
  exit 0
fi

CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty')
[ -n "$CWD" ] && cd "$CWD"

if ! git diff --cached --name-only --diff-filter=ACDMR 2>/dev/null | grep -qE '\.(ts|tsx|js|jsx|mjs|cjs|css|sh)$'; then
  exit 0
fi

SENTINEL="/tmp/claude-simplify-${SID}.done"

if [ -f "$SENTINEL" ]; then
  exit 0
fi

jq -n --arg s "$SENTINEL" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: ("Before committing, invoke the /simplify skill to review staged changes for reuse, quality, and efficiency. After addressing issues, run: touch " + $s + " — then retry the commit.")
  }
}'
