/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
  Layers,
  FileCode2,
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  GitPullRequest,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { ReviewResponse, CodeIssue } from '../types';
import { motion } from 'motion/react';
import MarkdownLite from './MarkdownLite';
import ChatbotCompanion from './ChatbotCompanion';
import { cleanClientRepoUrl, getShortRepoName } from '../utils';

interface ReportViewProps {
  activeReviewResult: ReviewResponse;
  repoUrl: string;
  onBack: () => void;
}

export default function ReportView({ activeReviewResult, repoUrl, onBack }: ReportViewProps) {

  // Group code issues by file for visual structuring
  const getGroupedIssues = (issues: CodeIssue[]) => {
    const groups: { [key: string]: CodeIssue[] } = {};
    issues.forEach(issue => {
      if (!groups[issue.file]) {
        groups[issue.file] = [];
      }
      groups[issue.file].push(issue);
    });
    return groups;
  };

  const getResolutionText = (category: string, severity: string) => {
    if (category === 'security') {
      return severity === 'critical'
        ? 'Emergency security remediation required. Rotate any compromised credentials immediately, wipe historical references using BFG Repo Cleaner or filter-branch, and ensure robust client-side validation.'
        : 'Security posture review recommended. Validate inputs, sanitize data payloads, and ensure proper boundary constraints are enforced before execution.';
    }
    if (category === 'logic') {
      return severity === 'critical'
        ? 'Critical logical flaw detected. This could lead to application crashes or data corruption. Halt execution paths, add fail-safes, and comprehensively test edge cases.'
        : 'Potential logical oversight. Review state transitions, handle edge cases gracefully, and ensure execution pathways are predictable.';
    }
    if (category === 'missing_tests') {
      return severity === 'critical'
        ? 'Critical lack of test coverage for core business logic. Implement end-to-end integration tests and unit mocks to prevent catastrophic deployment regressions.'
        : 'Test coverage gaps identified. Expand unit tests to cover error boundaries and edge-case payload scenarios.';
    }
    return severity === 'critical'
      ? 'Critical formatting or structural failure violating core repository paradigms. Restructure architecture to match standards.'
      : severity === 'warning'
        ? 'Significant stylistic or structural deviation. Align with standardized project formatting rules to maintain maintainability.'
        : 'Visual guide rule. Group standard import schemes, secure consistent spaces, and avoid repetitive naming profiles.';
  };

  const groupedIssues = getGroupedIssues(activeReviewResult.code_review.issues);
  const totalIssuesCount = activeReviewResult.code_review.issues.length;
  const secretsCount = activeReviewResult.code_review.secrets_detected.length;

  // Render patch diff beautifully with colors
  const renderReadmeDiff = (diffText: string) => {
    if (!diffText) return null;
    const lines = diffText.split('\n');

    return (
      <div className="font-sans text-xs border border-slate-200 rounded-lg bg-slate-900/95 overflow-hidden text-slate-100 shadow-sm">
        <div className="bg-slate-800 px-4 py-2.5 text-[10px] text-slate-400 border-b border-slate-700/60 flex items-center justify-between font-sans">
          <span>suggested-docs-patch.diff</span>
          <span className="text-teal-400 tracking-wider">Patch Format</span>
        </div>
        <div className="p-4 overflow-x-auto select-all space-y-0.5 leading-relaxed font-sans">
          {lines.map((line, idx) => {
            let bgClass = 'hover:bg-slate-800/30';
            let textClass = 'text-slate-400';

            if (line.startsWith('+')) {
              bgClass = 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 pl-2 -ml-2';
              textClass = 'text-emerald-300 font-medium';
            } else if (line.startsWith('-')) {
              bgClass = 'bg-rose-950/30 text-rose-300 border-l-2 border-rose-500 pl-2 -ml-2';
              textClass = 'text-rose-300';
            } else if (line.startsWith('@@')) {
              bgClass = 'bg-teal-950/30 text-teal-300 font-semibold';
              textClass = 'text-teal-400';
            } else if (line.trim()) {
              textClass = 'text-slate-200';
            }

            return (
              <div key={idx} className={`px-2 py-0.5 rounded-sm whitespace-pre ${bgClass}`}>
                <span className={`${textClass}`}>{line}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const cleanRepoUrl = cleanClientRepoUrl(repoUrl);
  const shortName = getShortRepoName(repoUrl);

  return (
    <div className="space-y-8 pt-2 pb-16 animate-fade-in relative z-20 font-sans">

      {/* Top Header Actions with dynamic accent color */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/85 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-emerald-50 text-emerald-700 text-[10px] uppercase tracking-wider font-sans border border-emerald-200/70 px-2.5 py-0.5 rounded-full font-bold shadow-sm">
              Live Audit Result
            </span>
            <span className="font-sans text-xs text-slate-300 select-none">/</span>
            <a
              href={cleanRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-xs text-slate-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 font-bold underline decoration-dotted"
              title="View on GitHub"
            >
              {shortName}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight leading-none bg-gradient-to-r from-slate-950 dark:from-zinc-100 to-slate-700 dark:to-zinc-300 bg-clip-text text-transparent">
            Audit Executive Report
          </h2>
        </div>

        <button
          onClick={onBack}
          className="px-4 py-2.5 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-500 text-slate-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm w-full sm:w-auto hover:translate-y-[-1px] active:translate-y-[1px]"
          id="report-back-btn"
          type="button"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Analyze Different Target</span>
        </button>
      </div>



      {/* Grid Layout structure: Sticky Left Sidebar (lg:col-span-4) and detailed Main Panel (lg:col-span-8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Sticky Left Sidebar (Spans 4) */}
        <motion.aside
          initial={{ opacity: 0, x: -35 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-4 lg:sticky lg:top-24 space-y-6"
        >

          {/* Main Verdict Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-zinc-700 transition-all border-l-4 border-red-500">
            <div className={`absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r ${activeReviewResult.final_summary.verdict === 'approve' ? 'from-emerald-500 to-teal-400' :
                activeReviewResult.final_summary.verdict === 'request_changes' ? 'from-rose-500 to-orange-400' :
                  'from-amber-500 to-yellow-400'
              }`} />

            <span className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 uppercase tracking-wide block font-extrabold">
              PREDOMINANT VERDICT
            </span>

            <div className="mt-4 flex items-center gap-4">
              {activeReviewResult.final_summary.verdict === 'approve' && (
                <>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-extrabold text-base tracking-wide text-emerald-600 dark:text-emerald-400 block leading-none">
                      APPROVED
                    </span>
                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1.5 block">Merge status is safe and clean</span>
                  </div>
                </>
              )}

              {activeReviewResult.final_summary.verdict === 'request_changes' && (
                <>
                  <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner group-hover:scale-110 transition-transform">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="font-extrabold text-base tracking-wide text-rose-600 dark:text-rose-400 block leading-none">
                      QUARANTINED
                    </span>
                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1.5 block">Critical code issues or vulnerabilities detected</span>
                  </div>
                </>
              )}

              {(activeReviewResult.final_summary.verdict === 'needs_discussion' || !['approve', 'request_changes'].includes(activeReviewResult.final_summary.verdict)) && (
                <>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-extrabold text-base tracking-wide text-amber-600 dark:text-amber-400 block leading-none">
                      DEFERRED discussion
                    </span>
                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1.5 block">Requires minor structural adjustments</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Pull Request Metadata Detail Box */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-5">
            <span className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 uppercase tracking-widest block font-extrabold border-b border-slate-100 dark:border-zinc-800 pb-2.5">
              METRIC SUMMARY & SCOPE
            </span>

            {/* Target Title */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 uppercase font-extrabold">PR IDENT TITLE</span>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-zinc-200 tracking-tight leading-snug font-sans">
                {activeReviewResult.pr_title || "Repository Master Analysis"}
              </h3>
            </div>

            {/* Submitter & Modified */}
            <div className="grid grid-cols-2 gap-4 pb-1 pt-1">
              <div className="space-y-1">
                <span className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 uppercase font-extrabold">SUBMITTER ID</span>
                <a
                  href={`https://github.com/${activeReviewResult.pr_author || "extern_deployer"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-sans font-bold text-slate-700 dark:text-zinc-300 block bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2.5 py-1 rounded-lg w-max hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  @{activeReviewResult.pr_author || "extern_deployer"}
                </a>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 uppercase font-extrabold">FILES OVERVIEW</span>
                <span className="text-xs font-sans font-bold text-emerald-600 dark:text-emerald-400 block bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800 px-2.5 py-1 rounded-lg w-max">
                  {activeReviewResult.files_changed} {activeReviewResult.files_changed === 1 ? 'file' : 'files'}
                </span>
              </div>
            </div>

            {/* Risk Indicators and Category sizes */}
            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 uppercase block font-extrabold">RISK CLASSIFIER</span>
                <span className={`inline-flex px-2.5 py-1 rounded-full font-sans text-[9px] font-extrabold border uppercase leading-none tracking-wider ${activeReviewResult.triage.risk_level === 'high' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900' :
                    activeReviewResult.triage.risk_level === 'medium' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900' :
                      'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                  }`}>
                  {activeReviewResult.triage.risk_level}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 uppercase block font-extrabold">COMPUTED SCALE</span>
                <span className="inline-flex px-2.5 py-1 rounded-full font-sans text-[9px] font-extrabold border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 uppercase leading-none tracking-wider font-extrabold">
                  {activeReviewResult.triage.size_category}
                </span>
              </div>
            </div>

            {/* Small visualization bar of files modified */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <span className="text-[9px] font-sans text-slate-400 dark:text-zinc-500 block font-extrabold">SCOPE COVERAGE FACTOR</span>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.max(15, activeReviewResult.files_changed * 18))}%` }} />
              </div>
            </div>

          </div>

          {/* Quick resolution checklist */}
          {activeReviewResult.final_summary.top_priority_fixes && activeReviewResult.final_summary.top_priority_fixes.length > 0 && (
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
              <span className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 uppercase tracking-wide block font-extrabold">
                REQUIRED ADJUSTMENTS
              </span>
              <ul className="space-y-3.5 pt-1">
                {activeReviewResult.final_summary.top_priority_fixes.map((fix, idx) => (
                  <li key={`${fix}-${idx}`} className="flex gap-3 items-start text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">
                    <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900 rounded-lg w-5.5 h-5.5 flex items-center justify-center flex-shrink-0 select-none text-[10px] font-bold font-sans shadow-sm">
                      0{idx + 1}
                    </span>
                    <span className="flex-1 text-slate-700 dark:text-zinc-200 font-semibold leading-normal">
                      {fix}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Chatbot Companion fills empty space underneath the metrics cards sidebar */}
          <div className="pt-2">
            <ChatbotCompanion activeReportContext={{ repoUrl, verdict: activeReviewResult.final_summary.verdict, issues: activeReviewResult.code_review.issues }} />
          </div>

          {/* Repo Health Matrix Widget */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-5 animate-fade-in relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
              <span className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                <span className="text-sm">🎛️</span> REPOSITORY AUDIT MATRIX
              </span>
            </div>

            <div className="space-y-4">
              {/* Security Rating */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="font-extrabold text-slate-700 dark:text-zinc-300">Security Rating</span>
                  <span className="font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    {activeReviewResult.metrics?.security || 42}%
                    {(activeReviewResult.metrics?.security || 42) < 50 && (
                      <span className="text-[8.5px] uppercase tracking-wider bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 font-extrabold">CRITICAL</span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${activeReviewResult.metrics?.security || 42}%` }} transition={{ duration: 1, delay: 0.2 }} className="h-full bg-rose-500 rounded-full" />
                </div>
              </div>

              {/* Accessibility Rating */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="font-extrabold text-slate-700 dark:text-zinc-300">Accessibility Rating</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{activeReviewResult.metrics?.accessibility || 88}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${activeReviewResult.metrics?.accessibility || 88}%` }} transition={{ duration: 1, delay: 0.3 }} className="h-full bg-emerald-500 rounded-full" />
                </div>
              </div>

              {/* Test Coverage Metric */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="font-extrabold text-slate-700 dark:text-zinc-300">Test Coverage Metric</span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    {activeReviewResult.metrics?.testCoverage || 15}%
                    {(activeReviewResult.metrics?.testCoverage || 15) < 50 && (
                      <span className="text-[8.5px] uppercase tracking-wider bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 font-extrabold">LOW</span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${activeReviewResult.metrics?.testCoverage || 15}%` }} transition={{ duration: 1, delay: 0.4 }} className="h-full bg-amber-500 rounded-full" />
                </div>
              </div>

              {/* Code Cleanliness & Style */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="font-extrabold text-slate-700 dark:text-zinc-300">Code Cleanliness & Style</span>
                  <span className="font-extrabold text-teal-600 dark:text-teal-400">{activeReviewResult.metrics?.codeCleanliness || 76}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${activeReviewResult.metrics?.codeCleanliness || 76}%` }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-teal-500 rounded-full" />
                </div>
              </div>

              {/* Runtime Efficiency Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-sans">
                  <span className="font-extrabold text-slate-700 dark:text-zinc-300">Runtime Efficiency</span>
                  <span className="font-extrabold text-cyan-600 dark:text-cyan-400">{activeReviewResult.metrics?.efficiency || 85}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${activeReviewResult.metrics?.efficiency || 85}%` }} transition={{ duration: 1, delay: 0.6 }} className="h-full bg-cyan-500 rounded-full" />
                </div>
              </div>

              {/* Architectural Quality Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-sans">
                  <span className="font-extrabold text-slate-700 dark:text-zinc-300">Architectural Quality</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{activeReviewResult.metrics?.architecture || 92}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${activeReviewResult.metrics?.architecture || 92}%` }} transition={{ duration: 1, delay: 0.7 }} className="h-full bg-emerald-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>

        </motion.aside>

        {/* DETAILS WORKSPACE PANEL (Spans 8) */}
        <motion.section
          initial={{ opacity: 0, x: 35 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="lg:col-span-8 space-y-8"
        >

          {/* 1. Triage Summary Section */}
          <motion.article
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            whileHover={{ y: -2, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.04)" }}
            className="p-6 md:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800/80 shadow-sm space-y-5 relative overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3.5">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider font-sans text-slate-900 dark:text-zinc-100">
                Triage Overview Report
              </h3>
            </div>
            <p className="text-[13.5px] text-slate-700 dark:text-zinc-300 leading-relaxed font-medium">
              {activeReviewResult.triage.summary}
            </p>
          </motion.article>

          {/* 2. Code Review Section with group items */}
          <motion.article
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            whileHover={{ y: -2, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.04)" }}
            className="p-6 md:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800/80 shadow-sm space-y-8 relative overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3.5">
              <FileCode2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider font-sans text-slate-900 dark:text-zinc-100">
                Core Static Scan Findings
              </h3>
            </div>

            {/* Exposed Secrets Alarm */}
            {activeReviewResult.code_review.secrets_detected && secretsCount > 0 && (
              <div className="p-5 rounded-xl bg-rose-50/75 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 space-y-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-rose-500" />

                <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400">
                  <ShieldAlert className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400 animate-bounce" />
                  <span className="text-xs font-sans font-extrabold tracking-widest uppercase">
                    ALERT: EXPOSED CREDENTIALS ({secretsCount})
                  </span>
                </div>

                <div className="space-y-3.5">
                  {activeReviewResult.code_review.secrets_detected.map((sec) => (
                    <div key={`${sec.file}-${sec.line}-${sec.snippet_redacted}`} className="text-xs space-y-2 bg-white dark:bg-zinc-800 p-3.5 rounded-lg border border-rose-200 dark:border-rose-900/30 shadow-sm animate-fade-in">
                      <div className="flex items-center gap-1.5 text-[10px] font-sans text-slate-500 dark:text-zinc-400">
                        <span className="font-extrabold text-rose-500 dark:text-rose-400">Exposed inside:</span>
                        <code className="text-slate-800 dark:text-zinc-100 font-sans font-extrabold bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{sec.file} : Line {sec.line}</code>
                      </div>
                      <pre className="p-4 rounded-lg bg-slate-950 text-rose-300 font-sans text-[10.5px] overflow-x-auto whitespace-pre leading-normal border border-slate-800 shadow-inner">
                        <code>{sec.snippet_redacted}</code>
                      </pre>
                    </div>
                  ))}
                </div>

                <p className="text-[10.5px] text-slate-500 dark:text-zinc-400 leading-relaxed font-sans font-medium">
                  Important: Exposed keys and credentials can violate cloud provider boundaries. Rebuild branch tree history prior to main merge integration.
                </p>
              </div>
            )}

            {/* List of structural issues */}
            {totalIssuesCount === 0 ? (
              <div className="p-8 rounded-xl bg-slate-50/70 dark:bg-zinc-800/30 border border-slate-200/80 dark:border-zinc-800 text-center space-y-3 shadow-inner">
                <ShieldCheck className="w-9 h-9 text-emerald-500 mx-auto animate-pulse" />
                <h4 className="text-xs font-extrabold font-sans tracking-widest uppercase text-emerald-600">
                  No Violations Detected
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  All systems and files maintain clean style guides, safe cryptographic bindings, and strong logical flows.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedIssues).map(([pathName, issues]) => (
                  <div key={pathName} className="space-y-4">

                    {/* File Group Title */}
                    <div className="flex items-center gap-2 text-zinc-300 dark:text-zinc-300 font-bold bg-zinc-900 px-4 py-2 rounded-t-lg font-mono text-xs border-b border-zinc-800">
                      <FileCode2 className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      <span className="truncate">{pathName}</span>
                    </div>

                    {/* Array of local issues */}
                    <div className="space-y-3.5 pl-3">
                      {issues.map((issue) => {
                        const isCritical = issue.severity === 'critical';
                        const isWarning = issue.severity === 'warning';
                        const badgeStyle = isCritical ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 font-bold' :
                          isWarning ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50' :
                            'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50';

                        return (
                          <div
                            key={`${issue.file}-${issue.line}-${issue.category}-${issue.message}`}
                            className="bg-slate-50/50 dark:bg-zinc-800/10 hover:bg-slate-100/30 dark:hover:bg-zinc-800/20 p-4 rounded-xl border border-slate-200/50 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex gap-3.5 relative shadow-sm"
                          >
                            <div className="text-center font-sans text-[9px] text-slate-500 dark:text-zinc-400 h-max px-2.5 py-1 bg-white dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700 shadow-sm leading-none flex items-center justify-center select-none font-extrabold">
                              L{issue.line}
                            </div>

                            <div className="flex-1 space-y-2">
                              <div className="flex flex-wrap gap-2 items-center">
                                <span className={`px-2 py-0.5 rounded font-sans text-[9px] uppercase tracking-wider border leading-none font-bold ${badgeStyle}`}>
                                  {issue.severity}
                                </span>
                                <span className="px-1.5 py-0.5 rounded font-sans text-[9px] tracking-wide bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 leading-none uppercase font-extrabold">
                                  {issue.category}
                                </span>
                              </div>
                              <p className="text-[13px] text-slate-700 dark:text-zinc-200 leading-relaxed font-semibold">
                                {issue.message}
                              </p>
                              <div className="pt-2 border-t border-slate-100/80 dark:border-zinc-800 mt-2 space-y-1">
                                <span className="text-[10px] uppercase font-sans tracking-wider font-extrabold text-slate-400 dark:text-zinc-500 block">Recommended Resolution Guide</span>
                                <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 leading-relaxed font-sans">
                                  {issue.resolution || getResolutionText(issue.category, issue.severity)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </motion.article>

          {/* 3. Docs Review Section with patches */}
          <motion.article
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25 }}
            whileHover={{ y: -2, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.04)" }}
            className="p-6 md:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800/80 shadow-sm space-y-6 relative overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3.5">
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider font-sans text-slate-900 dark:text-zinc-100">
                Documentation Synchronicity
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-sans text-slate-500 dark:text-zinc-400 uppercase font-extrabold">STATUS DISCREPANCIES:</span>
              {activeReviewResult.docs_review.docs_outdated ? (
                <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 text-[9px] font-sans px-2.5 py-1 border border-amber-300 dark:border-amber-900 rounded font-bold uppercase leading-none tracking-wider">
                  Outof-sync anomalies detected
                </span>
              ) : (
                <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-[9px] font-sans px-2.5 py-1 border border-emerald-300 dark:border-emerald-900 rounded font-bold uppercase leading-none tracking-wider font-extrabold">
                  Correct alignment healthy
                </span>
              )}
            </div>

            {/* Tags of missing categories */}
            {activeReviewResult.docs_review.missing_sections && activeReviewResult.docs_review.missing_sections.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 block uppercase font-extrabold">MISSING DOCUMENTATION CHAPTERS</span>
                <div className="flex flex-wrap gap-2">
                  {activeReviewResult.docs_review.missing_sections.map((sec) => (
                    <span
                      key={sec}
                      className="px-3 py-1 bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 rounded-lg text-[11px] text-slate-600 dark:text-zinc-200 font-bold flex items-center gap-2 shadow-sm"
                    >
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      {sec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Readme code patch renderer style */}
            {activeReviewResult.docs_review.suggested_readme_diff ? (
              <div className="space-y-2.5 pt-2">
                <span className="text-[10px] font-sans text-slate-400 dark:text-zinc-500 block uppercase font-extrabold">SUGGESTED ENHANCEMENT PATCH</span>
                {renderReadmeDiff(activeReviewResult.docs_review.suggested_readme_diff)}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/30 text-xs text-slate-500 dark:text-zinc-400 text-center border border-slate-200/60 dark:border-zinc-800 font-medium">
                No inline documentation patch modifications required
              </div>
            )}

          </motion.article>

          {/* 4. Final summary in markdown */}
          <motion.article
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3 }}
            whileHover={{ y: -2, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.04)" }}
            className="p-6 md:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800/80 shadow-sm space-y-5 relative overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider font-sans text-slate-900 dark:text-zinc-100">
                Auditor Final Synthesis
              </h3>
            </div>

            <div className="bg-slate-50/50 dark:bg-zinc-800/40 p-5 rounded-xl border border-slate-100 dark:border-zinc-800 font-medium leading-relaxed dark:text-zinc-200">
              <MarkdownLite text={activeReviewResult.final_summary.summary_markdown} />
            </div>
          </motion.article>

        </motion.section>

      </div>

    </div>
  );
}
