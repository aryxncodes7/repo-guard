import { generateContentWithFallback } from "./agentUtils.js";
import type { GeminiConfig } from "./agentUtils.js";

export async function runTriageAgent(
  repoUrl: string,
  prDetails: string,
  context: string,
  activeApiKey?: string
): Promise<string> {
  const prompt = `
You are the Triage Agent in a multi-agent AI pipeline reviewing a repository.
Your role is to analyze the target codebase size, changes, initial risks, and general domain classification.

Please analyze the following GitHub repository and changes:
Repository URL: ${repoUrl}
Target Pull Request / Version: ${prDetails}

Context:
${context}

Output a high-level summary of the architecture pattern, sizing, and high-level strategy for this codebase.
Do not output JSON, just output a clear markdown summary.
  `.trim();

  const config: GeminiConfig = {};

  const response = await generateContentWithFallback(prompt, config, activeApiKey);
  return response.text?.trim() || "Triage Agent produced no output.";
}
