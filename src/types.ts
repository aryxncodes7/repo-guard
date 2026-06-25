/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TriageReview {
  risk_level: 'low' | 'medium' | 'high';
  size_category: 'small' | 'medium' | 'large';
  summary: string;
}

export interface CodeIssue {
  file: string;
  line: number;
  severity: 'info' | 'warning' | 'critical';
  category: 'security' | 'style' | 'logic' | 'missing_tests';
  message: string;
}

export interface SecretDetected {
  file: string;
  line: number;
  snippet_redacted: string;
}

export interface CodeReview {
  issues: CodeIssue[];
  secrets_detected: SecretDetected[];
}

export interface DocsReview {
  docs_outdated: boolean;
  missing_sections: string[];
  suggested_readme_diff: string;
}

export interface FinalSummary {
  verdict: 'approve' | 'request_changes' | 'needs_discussion';
  summary_markdown: string;
  top_priority_fixes: string[];
}

export interface ReviewResponse {
  status: 'success' | 'error';
  message?: string;
  is_simulated?: boolean;
  simulation_warning?: string;
  pr_title: string;
  pr_author: string;
  files_changed: number;
  triage: TriageReview;
  code_review: CodeReview;
  docs_review: DocsReview;
  final_summary: FinalSummary;
}

export type ReviewState = 'idle' | 'reviewing' | 'report' | 'error';

export interface AgentProgress {
  id: string;
  name: string;
  description: string;
  status: string;
  [key: string]: unknown;
}
