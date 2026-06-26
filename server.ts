/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import type { GenerateContentConfig } from "@google/genai";
import dotenv from "dotenv";

import { 
  getErrorMessage, 
  parseJsonSafe, 
  generateContentWithFallback 
} from "./agents/agentUtils.js";
import type { GeminiConfig, GeminiChatContent } from "./agents/agentUtils.js";

import { runTriageAgent } from "./agents/triageAgent.js";
import { runCodeReviewAgent } from "./agents/codeReviewAgent.js";
import { runDocsAgent } from "./agents/docsAgent.js";
import { runSynthesizerAgent } from "./agents/synthesizerAgent.js";

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
const MAX_CHAT_MESSAGE_LENGTH = 4000;
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
  // Vercel may pre-parse the body as a string or object
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    // Already a parsed object — skip express.json()
    next();
  } else if (typeof req.body === "string") {
    // Vercel sometimes passes body as a raw string — parse it
    try {
      req.body = JSON.parse(req.body);
    } catch {
      // If it's not valid JSON, leave it as-is
    }
    next();
  } else {
    express.json({ limit: "32kb" })(req, res, next);
  }
});





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
  if (ext && CODE_EXTENSIONS.has(ext)) return true;
  return false;
}

function getCookie(req: any, name: string) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

app.post("/api/set-key", (req, res) => {
  const apiKey = (req.body as any)?.apiKey;
  if (typeof apiKey === "string") {
    res.setHeader("Set-Cookie", `repoguard_gemini_key=${encodeURIComponent(apiKey)}; HttpOnly; Secure; SameSite=Strict; Path=/`);
    return res.json({ status: "success" });
  }
  return res.status(400).json({ status: "error" });
});

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

  const [prData, filesData] = await Promise.all([
    fetchFromGithub(prUrl, token) as Promise<any>,
    fetchFromGithub(filesUrl, token) as Promise<any[]>
  ]);

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
  const fetchPromises = selectedFiles.map(async (file: any) => {
    try {
      const content = await fetchFileContent(owner, repo, defaultBranch, file.path, token);
      const maxCharLimit = 30000;
      const truncatedContent = content.length > maxCharLimit ? content.substring(0, maxCharLimit) + "\n\n[Content truncated due to size limits...]" : content;
      return { path: file.path, content: truncatedContent };
    } catch (err) {
      console.warn(`[Github Fetch] Could not fetch content for ${file.path}:`, err);
      return null;
    }
  });
  
  const resolvedFiles = await Promise.all(fetchPromises);
  const files = resolvedFiles.filter((f): f is {path: string, content: string} => f !== null);

  return {
    defaultBranch,
    files
  };
}

// Real AI Multi-Agent PR Review Endpoint
app.post("/api/review", async (req, res) => {
  const repo_url = (req.body as any)?.repo_url;
  const pr_number = (req.body as any)?.pr_number;
  const api_key = (req.headers["x-gemini-key"] as string) || (req.headers["x-api-key"] as string) || (req.body as any)?.api_key || getCookie(req, "repoguard_gemini_key");
  const github_token = (req.headers["x-github-token"] as string) || (req.body as any)?.github_token;

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
    
    console.log(`[API Review] Starting multi-agent pipeline for ${normalizedRepoUrl}`);
    
    console.log(`[API Review] Running Triage, Code Review, and Docs Agents concurrently...`);
    
    const [triageOutput, codeReviewOutput, docsOutput] = await Promise.all([
      runTriageAgent(normalizedRepoUrl, prDetailsPrompt, promptContext, activeApiKey),
      runCodeReviewAgent(promptContext, activeApiKey),
      runDocsAgent(promptContext, activeApiKey)
    ]);
    
    console.log(`[API Review] Running Synthesizer Agent...`);
    const parsedData = await runSynthesizerAgent(triageOutput, codeReviewOutput, docsOutput, activeApiKey);

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
  const message = (req.body as any)?.message;
  const history = (req.body as any)?.history;
  const api_key = (req.headers["x-gemini-key"] as string) || (req.headers["x-api-key"] as string) || (req.body as any)?.api_key || getCookie(req, "repoguard_gemini_key");

  if (req.body) {
    delete (req.body as any).api_key;
  }

  if (typeof message === "string" && message.length > MAX_CHAT_MESSAGE_LENGTH) {
    return res.status(400).json({ status: "error", message: "Message exceeds maximum allowed length." });
  }

  const redactSecrets = (text: string) => {
    if (!text) return text;
    let result = text;
    const REDACTION_PATTERNS = [
      /gh[pousr](?:_|%5F)[a-zA-Z0-9]{36}/gi,
      /AIza[0-9A-Za-z-_]{35}/gi,
      /AKIA[0-9A-Z]{16}/gi,
      /(?:sk|rk)_(?:live|test)(?:_|%5F)[0-9a-zA-Z]{24}/gi,
      /xox[baprs](?:-|%2D)[0-9a-zA-Z]{10,48}/gi
    ];
    for (const pattern of REDACTION_PATTERNS) {
      result = result.replace(pattern, '***REDACTED***');
    }
    return result;
  };
  const cleanMessage = redactSecrets(clampText(message, MAX_CHAT_MESSAGE_LENGTH) || '');
  if (!cleanMessage) {
    return res.status(400).json({ status: "error", message: "Message is required." });
  }

  try {
    const chatContents: GeminiChatContent[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-MAX_CHAT_HISTORY_ITEMS)) {
        if (!msg || typeof msg !== "object") continue;
        const { role, content } = msg as { role?: unknown; content?: unknown };
        if (typeof content === "string" && content.length > MAX_CHAT_MESSAGE_LENGTH) {
          return res.status(400).json({ status: "error", message: "History message exceeds maximum allowed length." });
        }
        const cleanContent = clampText(content, MAX_CHAT_MESSAGE_LENGTH);
        if (!cleanContent) continue;
        chatContents.push({
          role: role === "user" ? "user" : "model",
          parts: [{ text: redactSecrets(cleanContent) }]
        });
      }
    }
    chatContents.push({ role: 'user', parts: [{ text: cleanMessage }] });

    let activeSystemInstruction = "You are RepoGuard Security AI, a friendly, intelligent companion and secure code advisor built by Aryan Raj (link: github.com/aryxncodes7). You specialize in finding leaked passwords, API keys, logic bugs, and documentation fixes in repos. Keep your tone helpful, concise, engaging, and clear.";
    const reportContext = (req.body as any)?.reportContext;
    if (reportContext) {
      const issuesList = Array.isArray(reportContext.issues) ? reportContext.issues.slice(0, 50).map((i: unknown) => redactSecrets(String(i))).join("\n- ") : "None";
      activeSystemInstruction += `\n\nCurrent Report Context:\nRepository: ${redactSecrets(String(reportContext.repository || "Unknown"))}\nVerdict: ${redactSecrets(String(reportContext.verdict || "Unknown"))}\nGuide: ${redactSecrets(String(reportContext.guide || "None"))}\nIssues:\n- ${issuesList}`;
    }

    const response = await generateContentWithFallback(chatContents, {
      systemInstruction: activeSystemInstruction,
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
    const { createServer: createViteServer } = await import("vite");
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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`RepoGuard system server running on http://0.0.0.0:${PORT}`);
  });
  server.setTimeout(300000);
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
