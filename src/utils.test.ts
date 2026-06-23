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
});

test("normalizeGithubRepoUrl parses valid and invalid URLs", () => {
  assert.strictEqual(
    normalizeGithubRepoUrl("https://github.com/expressjs/express"), 
    "https://github.com/expressjs/express"
  );
  assert.strictEqual(
    normalizeGithubRepoUrl("https://github.com/expressjs/express/issues"), 
    "https://github.com/expressjs/express"
  );
  assert.strictEqual(
    normalizeGithubRepoUrl("github.com/expressjs/express"), 
    "https://github.com/expressjs/express"
  );
  assert.strictEqual(
    normalizeGithubRepoUrl("expressjs/express"), 
    "https://github.com/expressjs/express"
  );
  assert.strictEqual(normalizeGithubRepoUrl("https://malicious.site.com/foo/bar"), "");
});

test("normalizePrNumber formats numbers and handles invalid values", () => {
  assert.strictEqual(normalizePrNumber("42"), "42");
  assert.strictEqual(normalizePrNumber(42), "42");
  assert.strictEqual(normalizePrNumber(""), undefined);
  assert.strictEqual(normalizePrNumber("not-a-number"), undefined);
  assert.strictEqual(normalizePrNumber(-5), undefined);
});

test("parseGithubRepo gets owner and repo", () => {
  const result = parseGithubRepo("https://github.com/owner/my-repo");
  assert.deepStrictEqual(result, { owner: "owner", repo: "my-repo" });
  
  const shortResult = parseGithubRepo("owner/my-repo");
  assert.deepStrictEqual(shortResult, { owner: "owner", repo: "my-repo" });

  assert.strictEqual(parseGithubRepo("invalid-format"), null);
});

test("cleanClientRepoUrl adds https prefix if missing", () => {
  assert.strictEqual(cleanClientRepoUrl("github.com/foo/bar"), "https://github.com/github.com/foo/bar");
  assert.strictEqual(cleanClientRepoUrl("https://github.com/foo/bar"), "https://github.com/foo/bar");
});

test("getShortRepoName extracts standard text names", () => {
  assert.strictEqual(getShortRepoName("https://github.com/owner/repo"), "owner/repo");
  assert.strictEqual(getShortRepoName("https://github.com/owner/repo/"), "owner/repo");
  assert.strictEqual(getShortRepoName("owner/repo"), "owner/repo");
});
