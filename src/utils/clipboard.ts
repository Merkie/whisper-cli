import { anthropic } from "@ai-sdk/anthropic";
import clipboard from "clipboardy";

anthropic("claude-op");

export async function copyToClipboard(text: string): Promise<void> {
  await clipboard.write(text);
}
