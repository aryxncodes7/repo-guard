import { generateContentWithFallback } from "./agentUtils.js";
import type { GeminiConfig } from "./agentUtils.js";

export async function runCodeReviewAgent(
  context: string,
  activeApiKey?: string
): Promise<string> {
  const prompt = `
You are the Code Review Agent in a multi-agent AI pipeline.
Your role is to scan for real code issues, logic bugs, test gaps, and secret leaks line-by-line.

You have been provided with the following repository context (file contents/diffs):
${context}

Conduct a highly comprehensive, technically concrete, and premium review of this project. Identify real code issues, logic bugs, test gaps, and secret leaks.
Make sure you cite actual file paths and line numbers. Do NOT hallucinate files or issues that are not present.

Output a detailed markdown report of all issues found. Do not output JSON.
  `.trim();

  const config: GeminiConfig = {
    maxOutputTokens: 600
  };

  const response = await generateContentWithFallback(prompt, config, activeApiKey);
  return response.text?.trim() || "Code Review Agent produced no output.";
}
