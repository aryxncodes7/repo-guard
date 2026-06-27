import React from 'react';
import { render } from '@testing-library/react';
import { test, describe, expect } from 'vitest';
import fc from 'fast-check';
import MarkdownLite from './MarkdownLite';

describe('MarkdownLite Component Security', () => {
  test('strips dangerous tags and attributes from arbitrary strings', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (randomString) => {
          // Construct a payload that combines the random string with known dangerous vectors
          const payload = `${randomString} <script>alert("xss")</script> [xss](javascript:alert(1)) <img src=x onerror=alert(1)>`;
          
          const { container } = render(<MarkdownLite text={payload} />);
          const html = container.innerHTML;

          // Ensure no script tags exist
          expect(html).not.toContain('<script');
          
          // Ensure no javascript: protocol links are rendered in hrefs
          expect(html).not.toMatch(/href="javascript:/i);
          
          // Ensure no onerror or on* attributes
          expect(html).not.toMatch(/on[a-z]+=/i);
        }
      ),
      { numRuns: 100 } // Run 100 iterations of random strings
    );
  });

  test('truncates extremely long text correctly', () => {
    // Generate strings > 100000 characters
    fc.assert(
      fc.property(
        fc.string({ minLength: 100005, maxLength: 105000 }),
        (largeString) => {
          const { container } = render(<MarkdownLite text={largeString} />);
          const textContent = container.textContent || '';
          
          // Should contain the truncation warning
          expect(textContent).toContain('[TRUNCATED: Output exceeded 100k characters]');
          // Should not crash the renderer
          expect(container).toBeDefined();
        }
      ),
      { numRuns: 10 } // Less runs since string generation is large
    );
  });

  test('gracefully handles null, undefined, or empty inputs without crashing', () => {
    const { container: containerNull } = render(<MarkdownLite text={null as any} />);
    expect(containerNull.innerHTML).toBe('');

    const { container: containerUndef } = render(<MarkdownLite text={undefined as any} />);
    expect(containerUndef.innerHTML).toBe('');

    const { container: containerEmpty } = render(<MarkdownLite text={""} />);
    expect(containerEmpty.innerHTML).toBe('');
  });
});
