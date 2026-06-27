import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { test, describe, expect, vi, beforeEach, afterEach } from 'vitest';
import ChatbotCompanion from './ChatbotCompanion';

// Mock Markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: any) => <div data-testid="markdown-mock">{children}</div>
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ChatbotCompanion', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('renders initial greeting message', () => {
    render(<ChatbotCompanion />);
    expect(screen.getByText(/Resident Auditor/i)).toBeInTheDocument();
  });

  test('allows typing in the input field', () => {
    render(<ChatbotCompanion />);
    const input = screen.getByPlaceholderText('Type message...');
    
    fireEvent.change(input, { target: { value: 'How do I fix XSS?' } });
    expect(input).toHaveValue('How do I fix XSS?');
  });

  test('submitting form appends user message and triggers fetch', async () => {
    // Setup a mock stream response
    const mockResponse = new Response(
      JSON.stringify({ status: 'success', reply: 'Here is how to fix XSS' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    mockFetch.mockResolvedValueOnce(mockResponse);

    render(<ChatbotCompanion />);
    
    const input = screen.getByPlaceholderText('Type message...');
    const submitBtn = screen.getByRole('button', { name: /Send message/i });

    fireEvent.change(input, { target: { value: 'How do I fix XSS?' } });
    fireEvent.click(submitBtn);

    // User message should immediately appear
    expect(screen.getByText('How do I fix XSS?')).toBeInTheDocument();
    
    // Fetch should be called with correct arguments
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      expect(mockFetch.mock.calls[0][0]).toBe(`${baseUrl}/api/chat`);
    });

    // Assistant response should eventually stream in and append
    await waitFor(() => {
      expect(screen.getByText('Here is how to fix XSS')).toBeInTheDocument();
    });
  });

  test('handles fetch errors gracefully and shows error message', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ChatbotCompanion />);
    
    const input = screen.getByPlaceholderText('Type message...');
    const submitBtn = screen.getByRole('button', { name: /Send message/i });

    fireEvent.change(input, { target: { value: 'Fail test' } });
    fireEvent.click(submitBtn);

    // Verify error message is appended
    await waitFor(() => {
      expect(screen.getByText(/Backend Error: Network error/i)).toBeInTheDocument();
    });
  });

  test('aborts fetch on component unmount', async () => {
    let resolveMock: any;
    const promise = new Promise((resolve) => {
      resolveMock = resolve;
    });
    mockFetch.mockReturnValueOnce(promise);

    const { unmount } = render(<ChatbotCompanion />);
    
    const input = screen.getByPlaceholderText('Type message...');
    const submitBtn = screen.getByRole('button', { name: /Send message/i });

    fireEvent.change(input, { target: { value: 'Abort test' } });
    fireEvent.click(submitBtn);

    // Unmount while fetch is pending
    unmount();

    // The AbortController attached to the fetch request should have its abort() called.
    const fetchOptions = mockFetch.mock.calls[0][1];
    expect(fetchOptions.signal.aborted).toBe(true);
    
    // cleanup dangling promise
    resolveMock(new Response('{}', { status: 200 }));
  });
});
