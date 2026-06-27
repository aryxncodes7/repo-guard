import { Type } from "@google/genai";
import { generateContentWithFallback, parseJsonSafe } from "./agentUtils.js";
import type { GeminiConfig } from "./agentUtils.js";

export async function runSynthesizerAgent(
  triageOutput: string,
  codeReviewOutput: string,
  docsOutput: string,
  activeApiKey?: string
): Promise<any> {
  const prompt = `
You are the Synthesizer Agent in a multi-agent AI pipeline.
Your role is to compile previous agent outputs, clean up noise, and generate final status verdicts and top optimization fixes.

You have been provided with the following analysis reports:

--- TRIAGE REPORT ---
${triageOutput}

--- CODE REVIEW REPORT ---
${codeReviewOutput}

--- DOCS REPORT ---
${docsOutput}

Synthesize these reports into a final structured JSON output.
Make sure each severity level is exactly 'info', 'warning', or 'critical'. 
Make sure risk_levels are 'low', 'medium', or 'high'.
Verdicts must be 'approve', 'request_changes', or 'needs_discussion'. 

CRITICAL GRADING RULES FOR VERDICT:
- Output 'request_changes' ONLY if there is at least one 'critical' severity issue, OR if a 'security' vulnerability is present.
- Output 'needs_discussion' if there are only 'warning' or 'info' issues (e.g. style, minor logic, or docs issues).
- Output 'approve' if the code is perfectly clean or only has negligible stylistic notes.

EVALUATION RULE FOR TEST SCORE METRIC:
If the target project codebase does not contain formal test configs or mock frameworks, do not drop the score to 15%. Baseline the codebase test score metric safely at 50% if the core execution modules are sound. Provide a constructive, educational note explaining that while core integrity functions normally, adding explicit unit test runners will prevent deployment regressions.

EVALUATION RULE FOR DOCUMENTATION METRIC:
If the repository contains an active README.md or SECURITY.md file that covers core environment setup and prerequisites, explicitly baseline the documentation score to 90% or higher. Do not output arbitrary low scores (e.g., 40%) unless the repository is entirely devoid of markdown documentation.

All categories must be one of: 'security', 'style', 'logic', 'missing_tests'. 
Code issue file lines can be any positive integer.
For each code issue, provide an actionable, concise 'resolution' guiding the developer on how to fix it.
  `.trim();

  const config: GeminiConfig = {
    responseMimeType: "application/json",
    maxOutputTokens: 2048,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        triage: {
          type: Type.OBJECT,
          properties: {
            risk_level: { type: Type.STRING, description: "Must be 'low', 'medium', or 'high'" },
            size_category: { type: Type.STRING, description: "Must be 'small', 'medium', or 'large'" },
            summary: { type: Type.STRING }
          },
          required: ["risk_level", "size_category", "summary"]
        },
        code_review: {
          type: Type.OBJECT,
          properties: {
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  file: { type: Type.STRING },
                  line: { type: Type.INTEGER },
                  severity: { type: Type.STRING, description: "Must be 'info', 'warning', or 'critical'" },
                  category: { type: Type.STRING, description: "Must be 'security', 'style', 'logic', or 'missing_tests'" },
                  message: { type: Type.STRING },
                  resolution: { type: Type.STRING, description: "Actionable resolution guide to fix the issue" }
                },
                required: ["file", "line", "severity", "category", "message", "resolution"]
              }
            },
            secrets_detected: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  file: { type: Type.STRING },
                  line: { type: Type.INTEGER },
                  snippet_redacted: { type: Type.STRING }
                },
                required: ["file", "line", "snippet_redacted"]
              }
            }
          },
          required: ["issues", "secrets_detected"]
        },
        docs_review: {
          type: Type.OBJECT,
          properties: {
            docs_outdated: { type: Type.BOOLEAN },
            missing_sections: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            suggested_readme_diff: { type: Type.STRING, description: "A patch diff string of README modifications or suggested file enhancements" }
          },
          required: ["docs_outdated", "missing_sections", "suggested_readme_diff"]
        },
        final_summary: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING, description: "Must be 'approve', 'request_changes', or 'needs_discussion'" },
            summary_markdown: { type: Type.STRING },
            top_priority_fixes: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["verdict", "summary_markdown", "top_priority_fixes"]
        },
        metrics: {
          type: Type.OBJECT,
          properties: {
            security: { type: Type.INTEGER, description: "Score from 0 to 100 representing security posture" },
            accessibility: { type: Type.INTEGER, description: "Score from 0 to 100 representing UI accessibility or ease of use" },
            testCoverage: { type: Type.INTEGER, description: "Score from 0 to 100 representing test coverage" },
            codeCleanliness: { type: Type.INTEGER, description: "Score from 0 to 100 representing code cleanliness and style" },
            efficiency: { type: Type.INTEGER, description: "Score from 0 to 100 representing code runtime efficiency" },
            architecture: { type: Type.INTEGER, description: "Score from 0 to 100 representing architectural quality" },
            documentation: { type: Type.INTEGER, description: "Score from 0 to 100 representing documentation quality and coverage" }
          },
          required: ["security", "accessibility", "testCoverage", "codeCleanliness", "efficiency", "architecture", "documentation"]
        }
      },
      required: ["triage", "code_review", "docs_review", "final_summary", "metrics"]
    }
  };

  const response = await generateContentWithFallback(prompt, config, activeApiKey);
  const textOutput = response.text?.trim() || "{}";
  return parseJsonSafe(textOutput);
}
