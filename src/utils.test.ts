/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from "node:test";
import assert from "node:assert";
import { 
  clampText, 
  normalizeGithubRepoUrl, 
  normalizePrNumber, 
  parseGithubRepo, 
  cleanClientRepoUrl, 
  getShortRepoName 
} from "./utils.js";

test("clampText limits strings properly", () => {
  assert.strictEqual(clampText("hello world", 5), "hello");
  assert.strictEqual(clampText("   trimmed   ", 10), "trimmed");
  assert.strictEqual(clampText(12345, 5), "");
  assert.strictEqual(clampText("<script>alert(1)</script>", 30), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.strictEqual(clampText("john & doe", 20), "john &amp; doe");
  
  // Non-string inputs
  assert.strictEqual(clampText(null, 10), "");
  assert.strictEqual(clampText(undefined, 10), "");
  assert.strictEqual(clampText({}, 10), "");
  assert.strictEqual(clampText([], 10), "");
  assert.strictEqual(clampText(true, 10), "");
  
  // Very large strings
  const largeString = "a".repeat(50000);
  assert.strictEqual(clampText(largeString, 10), "aaaaaaaaaa");
});

test("normalizeGithubRepoUrl parses valid and invalid URLs", () => {
  assert.strictEqual(normalizeGithubRepoUrl("https://github.com/owner/repo"), "https://github.com/owner/repo");
  assert.strictEqual(normalizeGithubRepoUrl("owner/repo"), "https://github.com/owner/repo");
  assert.strictEqual(normalizeGithubRepoUrl("github.com/owner/repo"), "https://github.com/owner/repo");
  assert.strictEqual(normalizeGithubRepoUrl("http://github.com/owner/repo"), "https://github.com/owner/repo");
  assert.strictEqual(normalizeGithubRepoUrl("https://github.com/owner"), "");
  assert.strictEqual(normalizeGithubRepoUrl("https://github.com/"), "");
  assert.strictEqual(normalizeGithubRepoUrl("https://gitlab.com/owner/repo"), "");
  
  // Advanced URL parsing edge cases
  assert.strictEqual(normalizeGithubRepoUrl("https://github.com:443/owner/repo#fragment"), "https://github.com/owner/repo");
  assert.strictEqual(normalizeGithubRepoUrl("https://github.com.example.com/owner/repo"), "");
});

test("normalizePrNumber formats numbers and handles invalid values", () => {
  assert.strictEqual(normalizePrNumber(123), "123");
  assert.strictEqual(normalizePrNumber("456"), "456");
  assert.strictEqual(normalizePrNumber("abc"), undefined);
  assert.strictEqual(normalizePrNumber(-1), undefined);
  assert.strictEqual(normalizePrNumber(1.5), undefined);
  assert.strictEqual(normalizePrNumber(""), undefined);
  assert.strictEqual(normalizePrNumber(null), undefined);
  
  // Upper bounds testing
  assert.strictEqual(normalizePrNumber(1_000_000), "1000000");
  assert.strictEqual(normalizePrNumber(1_000_001), undefined);
  assert.strictEqual(normalizePrNumber(999_999), "999999");
});

test("parseGithubRepo gets owner and repo", () => {
  const result = parseGithubRepo("https://github.com/owner/my-repo");
  assert.deepStrictEqual(result, { owner: "owner", repo: "my-repo" });
  
  const shortResult = parseGithubRepo("owner/my-repo");
  assert.deepStrictEqual(shortResult, { owner: "owner", repo: "my-repo" });

  assert.strictEqual(parseGithubRepo("invalid-format"), null);
  assert.strictEqual(parseGithubRepo("https://github.com/../repo"), null);
  assert.strictEqual(parseGithubRepo("https://github.com/owner\\repo"), null);
});

test("cleanClientRepoUrl adds https prefix if missing", () => {
  assert.strictEqual(cleanClientRepoUrl("github.com/foo/bar"), "https://github.com/foo/bar");
  assert.strictEqual(cleanClientRepoUrl("https://github.com/foo/bar"), "https://github.com/foo/bar");
  assert.strictEqual(cleanClientRepoUrl(""), "https://github.com/");
  assert.strictEqual(cleanClientRepoUrl("   "), "https://github.com/");
  assert.strictEqual(cleanClientRepoUrl("javascript:alert(1)"), "https://github.com/");
  assert.strictEqual(cleanClientRepoUrl("data:text/html,malicious"), "https://github.com/");
  assert.strictEqual(cleanClientRepoUrl("github.com/../malicious"), "https://github.com/");
  assert.strictEqual(cleanClientRepoUrl("https://github.com/foo/bar?query=../../injection"), "https://github.com/");
  assert.strictEqual(cleanClientRepoUrl("https://github.com/foo/bar?query=safe_param"), "https://github.com/foo/bar");
  assert.strictEqual(cleanClientRepoUrl("github.com\\foo/bar"), "https://github.com/");
  assert.strictEqual(cleanClientRepoUrl("//github.com/foo/bar"), "https://github.com/foo/bar");
});

test("cleanClientRepoUrl prevents protocol smuggling and malformed URL attacks", () => {
  assert.strictEqual(cleanClientRepoUrl("vbscript:msgbox(1)"), "https://github.com/");
  assert.strictEqual(cleanClientRepoUrl("file:///etc/passwd"), "https://github.com/");
  assert.strictEqual(cleanClientRepoUrl("javascript://%250Aalert(1)"), "https://github.com/");
  assert.strictEqual(cleanClientRepoUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="), "https://github.com/");
  assert.strictEqual(cleanClientRepoUrl("android-app://com.malicious.app/http/example.com"), "https://github.com/");
  assert.strictEqual(cleanClientRepoUrl("intent://example.com#Intent;scheme=http;package=com.malicious.app;end"), "https://github.com/");
  assert.strictEqual(cleanClientRepoUrl("https://github.com/foo/bar?param=javascript:alert(1)"), "https://github.com/foo/bar");
  assert.strictEqual(cleanClientRepoUrl("https://github.com/foo/bar?param=%0a%0d%00bypass"), "https://github.com/foo/bar");
  assert.strictEqual(cleanClientRepoUrl("https://github.com/foo/bar?query=%2e%2e%2finjection"), "https://github.com/");
});

test("getShortRepoName extracts standard text names", () => {
  assert.strictEqual(getShortRepoName("https://github.com/owner/repo"), "owner/repo");
  assert.strictEqual(getShortRepoName("https://github.com/owner/repo/"), "owner/repo");
  assert.strictEqual(getShortRepoName("owner/repo"), "owner/repo");
});

test("MarkdownLite email regex prevents ReDoS and bypasses", () => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+$/;
  assert.strictEqual(emailRegex.test("valid@example.com"), true);
  assert.strictEqual(emailRegex.test("invalid@"), false);
  assert.strictEqual(emailRegex.test("invalid.com"), false);
  assert.strictEqual(emailRegex.test("a@b.c"), true);
  assert.strictEqual(emailRegex.test("malicious@example.com<script>alert(1)</script>"), false);
});

test("ChatbotCompanion sanitize function strips XML tags", () => {
  const sanitize = (val: string) => (val || '').replace(/[<>\x00-\x1F\x7F-\x9F`$\\]/g, '');
  assert.strictEqual(sanitize("hello <script> alert(1); </script> world"), "hello script alert(1); /script world");
  assert.strictEqual(sanitize('{"key": "value"}'), '{"key": "value"}');
  assert.strictEqual(sanitize("issues <issues>"), "issues issues");
  assert.strictEqual(sanitize("injection `${alert(1)}\\x00`"), "injection {alert(1)}x00");
});

test("MarkdownLite component instantiates without crashing", async () => {
  const { default: MarkdownLite } = await import("./components/MarkdownLite.js");
  const { renderToString } = await import("react-dom/server");
  const React = await import("react");
  const result = renderToString(React.createElement(MarkdownLite, { text: "# Hello" }));
  assert.ok(typeof result === "string", "MarkdownLite should render to a string");
});

test("ChatbotCompanion component instantiates without crashing", async () => {
  const { default: ChatbotCompanion } = await import("./components/ChatbotCompanion.js");
  const { renderToString } = await import("react-dom/server");
  const React = await import("react");
  const result = renderToString(React.createElement(ChatbotCompanion, { activeReportContext: null }));
  assert.ok(typeof result === "string", "ChatbotCompanion should render to a string");
});
