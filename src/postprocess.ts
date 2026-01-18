import { generateObject } from "ai";
import { z } from "zod";
import { withRetry } from "./utils/retry.js";
import { groq } from "./utils/groq.js";

const MODEL = "openai/gpt-oss-120b";

const outputSchema = z.object({
  fixed_transcription: z.string(),
});

export interface PostprocessOptions {
  systemPrompt: string;
  customPromptPrefix: string;
  transcriptionPrefix: string;
}

export async function postprocess(
  rawTranscription: string,
  customPrompt: string | null,
  options: PostprocessOptions,
): Promise<string> {
  const { systemPrompt, customPromptPrefix, transcriptionPrefix } = options;

  const result = await withRetry(
    async () => {
      const response = await generateObject({
        model: groq(MODEL),
        schema: outputSchema,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              customPrompt
                ? `${customPromptPrefix}\n\`\`\`\n${customPrompt}\n\`\`\`\n\n`
                : null,
              `${transcriptionPrefix}\n\`\`\`\n${rawTranscription}\n\`\`\``,
            ]
              .filter(Boolean)
              .join("")
              .trim(),
          },
        ],
      });
      return response.object;
    },
    3,
    "postprocess",
  );

  return result.fixed_transcription;
}
