import React from 'react';
import { render, screen } from '@testing-library/react';
import { test, describe, expect, vi } from 'vitest';
import AgentStepper from './AgentStepper';
import { AgentProgress } from '../types';

// Mock framer-motion to prevent animation delays in tests
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, initial, animate, transition, ...props }: any) => (
      <div className={className} {...props} data-testid="motion-div">
        {children}
      </div>
    ),
    button: ({ children, className, ...props }: any) => (
      <button className={className} {...props}>
        {children}
      </button>
    ),
  },
}));

describe('AgentStepper Component', () => {
  describe('Boundary and Empty State Handling', () => {
    test('renders gracefully when agents array is empty', () => {
      render(<AgentStepper agents={[]} />);
      expect(screen.getByText('Running Real Multi-Agent Analysis')).toBeInTheDocument();
      expect(screen.getByText('PIPELINE DISPATCHED')).toBeInTheDocument();
      
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '0');
    });

    test('handles undefined gracefully via default props', () => {
      // @ts-expect-error testing undefined edge case
      render(<AgentStepper agents={undefined} />);
      expect(screen.getByText('PIPELINE DISPATCHED')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('Deduplication and State Transitions', () => {
    test('deduplicates agents by ID, keeping the first occurrence', () => {
      const agents: AgentProgress[] = [
        { id: 'agent-1', name: 'First', status: 'running', output: '' },
        { id: 'agent-1', name: 'First Duplicate', status: 'completed', output: '' },
        { id: 'agent-2', name: 'Second', status: 'pending', output: '' },
      ];

      render(<AgentStepper agents={agents} />);
      const listItems = screen.getAllByRole('listitem');
      
      // Should only render 2 agents
      expect(listItems).toHaveLength(2);
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.queryByText('First Duplicate')).not.toBeInTheDocument();
    });
  });

  describe('Status Indicator Branches', () => {
    test('renders pending (default) status UI correctly', () => {
      render(<AgentStepper agents={[{ id: '1', name: 'Pending Agent', status: 'pending', output: '' }]} />);
      const item = screen.getByRole('listitem');
      
      // Verify pending styles (no active aria-current)
      expect(item).not.toHaveAttribute('aria-current');
      expect(item.className).toMatch(/border-slate-100|border-zinc-800/);
    });

    test('renders running status UI correctly', () => {
      render(<AgentStepper agents={[{ id: '1', name: 'Running Agent', status: 'running', output: '' }]} />);
      const item = screen.getByRole('listitem');
      
      // aria-current is strictly used for running
      expect(item).toHaveAttribute('aria-current', 'step');
      expect(item.className).toMatch(/border-emerald-200/);
    });

    test('renders completed status UI correctly', () => {
      render(<AgentStepper agents={[{ id: '1', name: 'Completed Agent', status: 'completed', output: '' }]} />);
      const item = screen.getByRole('listitem');
      
      expect(item).not.toHaveAttribute('aria-current');
      expect(item.className).toMatch(/border-slate-200/);
    });

    test('renders error status UI correctly and cascades to pipeline state', () => {
      render(<AgentStepper agents={[{ id: '1', name: 'Error Agent', status: 'error', output: '' }]} />);
      const item = screen.getByRole('listitem');
      
      expect(item).not.toHaveAttribute('aria-current');
      expect(item.className).toMatch(/border-rose-200/);
      
      // The overall pipeline text should flip to failed
      expect(screen.getByText('PIPELINE FAILED')).toBeInTheDocument();
    });
  });

  describe('Progress Bar Mathematics', () => {
    test('calculates percentage accurately across mixed states', () => {
      const agents: AgentProgress[] = [
        { id: '1', name: 'A1', status: 'completed', output: '' },
        { id: '2', name: 'A2', status: 'completed', output: '' },
        { id: '3', name: 'A3', status: 'running', output: '' },
        { id: '4', name: 'A4', status: 'pending', output: '' },
      ];

      render(<AgentStepper agents={agents} />);
      
      // 2 completed out of 4 total = 50%
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '50');
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('PIPELINE DISPATCHED')).toBeInTheDocument();
    });

    test('progress falls back safely on empty arrays', () => {
      render(<AgentStepper agents={[]} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '0');
    });
  });
});
