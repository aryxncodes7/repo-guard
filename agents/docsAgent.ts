import { generateContentWithFallback } from "./agentUtils.js";
import type { GeminiConfig } from "./agentUtils.js";

export async function runDocsAgent(
  context: string,
  activeApiKey?: string
): Promise<string> {
  const prompt = `
You are the Docs Agent in a multi-agent AI pipeline.
Your role is to check if existing document files or the README are outdated relative to updates, highlighting missing categories.

You have been provided with the following repository context (file contents/diffs):
${context}

Evaluate the README and any other documentation files. Identify missing sections, outdated information, and suggest improvements.

Output a detailed markdown report of all documentation issues found. Do not output JSON.
  `.trim();

  const config: GeminiConfig = {};

  const response = await generateContentWithFallback(prompt, config, activeApiKey);
  return response.text?.trim() || "Docs Agent produced no output.";
}
