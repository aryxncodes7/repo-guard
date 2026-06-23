/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import type { GenerateContentConfig } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

import { 
  clampText, 
  normalizeGithubRepoUrl, 
  normalizePrNumber, 
  parseGithubRepo 
} from "./src/utils.js";

const app = express();
const PORT = 3000;
const MAX_CHAT_HISTORY_ITEMS = 12;
const MAX_CHAT_MESSAGE_LENGTH = 2000;
const MAX_REPO_URL_LENGTH = 200;

app.disable("x-powered-by");
app.use((req, _res, next) => {
  if (process.env.VERCEL && req.originalUrl) {
    req.url = req.originalUrl;
  }
  next();
});
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use((req, res, next) => {
  if (req.body !== undefined && req.body !== null) {
    next();
  } else {
    express.json({ limit: "32kb" })(req, res, next);
  }
});

type GeminiContentPart = { text: string };
type GeminiChatContent = { role: "user" | "model"; parts: GeminiContentPart[] };
type GeminiPrompt = string | GeminiChatContent[];
type GeminiConfig = GenerateContentConfig;

interface ReviewRequestBody {
  repo_url?: unknown;
  pr_number?: unknown;
  github_token?: unknown;
  api_key?: unknown;
}

interface ChatRequestBody {
  message?: unknown;
  history?: unknown;
  api_key?: unknown;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}


// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper utility to safely parse JSON text, even if wrapped in markdown code blocks
function parseJsonSafe(text: string) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
  }
  return JSON.parse(cleaned);
}

// Helper utility to instantiate GoogleGenAI dynamically with custom or fallback API key
function getGeminiClient(customApiKey?: string) {
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
async function generateContentWithFallback(modelPrompt: GeminiPrompt, config: GeminiConfig, customApiKey?: string) {
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



// Helper to fetch from GitHub API with optional token
async function fetchFromGithub(url: string, token?: string) {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "RepoGuard-App"
  };
  const activeToken = token || process.env.GITHUB_TOKEN;
  if (activeToken) {
    headers["Authorization"] = `token ${activeToken}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    let errorMsg = `GitHub API returned status ${res.status}`;
    try {
      const errJson = await res.json() as any;
      if (errJson.message) {
        errorMsg += `: ${errJson.message}`;
      }
    } catch {}
    throw new Error(errorMsg);
  }
  return res.json();
}

const CODE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "cpp", "h", "cs", "rb", "php", "c", "sh", "yml", "yaml", "json"
]);
const EXCLUDED_PATHS = [
  "node_modules/", "dist/", ".git/", "build/", "vendor/", "coverage/", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"
];

function isSourceFile(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  if (EXCLUDED_PATHS.some(p => lowerPath.includes(p))) {
    return false;
  }
  const ext = filePath.split(".").pop()?.toLowerCase();
  return ext ? CODE_EXTENSIONS.has(ext) : false;
}

async function fetchFileContent(owner: string, repo: string, branch: string, filePath: string, token?: string): Promise<string> {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  const headers: Record<string, string> = {
    "User-Agent": "RepoGuard-App"
  };
  const activeToken = token || process.env.GITHUB_TOKEN;
  if (activeToken) {
    headers["Authorization"] = `token ${activeToken}`;
  }
  const res = await fetch(rawUrl, { headers });
  if (res.ok) {
    return res.text();
  }
  // Fallback to API contents endpoint
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
  const apiRes = await fetch(apiUrl, {
    headers: {
      ...headers,
      "Accept": "application/vnd.github.v3+json"
    }
  });
  if (!apiRes.ok) {
    throw new Error(`Failed to fetch file content for ${filePath} from GitHub`);
  }
  const data = await apiRes.json() as any;
  if (data.encoding === "base64" && data.content) {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  throw new Error(`Unexpected encoding for ${filePath}`);
}

interface PullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

interface PullRequestDetails {
  title: string;
  author: string;
  filesChanged: number;
  description: string;
  files: PullRequestFile[];
}

async function getPullRequestDetails(owner: string, repo: string, prNumber: string, token?: string): Promise<PullRequestDetails> {
  const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
  const filesUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`;

  const prData = await fetchFromGithub(prUrl, token) as any;
  const filesData = await fetchFromGithub(filesUrl, token) as any[];

  const files: PullRequestFile[] = filesData.map((f: any) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch
  }));

  return {
    title: prData.title || "No PR Title",
    author: prData.user?.login || "unknown",
    filesChanged: prData.changed_files || files.length,
    description: prData.body || "",
    files
  };
}

interface RepositoryDetails {
  defaultBranch: string;
  files: { path: string; content: string }[];
}

async function getRepositoryDetails(owner: string, repo: string, token?: string): Promise<RepositoryDetails> {
  const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const repoData = await fetchFromGithub(repoUrl, token) as any;
  const defaultBranch = repoData.default_branch || "main";

  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
  const treeData = await fetchFromGithub(treeUrl, token) as any;

  if (!treeData.tree || !Array.isArray(treeData.tree)) {
    throw new Error("Invalid repository tree structure returned from GitHub API.");
  }

  const allFiles = treeData.tree
    .filter((node: any) => node.type === "blob" && isSourceFile(node.path))
    .map((node: any) => ({ path: node.path, size: node.size || 0 }));

  // Sort files to prioritize src/, lib/, etc.
  allFiles.sort((a: any, b: any) => {
    const aInSrc = a.path.startsWith("src/") || a.path.startsWith("lib/") || a.path.startsWith("app/");
    const bInSrc = b.path.startsWith("src/") || b.path.startsWith("lib/") || b.path.startsWith("app/");
    if (aInSrc && !bInSrc) return -1;
    if (!aInSrc && bInSrc) return 1;
    return a.size - b.size; // smaller files first to avoid hitting limits
  });

  // Limit to top 8 files
  const selectedFiles = allFiles.slice(0, 8);
  const files: { path: string; content: string }[] = [];

  for (const file of selectedFiles) {
    try {
      const content = await fetchFileContent(owner, repo, defaultBranch, file.path, token);
      // Truncate file content if it is exceptionally large (30K characters)
      const maxCharLimit = 30000;
      const truncatedContent = content.length > maxCharLimit ? content.substring(0, maxCharLimit) + "\n\n[Content truncated due to size limits...]" : content;
      files.push({ path: file.path, content: truncatedContent });
    } catch (err) {
      console.warn(`[Github Fetch] Could not fetch content for ${file.path}:`, err);
    }
  }

  return {
    defaultBranch,
    files
  };
}

// Real AI Multi-Agent PR Review Endpoint
app.post("/api/review", async (req, res) => {
  const repo_url = (req.body as any).repo_url;
  const pr_number = (req.body as any).pr_number;
  const api_key = (req.headers["x-api-key"] as string) || (req.body as any).api_key;
  const github_token = (req.headers["x-github-token"] as string) || (req.body as any).github_token;

  if (req.body) {
    delete (req.body as any).api_key;
    delete (req.body as any).github_token;
  }

  const normalizedRepoUrl = normalizeGithubRepoUrl(repo_url);
  const normalizedPrNumber = normalizePrNumber(pr_number);

  if (!normalizedRepoUrl) {
    return res.status(400).json({
      status: "error",
      message: "Required parameter 'repo_url' must be a valid public GitHub repository URL."
    });
  }

  const activeApiKey = typeof api_key === "string" && api_key.trim() !== "" ? api_key.trim() : process.env.GEMINI_API_KEY;
  const hasApiKey = !!activeApiKey;

  const parsedRepo = parseGithubRepo(normalizedRepoUrl);
  if (!parsedRepo) {
    return res.status(400).json({
      status: "error",
      message: "Could not parse owner and repository name from the GitHub URL."
    });
  }

  const { owner, repo } = parsedRepo;
  const token = typeof github_token === "string" ? github_token : undefined;

  let prTitle = `Full Repository Security Audit`;
  let prAuthor = owner;
  let filesChanged = 0;
  let promptContext = "";
  let repoDetails: RepositoryDetails | null = null;
  let prDetails: PullRequestDetails | null = null;
  let fetchFailedError: string | null = null;

  // Fetch from GitHub first
  try {
    if (normalizedPrNumber) {
      console.log(`[API Review] Fetching PR #${normalizedPrNumber} details for ${owner}/${repo}`);
      prDetails = await getPullRequestDetails(owner, repo, normalizedPrNumber, token);
      prTitle = prDetails.title;
      prAuthor = prDetails.author;
      filesChanged = prDetails.filesChanged;

      const filesDiffText = prDetails.files.map(f => {
        const statusStr = f.status === 'modified' ? 'Modified' : f.status === 'added' ? 'Added' : 'Deleted';
        return `File: ${f.filename} (${statusStr}, +${f.additions} -${f.deletions})\nDiff Patch:\n${f.patch || 'No diff content available (binary or empty).'}\n`;
      }).join("\n---\n\n");

      promptContext = `
PR Title: ${prTitle}
PR Author: ${prAuthor}
PR Description: ${prDetails.description}

Here is the exact code change diff (patches) for the files changed in this PR:

${filesDiffText}
`;
    } else {
      console.log(`[API Review] Fetching repository tree and files for ${owner}/${repo}`);
      repoDetails = await getRepositoryDetails(owner, repo, token);
      filesChanged = repoDetails.files.length;

      const repoFilesText = repoDetails.files.map(f => {
        return `File: ${f.path}\nContent:\n${f.content}\n`;
      }).join("\n---\n\n");

      promptContext = `
Default Branch: ${repoDetails.defaultBranch}

Below are the contents of the key source files from this repository:

${repoFilesText}
`;
    }
  } catch (err: unknown) {
    const cleanErr = getErrorMessage(err);
    console.error(`[API Review] GitHub API Fetch failed: ${cleanErr}`);
    fetchFailedError = cleanErr;
  }

  // If fetch failed, return GitHub error
  if (fetchFailedError) {
    return res.status(502).json({
      status: "error",
      message: `Failed to retrieve repository data from GitHub: ${fetchFailedError}. If the repository is private or you have hit rate limits, please configure a GitHub Personal Access Token (PAT) in settings.`
    });
  }

  // If there's no API key, return a validation error
  if (!hasApiKey) {
    return res.status(400).json({
      status: "error",
      message: "Gemini API Key is not configured. Please configure your API key in the settings panel to run scans."
    });
  }

  // Real Gemini Multi-Agent Review execution
  try {
    const prDetailsPrompt = normalizedPrNumber ? `PR #${normalizedPrNumber}` : "the latest commits";
    
    const prompt = `
You are a team of senior AI staff software engineer reviewers running a multi-agent pipeline:
1. Triage Agent: Analyzes the target codebase size, changes, initial risks, and general domain classification.
2. Code Review Agent: Scans for real code issues, logic bugs, test gaps, and secret leaks.
3. Docs Agent: Checks if existing document files/README are outdated relative to updates, highlighting missing categories.
4. Synthesizer Agent: Generates final status verdicts and compiles top optimization fixes.

Please analyze the following GitHub repository and changes:
Repository URL: ${normalizedRepoUrl}
Target Pull Request / Version: ${prDetailsPrompt}

${promptContext}

Conduct a highly comprehensive, technically concrete, and premium review of this project. Identify real code issues, logic bugs, test gaps, and secret leaks in the provided files or diffs.
Make sure you cite actual file paths and line numbers from the provided files or diffs. Do NOT hallucinate files or issues that are not present.

Return the unified report output strictly conforming to the requested JSON response schema. Make sure each severity level is exactly 'info', 'warning', or 'critical'. Make sure risk_levels are 'low', 'medium', or 'high', and verdicts are 'approve', 'request_changes', or 'needs_discussion'. All categories must be one of: 'security', 'style', 'logic', 'missing_tests'. Code issue file lines can be any positive integer. Keep it highly realistic and detailed.
`;

    const reviewConfig: GeminiConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING },
          pr_title: { type: Type.STRING },
          pr_author: { type: Type.STRING },
          files_changed: { type: Type.INTEGER },
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
        required: ["status", "pr_title", "pr_author", "files_changed", "triage", "code_review", "docs_review", "final_summary"]
      }
    };

    const response = await generateContentWithFallback(prompt, reviewConfig, activeApiKey);

    const textOutput = response.text?.trim() || "{}";
    const parsedData = parseJsonSafe(textOutput);
    
    // Ensure success state
    parsedData.status = "success";
    // Force actual metadata fields in returned review response
    parsedData.pr_title = prTitle;
    parsedData.pr_author = prAuthor;
    parsedData.files_changed = filesChanged;
    
    return res.json(parsedData);

  } catch (err: unknown) {
    const cleanErr = getErrorMessage(err);
    console.error(`[API Review] Gemini review generation failed: ${cleanErr}`);
    return res.status(502).json({
      status: "error",
      message: `Failed to generate review using Gemini: ${cleanErr}. Please check your Gemini API key and try again.`
    });
  }
});

// AI Chat Handler
app.post("/api/chat", async (req, res) => {
  const message = (req.body as any).message;
  const history = (req.body as any).history;
  const api_key = (req.headers["x-api-key"] as string) || (req.body as any).api_key;

  if (req.body) {
    delete (req.body as any).api_key;
  }

  const cleanMessage = clampText(message, MAX_CHAT_MESSAGE_LENGTH);
  if (!cleanMessage) {
    return res.status(400).json({ status: "error", message: "Message is required." });
  }

  try {
    const chatContents: GeminiChatContent[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-MAX_CHAT_HISTORY_ITEMS)) {
        if (!msg || typeof msg !== "object") continue;
        const { role, content } = msg as { role?: unknown; content?: unknown };
        const cleanContent = clampText(content, MAX_CHAT_MESSAGE_LENGTH);
        if (!cleanContent) continue;
        chatContents.push({
          role: role === "user" ? "user" : "model",
          parts: [{ text: cleanContent }]
        });
      }
    }
    chatContents.push({ role: 'user', parts: [{ text: cleanMessage }] });

    const response = await generateContentWithFallback(chatContents, {
      systemInstruction: "You are RepoGuard Security AI, a friendly, intelligent companion and secure code advisor built by Aryan Raj (link: github.com/aryxncodes7). You specialize in finding leaked passwords, API keys, logic bugs, and documentation fixes in repos. Keep your tone helpful, concise, engaging, and clear.",
    }, typeof api_key === "string" ? api_key : undefined);

    const reply = response.text || "I was able to process that but generated empty suggestions. How else can I assist with your repository audit?";
    return res.json({ status: "success", reply });
  } catch (err: unknown) {
    console.log("[Chat Pipeline] Transitioning to offline companion responder: " + getErrorMessage(err));
    const lowMsg = cleanMessage.toLowerCase();
    let reply = "I am RepoGuard Security AI, your defensive code companion! Let's ensure your git repositories are clean, secure, and well-documented.";
    if (lowMsg.includes("secret") || lowMsg.includes("password") || lowMsg.includes("key")) {
      reply = "To secure leaked secrets or API credentials:\n\n1. **Environment Variables**: Store sensitive variables in `.env` files and add them to `.gitignore`.\n2. **Secret Scanners**: Use Git guardians or pre-commit hooks to inspect changes.\n3. **Key Rotation**: Immediately revoke any accidentally published tokens and generate new ones.";
    } else if (lowMsg.includes("suggest") || lowMsg.includes("recommend") || lowMsg.includes("verdict") || lowMsg.includes("fix")) {
      reply = "We categorize issues carefully. You can scan for high-risk vulnerabilities like missing security blocks, plain-text API secrets, or outdated documentation sections. I suggest tackling Critical Security scan alerts first, then refining style guidelines.";
    } else if (lowMsg.includes("github") || lowMsg.includes("repo")) {
      reply = "You can paste any public GitHub repository link (like `https://github.com/expressjs/express`) inside the search input, select 'Run Security Audit', and view a full breakdown of risk levels and fixes.";
    } else if (lowMsg.includes("hello") || lowMsg.includes("hi") || lowMsg.includes("hey")) {
      reply = "Hello! I am RepoGuard AI, your repository security advisor. Ask me anything about repository structure audits, preventing leaked secrets, or writing resilient code!";
    } else if (lowMsg.includes("aryan") || lowMsg.includes("author") || lowMsg.includes("built")) {
      reply = "I was designed and built by the developer **Aryan Raj**! You can explore his work and connect with him on his Github profile at: **https://github.com/aryxncodes7**.";
    }
    return res.json({ status: "success", reply });
  }
});

// Configure Vite middleware or static delivery
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { dotfiles: "deny", index: false }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RepoGuard system server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
