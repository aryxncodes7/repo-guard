/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const MAX_PR_NUMBER = 1000000;
const rawDomains = import.meta.env?.VITE_ALLOWED_EMAIL_DOMAINS || (typeof process !== 'undefined' ? process.env.VITE_ALLOWED_EMAIL_DOMAINS : undefined);
const parsedDomains = typeof rawDomains === 'string'
  ? rawDomains.split(',').map((d: string) => d.trim()).filter((d: string) => /^[a-zA-Z0-9.-]+$/.test(d))
  : [];
export const ALLOWED_EMAIL_DOMAINS = parsedDomains.length > 0 
  ? parsedDomains 
  : ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'example.com'];

const MAX_REPO_URL_LENGTH = 200;

export function getSafeHref(href?: string) {
  if (!href) return undefined;
  if (href.length > 2048) return undefined;
  const decodedHref = href.replace(/&#x([0-9a-fA-F]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                          .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
                          .replace(/&colon;?/gi, ':')
                          .replace(/&tab;?/gi, '\t')
                          .replace(/&newline;?/gi, '\n');
  try {
    const strippedHref = decodedHref.replace(/[\s\x00-\x1F\x7F-\x9F]+/g, '');
    let absoluteHref = strippedHref;
    if (strippedHref.startsWith('//')) {
      absoluteHref = 'https:' + strippedHref;
    }
    
    const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(absoluteHref, fallbackOrigin);
    
    if (['javascript:', 'data:', 'vbscript:', 'file:'].includes(parsed.protocol)) {
      return undefined;
    }

    if (parsed.protocol === 'mailto:') {
      const email = parsed.pathname.trim();
      const domain = email.split('@').pop()?.toLowerCase();
      if (!domain || !ALLOWED_EMAIL_DOMAINS.includes(domain)) {
        return undefined;
      }
      if (email.length > 254) {
        return undefined;
      }
      if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(email)) {
        return undefined;
      }
      
      const safeParams = new URLSearchParams();
      const originalParams = new URLSearchParams(parsed.search);
      if (originalParams.has('subject')) {
        safeParams.set('subject', originalParams.get('subject')!.replace(/[\r\n]/g, ''));
      }
      if (originalParams.has('body')) {
        safeParams.set('body', originalParams.get('body')!.replace(/[\r\n]/g, ''));
      }
      
      const searchStr = safeParams.toString();
      return searchStr ? `mailto:${email}?${searchStr}` : `mailto:${email}`;
    }
    return ['http:', 'https:'].includes(parsed.protocol) ? href : undefined;
  } catch {
    return undefined;
  }
}

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
  let decodedUrl = repoUrl.toLowerCase();
  try { decodedUrl = decodeURIComponent(decodedUrl); } catch {}
  if (decodedUrl.includes("../") || decodedUrl.includes("%2e%2e%2f") || decodedUrl.includes("\\") || decodedUrl.includes("%5c")) {
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
  if (typeof rawPrNumber === 'string' && !/^\d+$/.test(rawPrNumber)) return undefined;
  const numeric = Number(rawPrNumber);
  return Number.isInteger(numeric) && numeric > 0 && numeric <= 1_000_000 ? String(numeric) : undefined;
}

export function parseGithubRepo(repoUrl: string): { owner: string; repo: string } | null {
  try {
    const cleanedUrl = repoUrl.trim().replace(/\/$/, "");
    let decodedCleaned = cleanedUrl.toLowerCase();
    try { decodedCleaned = decodeURIComponent(decodedCleaned); } catch {}
    if (decodedCleaned.includes("../") || decodedCleaned.includes("%2e%2e%2f") || decodedCleaned.includes("\\") || decodedCleaned.includes("%5c")) {
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
    decoded = decodeURIComponent(trimmed);
  } catch {
    return "https://github.com/";
  }
  // Detect and reject relative path traversals and backslashes
  const lowerDecoded = decoded.toLowerCase();
  if (lowerDecoded.includes("../") || lowerDecoded.includes("%2e%2e%2f") || lowerDecoded.includes("\\") || lowerDecoded.includes("%5c")) {
    return "https://github.com/";
  }

  let normalized = "";
  try {
    normalized = parseUrlOrImplicitPath(decoded);
  } catch {
    return "https://github.com/";
  }
  if (!normalized) return "https://github.com/";

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "https://github.com/";
    }
    if (parsed.hostname.toLowerCase() !== "github.com" && parsed.hostname.toLowerCase() !== "www.github.com") {
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
  return repoUrl;
}

export function parseUrlOrImplicitPath(inputUrl: string): string {
  let canParseInput = false;
  try {
    new URL(inputUrl);
    canParseInput = true;
  } catch {}
  if (canParseInput) {
    const parsed = new URL(inputUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return inputUrl.replace(/^http:/i, "https:");
  }
  
  if (inputUrl.startsWith("//")) {
    return `https:${inputUrl}`;
  }
  
  const httpsUrl = `https://${inputUrl}`;
  let canParseHttps = false;
  try {
    new URL(httpsUrl);
    canParseHttps = true;
  } catch {}
  if (canParseHttps) {
    const tempParsed = new URL(httpsUrl);
    if (tempParsed.hostname.toLowerCase() === "github.com" || tempParsed.hostname.toLowerCase() === "www.github.com") {
      return httpsUrl;
    }
  }
  
  // Explicitly support strictly formatted owner/repo strings
  if (/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(inputUrl) && !inputUrl.includes("../")) {
    return `https://github.com/${inputUrl}`;
  }
  
  return "";
}
