#!/usr/bin/env node
import { record, convertToMp3, RecordingResult } from "./recorder.js";
import { transcribe } from "./transcribe.js";
import { postprocess } from "./postprocess.js";
import { copyToClipboard } from "./utils/clipboard.js";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import os from "os";

// Default prompts (can be overridden in settings.json)
export const DEFAULTS = {
  transcriptionModel: "whisper-large-v3-turbo" as const,
  language: "en",
  systemPrompt:
    'Your task is to clean up/fix transcribed text generated from mic input by the user according to the user\'s own prompt, this prompt may contain custom vocabulary, instructions, etc. Please return the user\'s transcription with the fixes made (e.g. the AI might hear "PostgreSQL" as "post crest QL" you need to use your own reasoning to fix these mistakes in the transcription)',
  customPromptPrefix: "Here's my custom user prompt:",
  transcriptionPrefix: "Here's my raw transcription output that I need you to edit:",
};

// Settings interface
export interface WhsprSettings {
  verbose?: boolean;
  suffix?: string; // Appended to all transcriptions (e.g., "\n\n(Transcribed via Whisper)")
  transcriptionModel?: "whisper-large-v3" | "whisper-large-v3-turbo";
  language?: string; // ISO 639-1 language code (e.g., "en", "zh", "es")
  systemPrompt?: string; // System prompt for post-processing
  customPromptPrefix?: string; // Prefix before custom prompt content
  transcriptionPrefix?: string; // Prefix before raw transcription
}

const WHSPR_DIR = path.join(os.homedir(), ".whspr");
const SETTINGS_PATH = path.join(WHSPR_DIR, "settings.json");

function loadSettings(): WhsprSettings {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const content = fs.readFileSync(SETTINGS_PATH, "utf-8");
      return JSON.parse(content) as WhsprSettings;
    }
  } catch (error) {
    // Silently ignore invalid settings file
  }
  return {};
}

function loadCustomPrompt(verbose: boolean): { prompt: string | null; sources: string[] } {
  const sources: string[] = [];
  let globalPrompt: string | null = null;
  let localPrompt: string | null = null;

  // Check for global WHSPR.md or WHISPER.md in ~/.whspr/
  const globalWhsprPath = path.join(WHSPR_DIR, "WHSPR.md");
  const globalWhisperPath = path.join(WHSPR_DIR, "WHISPER.md");

  if (fs.existsSync(globalWhsprPath)) {
    globalPrompt = fs.readFileSync(globalWhsprPath, "utf-8");
    sources.push("~/.whspr/WHSPR.md");
  } else if (fs.existsSync(globalWhisperPath)) {
    globalPrompt = fs.readFileSync(globalWhisperPath, "utf-8");
    sources.push("~/.whspr/WHISPER.md");
  }

  // Check for local WHSPR.md or WHISPER.md in current directory
  const localWhsprPath = path.join(process.cwd(), "WHSPR.md");
  const localWhisperPath = path.join(process.cwd(), "WHISPER.md");

  if (fs.existsSync(localWhsprPath)) {
    localPrompt = fs.readFileSync(localWhsprPath, "utf-8");
    sources.push("./WHSPR.md");
  } else if (fs.existsSync(localWhisperPath)) {
    localPrompt = fs.readFileSync(localWhisperPath, "utf-8");
    sources.push("./WHISPER.md");
  }

  // Combine prompts: global first, then local
  let combinedPrompt: string | null = null;
  if (globalPrompt && localPrompt) {
    combinedPrompt = globalPrompt + "\n\n" + localPrompt;
  } else if (globalPrompt) {
    combinedPrompt = globalPrompt;
  } else if (localPrompt) {
    combinedPrompt = localPrompt;
  }

  return { prompt: combinedPrompt, sources };
}

const settings = loadSettings();
const verbose = settings.verbose || process.argv.includes("--verbose") || process.argv.includes("-v");

function status(message: string) {
  process.stdout.write(`\x1b[2K\r${chalk.blue(message)}`);
}

function clearStatus() {
  process.stdout.write("\x1b[2K\r");
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

async function main() {
  // Check for API key before recording
  if (!process.env.GROQ_API_KEY) {
    console.error(chalk.red("Error: GROQ_API_KEY environment variable is not set"));
    console.log(chalk.gray("Get your API key at https://console.groq.com/keys"));
    console.log(chalk.gray("Then run: export GROQ_API_KEY=\"your-api-key\""));
    process.exit(1);
  }

  try {
    // 1. Record audio
    const recording = await record(verbose);
    const processStart = Date.now();

    // 2. Convert to MP3
    status("Converting to MP3...");
    const mp3Path = await convertToMp3(recording.path);

    try {
      // 3. Transcribe with Whisper
      status("Transcribing...");
      const rawText = await transcribe(
        mp3Path,
        settings.transcriptionModel ?? DEFAULTS.transcriptionModel,
        settings.language ?? DEFAULTS.language
      );

      if (verbose) {
        clearStatus();
        console.log(chalk.gray(`Raw: ${rawText}`));
      }

      // 4. Read WHSPR.md or WHISPER.md (global from ~/.whspr/ and/or local)
      const { prompt: customPrompt, sources: vocabSources } = loadCustomPrompt(verbose);

      if (customPrompt && verbose) {
        console.log(chalk.gray(`Using custom vocabulary from: ${vocabSources.join(" + ")}`));
      }

      // 5. Post-process
      status("Post-processing...");
      let fixedText = await postprocess(rawText, customPrompt, {
        systemPrompt: settings.systemPrompt ?? DEFAULTS.systemPrompt,
        customPromptPrefix: settings.customPromptPrefix ?? DEFAULTS.customPromptPrefix,
        transcriptionPrefix: settings.transcriptionPrefix ?? DEFAULTS.transcriptionPrefix,
      });

      // 6. Apply suffix if configured
      if (settings.suffix) {
        fixedText = fixedText + settings.suffix;
      }

      // 7. Output and copy
      clearStatus();
      const processTime = ((Date.now() - processStart) / 1000).toFixed(1);
      const wordCount = fixedText.trim().split(/\s+/).filter(w => w.length > 0).length;
      const charCount = fixedText.length;

      // Log stats
      console.log(
        chalk.dim("Audio: ") + chalk.white(formatDuration(recording.durationSeconds)) +
        chalk.dim(" • Processing: ") + chalk.white(processTime + "s")
      );

      // Draw box
      const termWidth = Math.min(process.stdout.columns || 60, 80);
      const lineWidth = termWidth - 2;
      const label = " TRANSCRIPT ";
      console.log(chalk.dim("┌─") + chalk.cyan(label) + chalk.dim("─".repeat(lineWidth - label.length - 1) + "┐"));
      const lines = fixedText.split("\n");
      for (const line of lines) {
        // Wrap long lines
        let remaining = line;
        while (remaining.length > 0) {
          const chunk = remaining.slice(0, lineWidth - 2);
          remaining = remaining.slice(lineWidth - 2);
          console.log(chalk.dim("│ ") + chalk.white(chunk.padEnd(lineWidth - 2)) + chalk.dim(" │"));
        }
        if (line.length === 0) {
          console.log(chalk.dim("│ " + " ".repeat(lineWidth - 2) + " │"));
        }
      }
      const stats = ` ${wordCount} words • ${charCount} chars `;
      const bottomLine = "─".repeat(lineWidth - stats.length - 1) + " ";
      console.log(chalk.dim("└" + bottomLine) + chalk.dim(stats) + chalk.dim("┘"));
      await copyToClipboard(fixedText);
      console.log(chalk.green("✓") + chalk.gray(" Copied to clipboard"));

      // 8. Clean up
      fs.unlinkSync(mp3Path);
    } catch (error) {
      clearStatus();
      // Save recording on failure
      const backupDir = path.join(os.homedir(), ".whspr", "recordings");
      fs.mkdirSync(backupDir, { recursive: true });
      const backupPath = path.join(backupDir, `recording-${Date.now()}.mp3`);
      fs.renameSync(mp3Path, backupPath);
      console.error(chalk.red(`Error: ${error}`));
      console.log(chalk.yellow(`Recording saved to: ${backupPath}`));
      process.exit(1);
    }
  } catch (error) {
    clearStatus();
    // Silent exit on user cancel
    if (error instanceof Error && error.message === "cancelled") {
      process.exit(0);
    }
    console.error(chalk.red(`Recording error: ${error}`));
    process.exit(1);
  }
}

main();
