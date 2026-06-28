/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

export const TriageReviewSchema = z.object({
  risk_level: z.enum(['low', 'medium', 'high']),
  size_category: z.enum(['small', 'medium', 'large']),
  summary: z.string(),
});
export type TriageReview = z.infer<typeof TriageReviewSchema>;

export const CodeIssueSchema = z.object({
  file: z.string(),
  line: z.number(),
  severity: z.enum(['info', 'warning', 'critical']),
  category: z.enum(['security', 'style', 'logic', 'missing_tests']),
  message: z.string(),
  resolution: z.string().optional(),
});
export type CodeIssue = z.infer<typeof CodeIssueSchema>;

export const SecretDetectedSchema = z.object({
  file: z.string(),
  line: z.number(),
  snippet_redacted: z.string(),
});
export type SecretDetected = z.infer<typeof SecretDetectedSchema>;

export const CodeReviewSchema = z.object({
  issues: z.array(CodeIssueSchema),
  secrets_detected: z.array(SecretDetectedSchema),
});
export type CodeReview = z.infer<typeof CodeReviewSchema>;

export const DocsReviewSchema = z.object({
  docs_outdated: z.boolean(),
  missing_sections: z.array(z.string()),
  suggested_readme_diff: z.string(),
});
export type DocsReview = z.infer<typeof DocsReviewSchema>;

export const FinalSummarySchema = z.object({
  verdict: z.enum(['approve', 'request_changes', 'needs_discussion']),
  summary_markdown: z.string(),
  top_priority_fixes: z.array(z.string()),
});
export type FinalSummary = z.infer<typeof FinalSummarySchema>;

export const ReportMetricsSchema = z.object({
  security: z.number(),
  accessibility: z.number(),
  testCoverage: z.number(),
  codeCleanliness: z.number(),
  efficiency: z.number(),
  architecture: z.number(),
  documentation: z.number(),
});
export type ReportMetrics = z.infer<typeof ReportMetricsSchema>;

export const ReviewResponseSchema = z.object({
  status: z.enum(['success', 'error']),
  message: z.string().optional(),
  is_simulated: z.boolean().optional(),
  simulation_warning: z.string().optional(),
  pr_title: z.string(),
  pr_author: z.string(),
  files_changed: z.number(),
  triage: TriageReviewSchema,
  code_review: CodeReviewSchema,
  docs_review: DocsReviewSchema,
  final_summary: FinalSummarySchema,
  metrics: ReportMetricsSchema,
});
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

export type ReviewState = 'idle' | 'reviewing' | 'report' | 'error';

export const AgentProgressSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.string(),
}).catchall(z.unknown());
export type AgentProgress = z.infer<typeof AgentProgressSchema>;
