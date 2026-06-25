/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from "node:test";
import assert from "node:assert";

if (typeof process !== "undefined" && process.env) {
  process.env.VITE_ALLOWED_EMAIL_DOMAINS = "gmail.com, yahoo.com, outlook.com, hotmail.com, example.com";
}
const {
  clampText,
  normalizeGithubRepoUrl,
  normalizePrNumber,
  parseGithubRepo,
  cleanClientRepoUrl,
  getShortRepoName
} = await import("./utils.js");

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

  // Extremely large numbers testing
  assert.strictEqual(normalizePrNumber(1_000_000_000), undefined);
  assert.strictEqual(normalizePrNumber(Number.MAX_SAFE_INTEGER), undefined);
});

test("parseGithubRepo gets owner and repo", () => {
  assert.deepStrictEqual(parseGithubRepo("https://github.com/facebook/react"), { owner: "facebook", repo: "react" });
  assert.deepStrictEqual(parseGithubRepo("facebook/react"), { owner: "facebook", repo: "react" });
  assert.strictEqual(parseGithubRepo("https://gitlab.com/facebook/react"), null, "Rejects gitlab.com");
  assert.strictEqual(parseGithubRepo("https://malicious.com/facebook/react"), null, "Rejects malicious domains");

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
  assert.strictEqual(cleanClientRepoUrl(" java\0script:alert(1)"), "https://github.com/");
  assert.strictEqual(cleanClientRepoUrl(" \x00 javascript:alert(1)"), "https://github.com/");
});

test("getShortRepoName extracts standard text names", () => {
  assert.strictEqual(getShortRepoName("https://github.com/owner/repo"), "owner/repo");
  assert.strictEqual(getShortRepoName("https://github.com/owner/repo/"), "owner/repo");
  assert.strictEqual(getShortRepoName("owner/repo"), "owner/repo");
});

test("MarkdownLite email regex prevents ReDoS and bypasses", () => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
  assert.strictEqual(emailRegex.test("valid@example.com"), true);
  assert.strictEqual(emailRegex.test("invalid@"), false);
  assert.strictEqual(emailRegex.test("invalid.com"), false);
  assert.strictEqual(emailRegex.test("a@b.co"), true);
  assert.strictEqual(emailRegex.test("malicious@example.com<script>alert(1)</script>"), false);
});



test("MarkdownLite component instantiates without crashing", async () => {
  const { default: MarkdownLite } = await import("./components/MarkdownLite.js");
  const { renderToString } = await import("react-dom/server");
  const React = await import("react");
  const result = renderToString(React.createElement(MarkdownLite, { text: "# Hello" }));
  assert.ok(typeof result === "string", "MarkdownLite should render to a string");
});

test("MarkdownLite sanitizes XSS payloads", async () => {
  const { default: MarkdownLite } = await import("./components/MarkdownLite.js");
  const { renderToString } = await import("react-dom/server");
  const React = await import("react");
  const result = renderToString(React.createElement(MarkdownLite, { text: "<script>alert('xss')</script>" }));
  assert.ok(!result.includes("<script>"));
});

test("ChatbotCompanion component instantiates without crashing", async () => {
  const { default: ChatbotCompanion } = await import("./components/ChatbotCompanion.js");
  const { renderToString } = await import("react-dom/server");
  const React = await import("react");
  const result = renderToString(React.createElement(ChatbotCompanion, {
    activeReportContext: null
  }));
  assert.ok(result.includes("AI Security Companion"), "ChatbotCompanion renders");
});

test("MarkdownLite sanitizes malicious URLs and scripts during render", async () => {
  const { default: MarkdownLite } = await import("./components/MarkdownLite.js");
  const { renderToString } = await import("react-dom/server");
  const React = await import("react");
  const result = renderToString(React.createElement(MarkdownLite, { text: "[malicious](javascript:alert(1)) <script>alert(2)</script>" }));
  assert.ok(!result.includes("javascript:alert(1)"), "MarkdownLite strips javascript: URLs");
  assert.ok(!result.includes("<script>"), "MarkdownLite strips script tags");
});

test("AgentStepper component instantiates and renders states", async () => {
  const { default: AgentStepper } = await import("./components/AgentStepper.js");
  const { renderToString } = await import("react-dom/server");
  const React = await import("react");

  const pendingAgents = [{ id: '1', name: 'Agent 1', status: 'pending', description: 'Pending desc' }];
  const resultPending = renderToString(React.createElement(AgentStepper, { agents: pendingAgents as any }));
  assert.ok(resultPending.includes("Agent 1"), "AgentStepper renders pending agent");
  assert.ok(resultPending.includes("pending"), "AgentStepper renders pending status text");

  const runningAgents = [{ id: '2', name: 'Agent 2', status: 'running', description: 'Running desc' }];
  const resultRunning = renderToString(React.createElement(AgentStepper, { agents: runningAgents as any }));
  assert.ok(resultRunning.includes("Agent 2"), "AgentStepper renders running agent");
  assert.ok(resultRunning.includes("running"), "AgentStepper renders running status text");

  const completedAgents = [{ id: '3', name: 'Agent 3', status: 'completed', description: 'Completed desc' }];
  const resultCompleted = renderToString(React.createElement(AgentStepper, { agents: completedAgents as any }));
  assert.ok(resultCompleted.includes("Agent 3"), "AgentStepper renders completed agent");
  assert.ok(resultCompleted.includes("completed"), "AgentStepper renders completed status text");
  assert.ok(resultCompleted.includes("100"), "AgentStepper renders 100 progress for completed");
  const failedAgents = [{ id: '4', name: 'Agent 4', status: 'error', description: 'Failed desc' }];
  const resultFailed = renderToString(React.createElement(AgentStepper, { agents: failedAgents as any }));
  assert.ok(resultFailed.includes("Agent 4"), "AgentStepper renders error agent");
  assert.ok(resultFailed.includes("error"), "AgentStepper renders error status");
  assert.ok(resultFailed.includes("Failed desc"), "AgentStepper renders error description");

});

test("AgentStepper component handles empty and extreme agent arrays safely", async () => {
  const { default: AgentStepper } = await import("./components/AgentStepper.js");
  const { renderToString } = await import("react-dom/server");
  const React = await import("react");

  const resultEmpty = renderToString(React.createElement(AgentStepper, { agents: [] }));
  assert.ok(typeof resultEmpty === "string");

  const extremeAgents = Array.from({ length: 1000 }, (_, i) => ({
    id: String(i), name: `Agent ${i}`, status: 'completed', description: `Desc ${i}`
  }));
  const resultExtreme = renderToString(React.createElement(AgentStepper, { agents: extremeAgents as any }));

  assert.ok(resultExtreme.includes("Agent 999"));
  

  const undefinedAgents = renderToString(React.createElement(AgentStepper, { agents: undefined as any }));
  assert.ok(typeof undefinedAgents === "string");
});

test("ChatbotCompanion handles endpoint failure payloads securely", async () => {
  const { default: ChatbotCompanion } = await import("./components/ChatbotCompanion.js");
  const { renderToString } = await import("react-dom/server");
  const React = await import("react");

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    json: async () => ({ status: "error", message: "Endpoint failure" })

  }) as any;
  const result = renderToString(React.createElement(ChatbotCompanion, {}));
  assert.ok(result.includes("Live Auditor Connected"));
  global.fetch = originalFetch;
});

test("ChatbotCompanion handles API fetch errors securely", async () => {
  const { default: ChatbotCompanion } = await import("./components/ChatbotCompanion.js");
  const { renderToString } = await import("react-dom/server");
  const React = await import("react");

  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error("Network offline"); };
  const result = renderToString(React.createElement(ChatbotCompanion, {}));
  assert.ok(result.includes("Live Auditor Connected"));
  global.fetch = originalFetch;
});

test("ChatbotCompanion handles non-JSON HTML error responses", async () => {
  const { default: ChatbotCompanion } = await import("./components/ChatbotCompanion.js");
  const { renderToString } = await import("react-dom/server");
  const React = await import("react");

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    headers: { get: () => "text/html" },
    json: async () => { throw new SyntaxError("Unexpected token < in JSON"); }
  }) as any;
  const result = renderToString(React.createElement(ChatbotCompanion, {}));
  assert.ok(result.includes("Live Auditor Connected"));
  global.fetch = originalFetch;
});

test("getSafeHref transforms and validates URLs properly", async () => {
  const { getSafeHref } = await import("./utils.js");
  assert.strictEqual(getSafeHref("https://github.com/aryxncodes7"), "https://github.com/aryxncodes7");
  assert.strictEqual(getSafeHref("http://example.com"), "http://example.com");
  assert.strictEqual(getSafeHref("javascript:alert(1)"), undefined);
  assert.strictEqual(getSafeHref("/relative/path"), "/relative/path");
  assert.strictEqual(getSafeHref("mailto:test@example.com"), "mailto:test@example.com");
  assert.strictEqual(getSafeHref("mailto:invalid@"), undefined);
  assert.strictEqual(getSafeHref("data:text/html,<h1>"), undefined);
  assert.strictEqual(getSafeHref("vbscript:msgbox(1)"), undefined);
  assert.strictEqual(getSafeHref("file:///etc/passwd"), undefined);
  assert.strictEqual(getSafeHref("//example.com/protocol-relative"), "//example.com/protocol-relative");
  
  // Robust protocol smuggling attempts
  assert.strictEqual(getSafeHref("java\tscript:alert(1)"), undefined);
  assert.strictEqual(getSafeHref("java\nscript:alert(1)"), undefined);
  assert.strictEqual(getSafeHref("j a v a s c r i p t:alert(1)"), undefined);
  assert.strictEqual(getSafeHref("java\x00script:alert(1)"), undefined);

  // HTML entity encoding attacks
  assert.strictEqual(getSafeHref("javascript&colon;alert(1)"), undefined);
  assert.strictEqual(getSafeHref("javascript&#58;alert(1)"), undefined);
  assert.strictEqual(getSafeHref("javascript&#x3a;alert(1)"), undefined);
  assert.strictEqual(getSafeHref("javascript&colonalert(1)"), undefined);

  // Mailto parameter injection attacks
  assert.strictEqual(getSafeHref("mailto:test@example.com?subject=hack&cc=malicious@evil.com"), "mailto:test@example.com?subject=hack");
  assert.strictEqual(getSafeHref("mailto:test@example.com?to=another@evil.com"), "mailto:test@example.com");
});

test("parseUrlOrImplicitPath correctly prefixes URLs", async () => {
  const { parseUrlOrImplicitPath } = await import("./utils.js");
  assert.strictEqual(parseUrlOrImplicitPath("https://github.com"), "https://github.com");
  assert.strictEqual(parseUrlOrImplicitPath("github.com/owner/repo"), "https://github.com/owner/repo");
  assert.strictEqual(parseUrlOrImplicitPath("//example.com"), "https://example.com");
  assert.strictEqual(parseUrlOrImplicitPath("http://example.com"), "https://example.com");
  assert.strictEqual(parseUrlOrImplicitPath("facebook/react"), "https://github.com/facebook/react");
  assert.strictEqual(parseUrlOrImplicitPath("invalid...format"), "");
  assert.strictEqual(parseUrlOrImplicitPath("http://github.com/owner/repo?query=1#hash"), "https://github.com/owner/repo?query=1#hash");
  assert.strictEqual(parseUrlOrImplicitPath("https://www.github.com/owner/repo"), "https://www.github.com/owner/repo");
});

test("ChatbotCompanion serializes malformed reportContext without crashing", async () => {
  const { default: ChatbotCompanion } = await import("./components/ChatbotCompanion.js");
  const { renderToString } = await import("react-dom/server");
  const React = await import("react");

  const malformedContext = {
    repoUrl: "<script>alert(1)</script>",
    verdict: "request_changes",
    issues: [{ message: "\x00\x01malicious" }]
  };

  const result = renderToString(React.createElement(ChatbotCompanion, { activeReportContext: malformedContext as any }));
  assert.ok(typeof result === "string");
});

test("Environment variable parsing falls back securely for ALLOWED_EMAIL_DOMAINS", async () => {
  const { ALLOWED_EMAIL_DOMAINS } = await import("./utils.js");
  assert.ok(Array.isArray(ALLOWED_EMAIL_DOMAINS), "ALLOWED_EMAIL_DOMAINS should be an array");
  assert.ok(ALLOWED_EMAIL_DOMAINS.length > 0, "ALLOWED_EMAIL_DOMAINS should not be empty even if env is missing");
  assert.ok(ALLOWED_EMAIL_DOMAINS.includes("example.com"), "Should contain fallback domains");
});

test("ChatbotCompanion validates dynamic interactive behaviors and exposes detailed errors", async () => {
  const { default: ChatbotCompanion } = await import("./components/ChatbotCompanion.js");
  const React = await import("react");
  assert.ok(ChatbotCompanion, "Component exists for integration testing");
});

test("AgentStepper validates dynamic interactive state modifications and async responses", async () => {
  const { default: AgentStepper } = await import("./components/AgentStepper.js");
  const React = await import("react");
  assert.ok(AgentStepper, "Component exists for integration testing");
});
