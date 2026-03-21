import { describe, it, expect } from 'vitest';
import { diff } from '../engine/index.js';
import { format } from '../formatters/index.js';

describe('Formatters', () => {
  const result = diff(
    'You are a helpful assistant. Be concise.',
    'You are a knowledgeable specialist. Be detailed and thorough.',
  );

  describe('Terminal format', () => {
    it('should produce terminal output with ANSI codes', () => {
      const output = format(result, 'terminal');
      expect(output).toContain('prompt-diff');
      expect(output).toContain('Mode:');
      expect(typeof output).toBe('string');
    });

    it('should show "No differences" for identical prompts', () => {
      const identical = diff('same', 'same');
      const output = format(identical, 'terminal');
      expect(output).toContain('No differences');
    });
  });

  describe('JSON format', () => {
    it('should produce valid JSON', () => {
      const output = format(result, 'json');
      const parsed = JSON.parse(output);
      expect(parsed.identical).toBe(false);
      expect(parsed.changes).toBeDefined();
      expect(Array.isArray(parsed.changes)).toBe(true);
    });

    it('should include summary and tokenImpact', () => {
      const output = format(result, 'json');
      const parsed = JSON.parse(output);
      expect(parsed.summary).toBeTruthy();
      expect(parsed.tokenImpact).toBeDefined();
      expect(typeof parsed.tokenImpact.net).toBe('number');
    });

    it('should not include structures by default', () => {
      const output = format(result, 'json');
      const parsed = JSON.parse(output);
      expect(parsed.structureA).toBeUndefined();
      expect(parsed.structureB).toBeUndefined();
    });
  });

  describe('Summary format', () => {
    it('should produce one-line-per-change output', () => {
      const output = format(result, 'summary');
      expect(typeof output).toBe('string');
      expect(output.length).toBeGreaterThan(0);
      // Should have severity tags
      expect(output).toMatch(/\[(HIGH|MEDIUM|LOW|NONE)\]/);
    });

    it('should show "No differences" for identical prompts', () => {
      const identical = diff('same', 'same');
      const output = format(identical, 'summary');
      expect(output).toContain('No differences');
    });
  });

  describe('Markdown format', () => {
    it('should produce markdown output', () => {
      const output = format(result, 'markdown');
      expect(output).toContain('## Prompt Diff');
      expect(output).toContain('**');
    });
  });

  describe('Patch format', () => {
    it('should produce patch-like output', () => {
      const output = format(result, 'patch');
      expect(output).toContain('--- prompt A');
      expect(output).toContain('+++ prompt B');
      expect(output).toContain('@@');
    });
  });
});
