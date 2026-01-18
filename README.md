# whspr

[![npm version](https://img.shields.io/npm/v/whspr.svg)](https://www.npmjs.com/package/whspr)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

A CLI tool that records audio from your microphone, transcribes it using Groq's Whisper API, and post-processes the transcription with AI to fix errors and apply custom vocabulary.

<p align="center">
  <img src="./demo.gif" alt="whspr demo" width="600">
</p>

## Installation

```bash
npm install -g whspr
```

### Optional: Alias as `whisper`

If you'd like to use `whisper` instead of `whspr`, add this to your shell config (`~/.zshrc` or `~/.bashrc`):

```bash
alias whisper="whspr"
```

## Requirements

- Node.js 18+
- FFmpeg (`brew install ffmpeg` on macOS)
- Groq API key

## Usage

```bash
# Set your API key
export GROQ_API_KEY="your-api-key"

# Run the tool
whspr

# With verbose output
whspr --verbose
```

Press **Enter** to stop recording.

## Features

- Live audio waveform visualization in the terminal
- 15-minute max recording time
- Transcription via Groq Whisper API
- AI-powered post-processing to fix transcription errors
- Custom vocabulary support via `WHSPR.md` (global and local)
- Configurable settings via `~/.whspr/settings.json`
- Automatic clipboard copy

## Settings

Create `~/.whspr/settings.json` to customize whspr's behavior:

```json
{
  "verbose": false,
  "suffix": "\n\n(Transcribed via Whisper)",
  "transcriptionModel": "whisper-large-v3-turbo",
  "language": "en",
  "systemPrompt": "Your task is to clean up transcribed text...",
  "customPromptPrefix": "Here's my custom user prompt:",
  "transcriptionPrefix": "Here's my raw transcription output:"
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `verbose` | boolean | `false` | Enable verbose output |
| `suffix` | string | none | Text appended to all transcriptions |
| `transcriptionModel` | string | `"whisper-large-v3-turbo"` | Whisper model (`"whisper-large-v3"` or `"whisper-large-v3-turbo"`) |
| `language` | string | `"en"` | ISO 639-1 language code (e.g., `"en"`, `"zh"`, `"es"`) |
| `systemPrompt` | string | (built-in) | System prompt for AI post-processing |
| `customPromptPrefix` | string | `"Here's my custom user prompt:"` | Prefix before custom prompt content |
| `transcriptionPrefix` | string | `"Here's my raw transcription output that I need you to edit:"` | Prefix before raw transcription |

## Custom Vocabulary

Create a `WHSPR.md` (or `WHISPER.md`) file to provide custom vocabulary, names, or instructions for the AI post-processor.

### Global Prompts

Place in `~/.whspr/WHSPR.md` for vocabulary that applies everywhere:

```markdown
# Global Vocabulary

- My name is "Alex" not "Alec"
- Common terms: API, CLI, JSON, OAuth
```

### Local Prompts

Place in your current directory (`./WHSPR.md`) for project-specific vocabulary:

```markdown
# Project Vocabulary

- PostgreSQL (not "post crest QL")
- Kubernetes (not "cooper netties")
- My colleague's name is "Priya" not "Maria"
```

When both exist, they are combined (global first, then local).

## How It Works

1. Records audio from your default microphone using FFmpeg
2. Displays a live waveform visualization based on audio levels
3. Converts the recording to MP3
4. Sends audio to Groq's Whisper API for transcription
5. Loads custom prompts from `~/.whspr/WHSPR.md` and/or `./WHSPR.md`
6. Sends transcription + custom vocabulary to AI for post-processing
7. Applies suffix (if configured)
8. Prints result and copies to clipboard

If transcription fails, the recording is saved to `~/.whspr/recordings/` for manual recovery.

## License

MIT
