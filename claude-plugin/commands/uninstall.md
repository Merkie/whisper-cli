---
description: Remove whspr voice transcription support from a project
---

# whspr Uninstall Command

Remove whspr (voice transcription) support from a project by deleting the WHSPR.md file.

## Arguments

`$ARGUMENTS` - Optional path to the project directory. If not provided, uses the current working directory.

## Your Task

1. Determine the target directory:
   - If `$ARGUMENTS` is provided and is a valid directory path, use that
   - Otherwise, use the current working directory

2. Check for whspr vocabulary files in the target directory:
   - `WHSPR.md`
   - `WHISPER.md`
   - `.whspr.md`
   - `.whisper.md`

3. If found:
   - Ask the user to confirm deletion (show which file will be removed)
   - Delete the file upon confirmation
   - Inform the user that whspr support has been removed
   - Note that the Stop hook will no longer update this project since the file no longer exists

4. If not found:
   - Inform the user that no whspr vocabulary file was found in the target directory
   - Suggest they may need to specify the correct path or that whspr may not be initialized in this project

## Example Usage

- `/whspr:uninstall` - Remove from current project
- `/whspr:uninstall /path/to/project` - Remove from specified project
