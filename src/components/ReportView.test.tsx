import React from 'react';
import { render, screen } from '@testing-library/react';
import { test, describe, expect, vi } from 'vitest';
import ReportView from './ReportView';
import { ReviewResponse } from '../types';

// Mock child components to isolate ReportView logic
vi.mock('./MarkdownLite', () => ({
  default: ({ text }: { text: string }) => <div data-testid="markdown-lite">{text}</div>
}));

vi.mock('./ChatbotCompanion', () => ({
  default: () => <div data-testid="chatbot-companion" />
}));

vi.mock('motion/react', () => {
  const MockComponent = ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>;
  return {
    motion: new Proxy({}, {
      get: () => MockComponent
    }),
    AnimatePresence: ({ children }: any) => <>{children}</>
  };
});

const mockReviewResponse: ReviewResponse = {
  status: 'success',
  pr_title: 'Mock PR',
  pr_author: 'TestUser',
  files_changed: 5,
  triage: {
    risk_level: 'high',
    size_category: 'large',
    summary: 'Mock Summary'
  },
  code_review: {
    issues: [
      { file: 'src/App.tsx', line: 10, severity: 'critical', category: 'security', message: 'XSS flaw' },
      { file: 'src/App.tsx', line: 20, severity: 'warning', category: 'logic', message: 'Edge case unhandled' },
      { file: 'src/utils.ts', line: 5, severity: 'info', category: 'style', message: 'Formatting issue' },
    ],
    secrets_detected: [
      { file: 'src/App.tsx', line: 15, snippet_redacted: 'API_KEY=***' }
    ]
  },
  docs_review: {
    docs_outdated: true,
    missing_sections: ['Security', 'Usage'],
    suggested_readme_diff: '+\n+ Added Security Section\n-\n- Old stuff\n@@ -1,3 +1,4 @@\n No changes'
  },
  final_summary: {
    verdict: 'request_changes',
    summary_markdown: 'Needs fixing.',
    top_priority_fixes: ['Fix XSS']
  },
  metrics: {
    efficiency: 85,
    codeQuality: 70
  }
};

describe('ReportView Component', () => {
  test('renders security resolutions correctly based on severity and category', () => {
    render(<ReportView activeReviewResult={mockReviewResponse} repoUrl="github.com/owner/repo" onBack={vi.fn()} />);
    
    // Security + Critical resolution string check
    expect(screen.getByText(/Emergency security remediation required/i)).toBeInTheDocument();
    
    // Logic + Warning resolution string check
    expect(screen.getByText(/Potential logical oversight/i)).toBeInTheDocument();
    
    // Style + Info resolution string check
    expect(screen.getByText(/Visual guide rule/i)).toBeInTheDocument();
  });

  test('groups code issues by file successfully', () => {
    render(<ReportView activeReviewResult={mockReviewResponse} repoUrl="github.com/owner/repo" onBack={vi.fn()} />);
    
    // App.tsx and utils.ts headers should be present
    expect(screen.getByText('src/App.tsx')).toBeInTheDocument();
    expect(screen.getByText('src/utils.ts')).toBeInTheDocument();
    
    // XSS flaw and Edge case unhandled should render under their respective components
    expect(screen.getByText('XSS flaw')).toBeInTheDocument();
    expect(screen.getByText('Edge case unhandled')).toBeInTheDocument();
  });

  test('renders diff block with accurate patch formatting', () => {
    const { container } = render(<ReportView activeReviewResult={mockReviewResponse} repoUrl="github.com/owner/repo" onBack={vi.fn()} />);
    
    // Check that positive diff lines render
    expect(screen.getByText('+ Added Security Section')).toBeInTheDocument();
    expect(screen.getByText('+ Added Security Section').className).toMatch(/text-emerald-300/);

    // Check negative diff lines render
    expect(screen.getByText('- Old stuff')).toBeInTheDocument();
    expect(screen.getByText('- Old stuff').className).toMatch(/text-rose-300/);

    // Check patch headers
    expect(screen.getByText('@@ -1,3 +1,4 @@')).toBeInTheDocument();
    expect(screen.getByText('@@ -1,3 +1,4 @@').className).toMatch(/text-teal-400/);
    
    // Check standard line
    expect(screen.getByText('No changes')).toBeInTheDocument();
    expect(screen.getByText('No changes').className).toMatch(/text-slate-200/);
  });

  test('correctly triggers onBack callback', () => {
    const mockBack = vi.fn();
    render(<ReportView activeReviewResult={mockReviewResponse} repoUrl="github.com/owner/repo" onBack={mockBack} />);
    
    const backButton = screen.getByRole('button', { name: /Analyze Different Target/i });
    backButton.click();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
