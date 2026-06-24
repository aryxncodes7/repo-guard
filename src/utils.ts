/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const MAX_PR_NUMBER = 1000000;
export const ALLOWED_EMAIL_DOMAINS = import.meta.env?.VITE_ALLOWED_EMAIL_DOMAINS 
  ? import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS.split(',').map((d: string) => d.trim()) 
  : ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];

const MAX_REPO_URL_LENGTH = 200;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function clampText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const sliced = value.slice(0, maxLength).trim();
  return escapeHtml(sliced);
}

export function normalizeGithubRepoUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== "string") return "";
  const repoUrl = rawUrl.slice(0, MAX_REPO_URL_LENGTH).trim();
  if (!repoUrl) return "";

  // Reject relative paths, double dots, or backslashes
  if (repoUrl.includes("..") || repoUrl.includes("\\")) {
    return "";
  }

  try {
    const normalizedInput = parseUrlOrImplicitPath(repoUrl);
    if (!normalizedInput) return "";

    const parsed = new URL(normalizedInput);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    
    if (pathParts.length < 2) return "";
    
    const owner = pathParts[0];
    const repo = pathParts[1];
    
    const isGithubRepo =
      parsed.protocol === "https:" &&
      (parsed.hostname.toLowerCase() === "github.com" || parsed.hostname.toLowerCase() === "www.github.com") &&
      /^[A-Za-z0-9_-]+$/.test(owner) &&
      /^[A-Za-z0-9_.-]+$/.test(repo) &&
      owner !== "." && owner !== ".." &&
      repo !== "." && repo !== "..";

    return isGithubRepo ? `https://github.com/${owner}/${repo}` : "";
  } catch (error) {
    console.warn("[normalizeGithubRepoUrl] Failed to parse URL:", repoUrl, error);
    return "";
  }
}

export function normalizePrNumber(rawPrNumber: unknown): string | undefined {
  if (typeof rawPrNumber !== 'string' && typeof rawPrNumber !== 'number') return undefined;
  if (rawPrNumber === "") return undefined;
  const numeric = Number(rawPrNumber);
  return Number.isInteger(numeric) && numeric > 0 && numeric <= 1_000_000 ? String(numeric) : undefined;
}

export function parseGithubRepo(repoUrl: string): { owner: string; repo: string } | null {
  try {
    const cleanedUrl = repoUrl.trim().replace(/\/$/, "");
    if (cleanedUrl.includes("..") || cleanedUrl.includes("\\")) {
      return null;
    }
    
    const urlToParse = parseUrlOrImplicitPath(cleanedUrl);
    if (!urlToParse) return null;
    const parsed = new URL(urlToParse);
    if (parsed.hostname.toLowerCase() !== "github.com" && parsed.hostname.toLowerCase() !== "www.github.com") {
      return null;
    }
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      const owner = pathParts[0];
      const repo = pathParts[1];
      if (
        /^[A-Za-z0-9_-]+$/.test(owner) &&
        /^[A-Za-z0-9_.-]+$/.test(repo) &&
        owner !== "." && owner !== ".." &&
        repo !== "." && repo !== ".."
      ) {
        return { owner, repo };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function cleanClientRepoUrl(repoUrl: string): string {
  const trimmed = (repoUrl || "").trim();
  if (!trimmed) return "https://github.com/";

  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed).toLowerCase();
  } catch {
    return "https://github.com/";
  }
  // Detect and reject relative path traversals and backslashes
  if (decoded.includes("..") || decoded.includes("\\") || decoded.includes("%2e%2e") || decoded.includes("%5c")) {
    return "https://github.com/";
  }

  let normalized = "";
  try {
    normalized = parseUrlOrImplicitPath(trimmed);
  } catch {
    return "https://github.com/";
  }
  if (!normalized) return "https://github.com/";

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "https://github.com/";
    }
    // Strip query parameters and fragment to prevent path injection
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return "https://github.com/";
  }
}

export function getShortRepoName(repoUrl: string): string {
  const parsed = parseGithubRepo(repoUrl);
  if (parsed) return `${parsed.owner}/${parsed.repo}`;
  const parts = repoUrl.split('/').filter(Boolean);
  const len = parts.length;
  if (len < 2) return repoUrl;
  return `${parts[len-2]}/${parts[len-1]}`;
}

export function parseUrlOrImplicitPath(inputUrl: string): string {
  try {
    const parsed = new URL(inputUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return inputUrl.replace(/^http:/i, "https:");
  } catch {
    if (inputUrl.startsWith("//")) {
      return "https:" + inputUrl;
    } else {
      try {
        const tempParsed = new URL("https://" + inputUrl);
        if (tempParsed.hostname.toLowerCase() === "github.com" || tempParsed.hostname.toLowerCase() === "www.github.com") {
          return "https://" + inputUrl;
        } else {
          return `https://github.com/${inputUrl}`;
        }
      } catch {
        return "";
      }
    }
  }
}
