import { generateContentWithFallback } from "./agentUtils.js";
import type { GeminiConfig } from "./agentUtils.js";

export async function runDocsAgent(
  context: string,
  activeApiKey?: string
): Promise<string> {
  const prompt = `
You are the Docs Agent in a multi-agent AI pipeline.
Your role is to evaluate documentation quality with deep analytical rigor.

You have been provided with the following repository context (file contents/diffs):
\${context}

Look for production compliance checkmarks:
1. Is there an active, updated SECURITY.md file handling responsible vulnerability disclosures? (Flag as a warning if missing).
2. Does the project's primary documentation outline environment setup targets, runtime prerequisite versions, and deployment workflows?
3. Is complex logic followed by concise inline commentary?

Output a detailed markdown report of all documentation issues found. Do not output JSON.
  `.trim();

  const config: GeminiConfig = {
    maxOutputTokens: 600
  };

  const response = await generateContentWithFallback(prompt, config, activeApiKey);
  return response.text?.trim() || "Docs Agent produced no output.";
}
