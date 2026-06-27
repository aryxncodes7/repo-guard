import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { test, describe, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

// Setup Mocks
vi.mock('motion/react', () => {
  const MockComponent = ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>;
  return {
    motion: new Proxy({}, {
      get: () => MockComponent
    }),
    AnimatePresence: ({ children }: any) => <>{children}</>
  };
});

// Mock child components
vi.mock('./components/AgentStepper', () => ({
  default: () => <div data-testid="agent-stepper" />
}));

vi.mock('./components/ReportView', () => ({
  default: () => <div data-testid="report-view" />
}));

vi.mock('./components/ChatbotCompanion', () => ({
  default: () => <div data-testid="chatbot-companion" />
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('App Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockClear();
    // Secure in-memory application state to replace raw localStorage
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; }
      };
    })();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
    // Default mock response for /api/analyze to prevent crashes if it runs
    mockFetch.mockResolvedValue(new Response(new ReadableStream(), { status: 200 }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders initial setup screen', () => {
    render(<App />);
    act(() => {
      vi.setSystemTime(new Date(Date.now() + 5000));
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText(/Find Bugs\. Secure Secrets\./i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://github.com/owner/repository')).toBeInTheDocument();
  });
});
