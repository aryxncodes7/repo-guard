/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getNormalizedUrl } from './sanitizeRepoUrl.js';
import createDOMPurify from 'dompurify';

const DOMPurify = typeof window !== 'undefined' ? createDOMPurify(window as any) : null;

export const MAX_PR_NUMBER = 1000000;

export function safeDecode(str: string): string {
  try { return decodeURIComponent(str); }
  catch (e) { return str; }
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

const MAX_REPO_URL_LENGTH = 200;

const ENTITY_REGEX = /&(?:#x([0-9a-fA-F]{1,6});?|#(\d{1,7});?|colon;?|tab;?|newline;?)/gi;
const STRIP_CHARS_REGEX = /[\s\x00-\x1F\x7F-\x9F]/g;

export function getSafeHref(href?: string) {
  if (!href) return undefined;
  if (href.length > 2048) return undefined;
  
  let decodedHref = href;
  
  if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
    try {
      const sanitized = DOMPurify.sanitize(`<a href="${href}"></a>`, { ALLOWED_TAGS: ['a'], ALLOWED_ATTR: ['href'] });
      const match = sanitized.match(/href="([^"]*)"/);
      if (!match) return undefined;
      decodedHref = match[1];
    } catch (e) {}
  }
    
  try {
    decodedHref = safeDecode(decodedHref);
  } catch (e) {}
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
    
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
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
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : undefined;
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
  const lowerDecoded = decodedUrl.toLowerCase();
  if (lowerDecoded.includes("..") || lowerDecoded.includes("%2e") || lowerDecoded.includes("\\") || lowerDecoded.includes("%5c")) {
    return "";
  }

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
      (parsed.hostname.toLowerCase() === "github.com" || parsed.hostname.toLowerCase() === "www.github.com") &&
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
    const lowerDecoded = decodedUrl.toLowerCase();
    if (lowerDecoded.includes("..") || lowerDecoded.includes("%2e") || lowerDecoded.includes("\\") || lowerDecoded.includes("%5c")) {
      return null;
    }
    
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

  let decoded = safeDecode(trimmed);
  const lowerDecoded = decoded.toLowerCase();
  if (lowerDecoded.includes("..") || lowerDecoded.includes("%2e") || lowerDecoded.includes("\\") || lowerDecoded.includes("%5c")) {
    return "https://github.com/";
  }

  try {
    const normalized = parseUrlOrImplicitPath(decoded);
    if (!normalized) return "https://github.com/";

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
  if (inputUrl.includes("..")) return "";
  const secureUrl = inputUrl.replace(/^http:/i, "https:");
  
  const GITHUB_URL_REGEX = /^https:\/\/(?:www\.)?github\.com(?::\d+)?(?:\/[\s\S]*)?$/i;
  if (GITHUB_URL_REGEX.test(secureUrl)) {
    return secureUrl;
  }
  
  if (inputUrl.startsWith("//")) {
    const protocolRelativeRegex = /^\/\/(?:www\.)?github\.com(?::\d+)?(?:\/[\s\S]*)?$/i;
    if (protocolRelativeRegex.test(inputUrl)) {
       return `https:${inputUrl}`;
    }
    return "";
  }
  
  const hostStartRegex = /^(?:www\.)?github\.com(?::\d+)?(?:\/[\s\S]*)?$/i;
  if (hostStartRegex.test(inputUrl)) {
    return `https://${inputUrl}`;
  }
  
  if (/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(inputUrl)) {
    return `https://github.com/${inputUrl}`;
  }
  
  return "";
}
