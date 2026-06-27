import { test, describe, expect, vi } from 'vitest';
import { runCodeReviewAgent } from './codeReviewAgent.js';
import * as agentUtils from './agentUtils.js';

// Mock the generateContentWithFallback utility
vi.mock('./agentUtils.js', () => ({
  generateContentWithFallback: vi.fn(),
}));

describe('codeReviewAgent', () => {
  test('returns AI text when successful', async () => {
    // Setup mock return value
    vi.mocked(agentUtils.generateContentWithFallback).mockResolvedValueOnce({
      text: 'Mocked AI Review Output'
    });

    const result = await runCodeReviewAgent('const x = 1;', 'mock-api-key');
    
    expect(agentUtils.generateContentWithFallback).toHaveBeenCalledTimes(1);
    expect(result).toBe('Mocked AI Review Output');
  });

  test('returns fallback string when AI returns undefined text', async () => {
    vi.mocked(agentUtils.generateContentWithFallback).mockResolvedValueOnce({
      text: undefined
    });

    const result = await runCodeReviewAgent('const x = 1;', 'mock-api-key');
    
    expect(result).toBe('Code Review Agent produced no output.');
  });
});
