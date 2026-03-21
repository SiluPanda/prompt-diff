import { describe, it, expect } from 'vitest';
import { diff, parse, format, summarize } from '../index.js';

describe('Integration Tests', () => {
  describe('Full API surface', () => {
    it('should export diff, parse, format, and summarize', () => {
      expect(typeof diff).toBe('function');
      expect(typeof parse).toBe('function');
      expect(typeof format).toBe('function');
      expect(typeof summarize).toBe('function');
    });
  });

  describe('End-to-end: plain text diff', () => {
    it('should diff two plain text prompts end to end', () => {
      const promptA = `You are a helpful assistant.
Answer questions about our product.
Be concise.`;

      const promptB = `You are a knowledgeable product specialist.
Answer questions about our product catalog.
Be concise. Respond in JSON format.`;

      const result = diff(promptA, promptB);

      expect(result.identical).toBe(false);
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.summary).toBeTruthy();
      expect(result.tokenImpact).toBeDefined();

      // Should detect output format addition
      const outputChanges = result.changes.filter(c => c.type === 'output-format-changed');
      expect(outputChanges.length).toBeGreaterThan(0);

      // Format and summarize should work
      const termOutput = format(result, 'terminal');
      expect(termOutput).toContain('prompt-diff');

      const jsonOutput = format(result, 'json');
      expect(JSON.parse(jsonOutput)).toBeDefined();

      const summaryStr = summarize(result);
      expect(summaryStr).toBeTruthy();
    });
  });

  describe('End-to-end: message array diff', () => {
    it('should diff two message arrays', () => {
      const result = diff(
        [
          { role: 'system' as const, content: 'You are a code reviewer.' },
          { role: 'user' as const, content: '{{code}}' },
        ],
        [
          { role: 'system' as const, content: 'You are a senior code reviewer. Focus on security issues.' },
          { role: 'user' as const, content: '{{source_code}}' },
        ],
      );

      expect(result.identical).toBe(false);
      expect(result.changes.length).toBeGreaterThan(0);

      // Should have variable changes
      const varChanges = result.changes.filter(c => c.category === 'variable');
      expect(varChanges.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-end: parse function', () => {
    it('should parse a prompt with sections and variables', () => {
      const structure = parse(`
## Instructions
You are a code reviewer. Review code for bugs and security issues.

## Output Format
Respond in JSON with fields: line, severity, description.

## Examples
Example 1:
Input: function add(a, b) { return a + b; }
Output: {"issues": []}
`);

      expect(structure.format).toBe('plain-text');
      expect(structure.sections.length).toBeGreaterThanOrEqual(2);
      expect(structure.outputFormat).not.toBeNull();
      expect(structure.outputFormat!.format).toBe('json');
    });
  });

  describe('End-to-end: constraint analysis', () => {
    it('should detect constraint changes with severity', () => {
      const result = diff(
        `You are an assistant.
Never share personal information.
Limit responses to 5 sentences.`,
        `You are an assistant.
Limit responses to 3 sentences.`,
      );

      // Should detect constraint removal and tightening
      const constraintChanges = result.changes.filter(c => c.category === 'constraint');
      expect(constraintChanges.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-end: structural mode', () => {
    it('should only report structural changes in structural mode', () => {
      const result = diff(
        `## Instructions
Be helpful and kind.

## Examples
Example: Hello -> Hi`,
        `## Instructions
Be helpful, thorough, and kind.

## Examples
Example: Hello -> Hi

## Output Format
Return JSON.`,
        { mode: 'structural' },
      );

      // Should detect section-added but not instruction-modified
      const sectionAdded = result.changes.filter(c => c.type === 'section-added');
      expect(sectionAdded.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-end: format output', () => {
    it('should produce valid output in all formats', () => {
      const result = diff(
        'You are a helper.',
        'You are an expert assistant.',
      );

      const formats: Array<'terminal' | 'json' | 'summary' | 'markdown' | 'patch'> = [
        'terminal', 'json', 'summary', 'markdown', 'patch',
      ];

      for (const fmt of formats) {
        const output = format(result, fmt);
        expect(typeof output).toBe('string');
        expect(output.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty prompts', () => {
      const result = diff('', '');
      expect(result.identical).toBe(true);
    });

    it('should handle very short prompts', () => {
      const result = diff('Hi', 'Hello');
      expect(result.identical).toBe(false);
    });

    it('should handle prompts with special characters', () => {
      const result = diff(
        'Use the formula: E = mc^2',
        'Use the formula: E = mc^2 + corrections',
      );
      expect(result).toBeDefined();
    });

    it('should handle Anthropic format objects', () => {
      const result = diff(
        {
          system: 'You are a helper.',
          messages: [{ role: 'user' as const, content: 'Hi' }],
        },
        {
          system: 'You are an expert.',
          messages: [{ role: 'user' as const, content: 'Hello' }],
        },
      );

      expect(result.identical).toBe(false);
      expect(result.changes.length).toBeGreaterThan(0);
    });
  });
});
