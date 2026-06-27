import React from 'react';
import { render, screen } from '@testing-library/react';
import { test, describe, expect } from 'vitest';
import AgentStepper from './AgentStepper';
import { AgentProgress } from '../types';

describe('AgentStepper Component State Transitions', () => {
  test('gracefully renders with empty or undefined agents', () => {
    // @ts-expect-error testing undefined edge case
    const { container: containerUndef } = render(<AgentStepper agents={undefined} />);
    expect(containerUndef).toBeDefined();

    const { container: containerEmpty } = render(<AgentStepper agents={[]} />);
    expect(containerEmpty.textContent).toContain('Running Real Multi-Agent Analysis');
  });

  test('deduplicates agents correctly and renders statuses', () => {
    const agents: AgentProgress[] = [
      { id: '1', name: 'Triage Agent', status: 'completed', output: '' },
      { id: '2', name: 'Review Agent', status: 'running', output: '' },
      // Duplicate ID should be filtered out by useMemo
      { id: '2', name: 'Review Agent Duplicate', status: 'pending', output: '' },
      { id: '3', name: 'Docs Agent', status: 'error', output: '' }
    ];

    render(<AgentStepper agents={agents} />);

    // Deduplication should ensure only 3 agents render, not 4
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);

    // Verify status indicators are rendered correctly via aria-current
    const runningAgent = listItems.find(el => el.getAttribute('aria-current') === 'step');
    expect(runningAgent).toBeDefined();
    expect(runningAgent?.textContent).toContain('Review Agent');
  });

  test('simulates interrupted async flows and rapid prop updates without crashing', () => {
    const { rerender, container } = render(<AgentStepper agents={[]} />);
    
    // Simulate rapid progression
    rerender(<AgentStepper agents={[{ id: '1', name: 'Agent A', status: 'running', output: '' }]} />);
    expect(container.textContent).toContain('Agent A');
    
    // Interrupted: State flips abruptly to error with new agents injected
    rerender(<AgentStepper agents={[
      { id: '1', name: 'Agent A', status: 'error', output: '' },
      { id: '2', name: 'Agent B', status: 'completed', output: '' }
    ]} />);
    
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    // Should render correctly without crashing
    expect(container).toBeDefined();
  });
});
