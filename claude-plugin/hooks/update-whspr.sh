#!/bin/bash
# Stop hook for whspr plugin
# Checks if WHSPR.md exists and triggers an update if needed

# Read JSON input from stdin
INPUT=$(cat)

# Parse stop_hook_active from input
STOP_HOOK_ACTIVE=$(echo "$INPUT" | grep -o '"stop_hook_active":\s*true' || echo "")

# If we're already in a stop hook continuation, allow the stop to prevent infinite loops
if [ -n "$STOP_HOOK_ACTIVE" ]; then
    exit 0
fi

# Get the current working directory from input
CWD=$(echo "$INPUT" | sed -n 's/.*"cwd":\s*"\([^"]*\)".*/\1/p')

# If we couldn't parse cwd, use CLAUDE_PROJECT_DIR
if [ -z "$CWD" ]; then
    CWD="$CLAUDE_PROJECT_DIR"
fi

# Check for WHSPR.md or WHISPER.md in the project root
WHSPR_FILE=""
for filename in "WHSPR.md" "WHISPER.md" ".whspr.md" ".whisper.md"; do
    if [ -f "$CWD/$filename" ]; then
        WHSPR_FILE="$CWD/$filename"
        break
    fi
done

# If no WHSPR file exists, allow the stop (whspr not initialized in this project)
if [ -z "$WHSPR_FILE" ]; then
    exit 0
fi

# WHSPR.md exists - request an update
# Output JSON to block the stop and ask Claude to update the file
cat << 'EOF'
{
  "decision": "block",
  "reason": "Before stopping, please update the WHSPR.md file with any new relevant context from this conversation. This helps improve voice transcription accuracy for the user's next spoken input.\n\nReview what was discussed and add to WHSPR.md:\n- New function/class names that were created or mentioned\n- New file names that were created or referenced\n- Technical terms or project-specific vocabulary\n- Any corrections if you notice the user's input had transcription errors (e.g., 'cloud' should be 'Claude')\n\nKeep the file lightweight and focused on terms likely to be spoken. Only add genuinely new and useful terms - don't duplicate existing entries.\n\nAfter updating WHSPR.md (or confirming no updates are needed), you may stop."
}
EOF
exit 0
