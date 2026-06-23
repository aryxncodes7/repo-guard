/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const MAX_REPO_URL_LENGTH = 200;

export function clampText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength).trim() : "";
}

export function normalizeGithubRepoUrl(rawUrl: unknown): string {
  const repoUrl = clampText(rawUrl, MAX_REPO_URL_LENGTH);
  if (!repoUrl) return "";

  try {
    // Basic fix to support input starting with 'github.com/owner/repo' or 'owner/repo'
    let normalizedInput = repoUrl;
    if (!repoUrl.startsWith("http://") && !repoUrl.startsWith("https://")) {
      normalizedInput = "https://" + repoUrl.replace(/^(github\.com\/)?/i, "github.com/");
    }

    const parsed = new URL(normalizedInput);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const isGithubRepo =
      parsed.protocol === "https:" &&
      parsed.hostname.toLowerCase() === "github.com" &&
      pathParts.length >= 2 &&
      /^[A-Za-z0-9_.-]+$/.test(pathParts[0]) &&
      /^[A-Za-z0-9_.-]+$/.test(pathParts[1]);

    return isGithubRepo ? `https://github.com/${pathParts[0]}/${pathParts[1]}` : "";
  } catch {
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
    let urlToParse = cleanedUrl;
    if (!cleanedUrl.startsWith("http://") && !cleanedUrl.startsWith("https://")) {
      urlToParse = "https://" + cleanedUrl.replace(/^(github\.com\/)?/i, "github.com/");
    }
    const parsed = new URL(urlToParse);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      return { owner: pathParts[0], repo: pathParts[1] };
    }
  } catch {
    // ignore
  }
  return null;
}

export function cleanClientRepoUrl(repoUrl: string): string {
  const trimmed = (repoUrl || "").trim();
  if (!trimmed) return "https://github.com/";
  return trimmed.startsWith("http") ? trimmed : `https://github.com/${trimmed}`;
}

export function getShortRepoName(repoUrl: string): string {
  const trimmed = (repoUrl || "").trim();
  return trimmed.replace(/https?:\/\/(www\.)?github\.com\//i, "").replace(/\/$/, "") || "repository";
}
