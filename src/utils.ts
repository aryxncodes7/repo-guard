/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Inlined from sanitizeRepoUrl.js
export const getNormalizedUrl = (url: string): string | null => {
    return safeDecode(url.trim());
};
import createDOMPurify from 'dompurify';

const DOMPurify = typeof window !== 'undefined' && window.document ? createDOMPurify(window as any) : null;

export const MAX_PR_NUMBER = 1000000;

export function safeDecode(str: string): string | null {
  try { return decodeURIComponent(str); }
  catch (e) { 
    console.error("[safeDecode] Error decoding:", str, e);
    return null; 
  }
}

const rawDomains = import.meta.env?.VITE_ALLOWED_EMAIL_DOMAINS || (typeof process !== 'undefined' ? process.env.VITE_ALLOWED_EMAIL_DOMAINS : undefined);
const parsedDomains = typeof rawDomains === 'string'
  ? rawDomains.split(',').map((d: string) => d.trim()).filter((d: string) => {
    try { return new URL(`https://${d}`).hostname === d; }
    catch { return false; }
  })
  : [];
export const ALLOWED_EMAIL_DOMAINS = parsedDomains.length > 0
  ? parsedDomains
  : ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'example.com'];

export const ALLOWED_PROTOCOLS = ['http', 'https', 'mailto'] as const;

const MAX_REPO_URL_LENGTH = 200;

const STRIP_CHARS_REGEX = /[\s\x00-\x1F\x7F-\x9F]/g;

export function getSafeHref(href?: string) {
  if (!href) return undefined;
  if (href.length > 2048) return undefined;

  let decodedHref = href;

  if (DOMPurify && typeof DOMPurify.isValidAttribute === 'function') {
    if (!DOMPurify.isValidAttribute('a', 'href', href)) {
      return undefined;
    }
  } else if (typeof window !== 'undefined') {
    return undefined;
  }

  try {
    const dec = safeDecode(decodedHref);
    if (dec === null) return undefined;
    decodedHref = dec;
  } catch (e) { }
  try {
    const strippedHref = decodedHref.replace(STRIP_CHARS_REGEX, '');
    if (/^(?:javascript|vbscript|data):/i.test(strippedHref)) {
      return undefined;
    }
    let absoluteHref = strippedHref;
    if (strippedHref.startsWith('//')) {
      absoluteHref = 'https:' + strippedHref;
    }

    const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(absoluteHref, fallbackOrigin);
    const protocolStr = parsed.protocol.replace(':', '');

    if (!ALLOWED_PROTOCOLS.includes(protocolStr as any)) {
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
      if (!/^[^@\s]+@[^@\s]+$/.test(email)) {
        return undefined;
      }

      const safeUrl = new URL(`mailto:${email}`);
      const originalParams = parsed.searchParams || new URLSearchParams(parsed.search);
      
      if (originalParams.has('subject')) {
        safeUrl.searchParams.set('subject', originalParams.get('subject')!.replace(/[\r\n]/g, ' '));
      }
      if (originalParams.has('body')) {
        safeUrl.searchParams.set('body', originalParams.get('body')!.replace(/[\r\n]/g, ' '));
      }
      
      return safeUrl.href;
    }
    return ['http', 'https'].includes(protocolStr) ? parsed.href : undefined;
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

  const decodedUrl = safeDecode(repoUrl);
  if (decodedUrl === null) return "";
  const lowerDecoded = decodedUrl.toLowerCase();

  try {
    const normalizedInput = parseUrlOrImplicitPath(decodedUrl);
    if (!normalizedInput) return "";

    const parsed = new URL(normalizedInput);
    const pathParts = parsed.pathname.split("/").filter(Boolean);

    if (pathParts.length < 2) return "";

    const owner = pathParts[0];
    const repo = pathParts[1];

    const isGithubRepo =
      parsed.protocol === "https:" &&
      /^(www\.)?github\.com$/.test(parsed.hostname.toLowerCase()) &&
      /^[A-Za-z0-9_-]+$/.test(owner) &&
      /^[A-Za-z0-9_.-]+$/.test(repo);

    return isGithubRepo ? `https://${parsed.host}/${owner}/${repo}` : "";
  } catch (error) {
    console.warn("[normalizeGithubRepoUrl] Failed to parse URL:", repoUrl, error);
    return "";
  }
}

export function normalizePrNumber(rawPrNumber: unknown): string | undefined {
  if (typeof rawPrNumber === 'number') {
    return Number.isInteger(rawPrNumber) && rawPrNumber > 0 && rawPrNumber <= MAX_PR_NUMBER ? String(rawPrNumber) : undefined;
  }
  if (typeof rawPrNumber === 'string') {
    const trimmed = rawPrNumber.trim();
    if (trimmed === "" || !/^\d+$/.test(trimmed)) return undefined;
    const numeric = Number(trimmed);
    return Number.isInteger(numeric) && numeric > 0 && numeric <= MAX_PR_NUMBER ? String(numeric) : undefined;
  }
  return undefined;
}

export function parseGithubRepo(repoUrl: string): { owner: string; repo: string } | null {
  if (!repoUrl || repoUrl.length > 2048) return null;
  try {
    const cleanedUrl = repoUrl.trim().replace(/\/$/, "");
    if (cleanedUrl.startsWith("//")) return null;

    const decodedUrl = safeDecode(cleanedUrl);
    if (decodedUrl === null) return null;
    const lowerDecoded = decodedUrl.toLowerCase();

    const urlToParse = parseUrlOrImplicitPath(decodedUrl.normalize('NFKC'));
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

  try {
    const normalized = parseUrlOrImplicitPath(trimmed);
    if (!normalized) return "https://github.com/";
    const parsed = new URL(normalized);
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

function isLoopbackOrPrivate(hostname: string): boolean {
  if (!hostname) return false;
  const lower = hostname.toLowerCase();
  return lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower.startsWith('10.') ||
    lower.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower);
}

export function parseUrlOrImplicitPath(inputUrl: string): string {

  let normalizedUrl = inputUrl;
  
  if (normalizedUrl.startsWith("//")) {
    normalizedUrl = `https:${normalizedUrl}`;
  } else if (!/^https?:\/\//i.test(normalizedUrl)) {
    // Treat as implicit owner/repo path if no protocol is provided
    normalizedUrl = `https://github.com/${normalizedUrl}`;
  }
  
  try {
    const parsed = new URL(normalizedUrl);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();
    
    if (protocol !== "http:" && protocol !== "https:") return "";
    if (!/^(www\.)?github\.com$/.test(hostname)) return "";
    
    parsed.protocol = "https:";
    
    // Strict path validation using URL constructor's pathname
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      if (!/^[A-Za-z0-9_-]+$/.test(pathParts[0])) return "";
      if (pathParts.length > 1) {
        if (!/^[A-Za-z0-9_.-]+$/.test(pathParts[1])) return "";
      }
    }
    
    return parsed.toString();
  } catch {
    return "";
  }
}
