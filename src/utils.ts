/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  const repoUrl = clampText(rawUrl, MAX_REPO_URL_LENGTH);
  if (!repoUrl) return "";

  // Reject relative paths, double dots, or backslashes
  if (repoUrl.includes("..") || repoUrl.includes("\\")) {
    return "";
  }

  try {
    // Basic fix to support input starting with 'github.com/owner/repo' or 'owner/repo'
    let normalizedInput = repoUrl;
    const schemeMatch = repoUrl.match(/^([^:\/?#]+):/);
    if (schemeMatch) {
      const scheme = schemeMatch[1].toLowerCase();
      if (scheme !== "http" && scheme !== "https") return "";
    } else if (repoUrl.startsWith("//")) {
      normalizedInput = "https:" + repoUrl;
    } else {
      normalizedInput = "https://" + (repoUrl.toLowerCase().startsWith("github.com/") ? repoUrl : `github.com/${repoUrl}`);
    }

    const parsed = new URL(normalizedInput);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    
    if (pathParts.length < 2) return "";
    
    const owner = pathParts[0];
    const repo = pathParts[1];
    
    const isGithubRepo =
      parsed.protocol === "https:" &&
      parsed.hostname.toLowerCase() === "github.com" &&
      /^[A-Za-z0-9_.-]+$/.test(owner) &&
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
  if (rawPrNumber === undefined || rawPrNumber === null || rawPrNumber === "") return undefined;
  const numeric = Number(rawPrNumber);
  return Number.isInteger(numeric) && numeric > 0 && numeric <= 1_000_000 ? String(numeric) : undefined;
}

export function parseGithubRepo(repoUrl: string): { owner: string; repo: string } | null {
  try {
    const cleanedUrl = repoUrl.trim().replace(/\/$/, "");
    if (cleanedUrl.includes("..") || cleanedUrl.includes("\\")) {
      return null;
    }
    
    let urlToParse = cleanedUrl;
    if (!cleanedUrl.startsWith("http://") && !cleanedUrl.startsWith("https://")) {
      urlToParse = "https://" + cleanedUrl.replace(/^(github\.com\/)?/i, "github.com/");
    }
    const parsed = new URL(urlToParse);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      const owner = pathParts[0];
      const repo = pathParts[1];
      if (
        /^[A-Za-z0-9_.-]+$/.test(owner) &&
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

  const decoded = decodeURIComponent(trimmed).toLowerCase();
  // Detect and reject relative path traversals and backslashes
  if (decoded.includes("..") || decoded.includes("\\") || decoded.includes("%2e%2e") || decoded.includes("%5c")) {
    return "https://github.com/";
  }

  // Handle protocol relative URLs or missing protocols safely
  let normalized = trimmed;
  const schemeMatch = trimmed.match(/^([^:\/?#]+):/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== "http" && scheme !== "https") return "https://github.com/";
  } else if (trimmed.startsWith("//")) {
    normalized = `https:${trimmed}`;
  } else {
    normalized = "https://" + (trimmed.toLowerCase().startsWith("github.com/") ? trimmed : `github.com/${trimmed}`);
  }

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
  const trimmed = (repoUrl || "").trim();
  return trimmed.replace(/https?:\/\/(www\.)?github\.com\//i, "").replace(/\/$/, "") || "repository";
}
