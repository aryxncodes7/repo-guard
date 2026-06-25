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
All categories must be one of: 'security', 'style', 'logic', 'missing_tests'. 
Code issue file lines can be any positive integer.
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
                  message: { type: Type.STRING }
                },
                required: ["file", "line", "severity", "category", "message"]
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
        }
      },
      required: ["triage", "code_review", "docs_review", "final_summary"]
    }
  };

  const response = await generateContentWithFallback(prompt, config, activeApiKey);
  const textOutput = response.text?.trim() || "{}";
  return parseJsonSafe(textOutput);
}
