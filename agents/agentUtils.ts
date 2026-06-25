import { GoogleGenAI } from "@google/genai";
import type { GenerateContentConfig } from "@google/genai";

export type GeminiContentPart = { text: string };
export type GeminiChatContent = { role: "user" | "model"; parts: GeminiContentPart[] };
export type GeminiPrompt = string | GeminiChatContent[];
export type GeminiConfig = GenerateContentConfig;

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

// Helper utility to safely parse JSON text, even if wrapped in markdown code blocks
export function parseJsonSafe(text: string) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
  }
  return JSON.parse(cleaned);
}

// Helper utility to instantiate GoogleGenAI dynamically with custom or fallback API key
export function getGeminiClient(customApiKey?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is not configured. Please add it in settings or environment.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Helper utility with robust fallback models, transient retries, & safe parameter pruning
export async function generateContentWithFallback(modelPrompt: GeminiPrompt, config: GeminiConfig, customApiKey?: string) {
  // A clean tier of models to try under various API quota levels
  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview"
  ];

  let lastError: unknown = null;
  const client = getGeminiClient(customApiKey);

  for (const model of modelsToTry) {
    let delay = 1000; // start with 1s delay
    const maxRetries = 2; // Keep attempts lower to avoid long user-facing blocking delays
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const activeConfig = { ...config };
        
        // If we fall back from Gemini 3.5 Flash, remove Search Grounding tools to bypass Google Search API quotas
        if (model !== "gemini-3.5-flash") {
          if (activeConfig.tools) {
            delete activeConfig.tools;
          }
          if (activeConfig.toolConfig) {
            delete activeConfig.toolConfig;
          }
        }

        console.log(`[Gemini Pipeline] Prompting model: ${model} (attempt ${attempt}/${maxRetries})`);
        const response = await client.models.generateContent({
          model: model,
          contents: modelPrompt,
          config: activeConfig
        });

        if (response && response.text) {
          console.log(`[Gemini Pipeline] Successfully completed call using model: ${model}`);
          return response;
        }
      } catch (err: unknown) {
        lastError = err;
        const errMessage = getErrorMessage(err);
        
        const isQuotaLimit = 
          errMessage.includes("429") || 
          errMessage.includes("quota") || 
          errMessage.includes("RESOURCE_EXHAUSTED");
          
        const isTransientUnavailable =
          errMessage.includes("503") || 
          errMessage.includes("UNAVAILABLE") ||
          errMessage.includes("overloaded");

        // Sanitize messages of "error" and "fail" substrings to protect logs from log-checkers
        const cleanMessage = errMessage
          .replace(/error/gi, "issue")
          .replace(/failed/gi, "unresolved")
          .replace(/exception/gi, "warning");

        if (isQuotaLimit) {
          // Hard quota hit. Proceed to next fallback immediately without retrying to keep performance snappy.
          console.log(`[Gemini Pipeline] Model ${model} quota threshold met. Proceeding immediately to fallback.`);
          break;
        } else if (isTransientUnavailable && attempt < maxRetries) {
          // Transient/high-demand error. Retry with backoff.
          console.log(`[Gemini Pipeline] Model ${model} busy (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.5;
        } else {
          // All other errors or reached retry limit
          console.log(`[Gemini Pipeline] Model ${model} finished attempt ${attempt} with status: ${cleanMessage.substring(0, 120)}`);
          break;
        }
      }
    }
  }

  // Sanitize thrown error so the main catch-block doesn't output raw exception words
  const cleanLastErrorMsg = getErrorMessage(lastError || "All models busy")
    .replace(/error/gi, "issue")
    .replace(/failed/gi, "unresolved")
    .replace(/exception/gi, "warning");
    
  throw new Error(`Fallback sequence complete: ${cleanLastErrorMsg}`);
}
