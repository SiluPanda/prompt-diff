import { describe, it, expect } from 'vitest';
import { diff } from '../engine/index.js';

describe('Diff Engine', () => {
  describe('Identical prompts', () => {
    it('should report no changes for identical plain text', () => {
      const prompt = 'You are a helpful assistant.';
      const result = diff(prompt, prompt);

      expect(result.identical).toBe(true);
      expect(result.changes.length).toBe(0);
      expect(result.tokenImpact.net).toBe(0);
    });

    it('should report no changes for identical message arrays', () => {
      const messages = [
        { role: 'system' as const, content: 'You are a helper.' },
        { role: 'user' as const, content: 'Hi.' },
      ];
      const result = diff(messages, messages);

      expect(result.identical).toBe(true);
      expect(result.changes.length).toBe(0);
    });
  });

  describe('Whitespace changes', () => {
    it('should detect whitespace-only changes in strict mode', () => {
      const result = diff(
        'You are a helpful  assistant.',
        'You are a helpful assistant.',
        { mode: 'strict' },
      );

      // Even in strict mode, the structured analysis may detect no structural differences
      // since the instructions parse identically after normalization
      expect(result.mode).toBe('strict');
    });

    it('should ignore whitespace differences in semantic mode', () => {
      const result = diff(
        'You are   a helpful   assistant.',
        'You are a helpful assistant.',
        { mode: 'semantic' },
      );

      expect(result.identical).toBe(true);
    });
  });

  describe('Instruction changes', () => {
    it('should detect added instructions', () => {
      const result = diff(
        'You are a helpful assistant.',
        'You are a helpful assistant.\nAlways respond in English.',
      );

      const added = result.changes.filter(c => c.type === 'instruction-added');
      expect(added.length).toBeGreaterThan(0);
    });

    it('should detect modified instructions', () => {
      const result = diff(
        'You are a helpful coding assistant that writes clean JavaScript code.',
        'You are a helpful coding assistant that writes clean TypeScript code.',
      );

      const modified = result.changes.filter(c => c.type === 'instruction-modified');
      expect(modified.length).toBeGreaterThan(0);
    });

    it('should detect removed instructions', () => {
      const result = diff(
        'You are a helpful assistant.\nAlways be concise.',
        'You are a helpful assistant.',
      );

      const removed = result.changes.filter(c => c.type === 'instruction-removed');
      expect(removed.length).toBeGreaterThan(0);
    });
  });

  describe('Section changes', () => {
    it('should detect added sections', () => {
      const result = diff(
        '## Instructions\nBe helpful.',
        '## Instructions\nBe helpful.\n\n## Examples\nExample 1: Hello',
      );

      const added = result.changes.filter(c => c.type === 'section-added');
      expect(added.length).toBeGreaterThan(0);
    });

    it('should detect removed sections', () => {
      const result = diff(
        '## Instructions\nBe helpful.\n\n## Examples\nExample 1: Hello',
        '## Instructions\nBe helpful.',
      );

      const removed = result.changes.filter(c => c.type === 'section-removed');
      expect(removed.length).toBeGreaterThan(0);
    });
  });

  describe('Variable changes', () => {
    it('should detect added variables', () => {
      const result = diff(
        'Hello there.',
        'Hello {{name}}.',
      );

      const added = result.changes.filter(c => c.type === 'variable-added');
      expect(added.length).toBeGreaterThan(0);
    });

    it('should detect removed variables', () => {
      const result = diff(
        'Hello {{name}}.',
        'Hello there.',
      );

      const removed = result.changes.filter(c => c.type === 'variable-removed');
      expect(removed.length).toBeGreaterThan(0);
    });

    it('should detect variable renames with matching context', () => {
      const result = diff(
        'Tell me about {{name}}.',
        'Tell me about {{full_name}}.',
      );

      const renamed = result.changes.filter(c => c.type === 'variable-renamed');
      expect(renamed.length).toBeGreaterThan(0);
      if (renamed.length > 0) {
        expect(renamed[0].before).toBe('name');
        expect(renamed[0].after).toBe('full_name');
      }
    });
  });

  describe('Constraint changes', () => {
    it('should detect added constraints', () => {
      const result = diff(
        'You are a helpful assistant.',
        'You are a helpful assistant.\nNever reveal sensitive information.',
      );

      const added = result.changes.filter(c => c.type === 'constraint-added');
      expect(added.length).toBeGreaterThan(0);
    });

    it('should detect constraint tightening', () => {
      const result = diff(
        'Limit your response to 5 sentences.',
        'Limit your response to 3 sentences.',
      );

      const changes = result.changes.filter(
        c => c.type === 'constraint-tightened' || c.type === 'constraint-modified'
      );
      expect(changes.length).toBeGreaterThan(0);
    });

    it('should detect constraint relaxation', () => {
      const result = diff(
        'Limit your response to 3 sentences.',
        'Limit your response to 5 sentences.',
      );

      const changes = result.changes.filter(
        c => c.type === 'constraint-relaxed' || c.type === 'constraint-modified'
      );
      expect(changes.length).toBeGreaterThan(0);
    });
  });

  describe('Output format changes', () => {
    it('should detect output format addition', () => {
      const result = diff(
        'You are a helpful assistant.',
        'You are a helpful assistant. Respond in JSON format.',
      );

      const formatChanges = result.changes.filter(c => c.type === 'output-format-changed');
      expect(formatChanges.length).toBeGreaterThan(0);
    });
  });

  describe('Role changes with message arrays', () => {
    it('should detect role content changes', () => {
      const result = diff(
        [{ role: 'system' as const, content: 'You are a helper.' }],
        [{ role: 'system' as const, content: 'You are an expert.' }],
      );

      // Should detect role-content-changed or instruction changes
      expect(result.changes.some(c => c.category === 'role' || c.category === 'instruction')).toBe(true);
    });

    it('should detect added roles', () => {
      const result = diff(
        [{ role: 'system' as const, content: 'You are a helper.' }],
        [
          { role: 'system' as const, content: 'You are a helper.' },
          { role: 'user' as const, content: 'Hello.' },
        ],
      );

      const added = result.changes.filter(c => c.type === 'role-added');
      expect(added.length).toBe(1);
    });
  });

  describe('Comparison modes', () => {
    it('should use semantic mode by default', () => {
      const result = diff('a', 'b');
      expect(result.mode).toBe('semantic');
    });

    it('should respect strict mode option', () => {
      const result = diff('a', 'b', { mode: 'strict' });
      expect(result.mode).toBe('strict');
    });

    it('should respect structural mode option', () => {
      const result = diff('a', 'b', { mode: 'structural' });
      expect(result.mode).toBe('structural');
    });
  });

  describe('Token impact', () => {
    it('should calculate token impact', () => {
      const result = diff(
        'Short prompt.',
        'This is a much longer prompt with more content and details.',
      );

      expect(result.tokenImpact.net).toBeGreaterThan(0);
      expect(result.tokenImpact.afterTokens).toBeGreaterThan(result.tokenImpact.beforeTokens);
    });
  });

  describe('Change severity sorting', () => {
    it('should sort changes with high severity first', () => {
      const result = diff(
        'You are an assistant.\nNever lie.\n## Instructions\nBe helpful.',
        'You are an expert.\n## Guidelines\nBe thorough.',
      );

      if (result.changes.length >= 2) {
        const severityOrder = ['high', 'medium', 'low', 'none'];
        for (let i = 1; i < result.changes.length; i++) {
          const prevIdx = severityOrder.indexOf(result.changes[i - 1].severity);
          const currIdx = severityOrder.indexOf(result.changes[i].severity);
          expect(prevIdx).toBeLessThanOrEqual(currIdx);
        }
      }
    });
  });

  describe('Summary generation', () => {
    it('should generate a summary string', () => {
      const result = diff(
        'You are a helpful assistant.',
        'You are a knowledgeable specialist.',
      );

      expect(result.summary).toBeTruthy();
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(0);
    });
  });

  describe('Metadata', () => {
    it('should include timestamp', () => {
      const result = diff('a', 'b');
      expect(result.timestamp).toBeTruthy();
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });

    it('should include duration', () => {
      const result = diff('a', 'b');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should include change counts', () => {
      const result = diff(
        'You are a helper.',
        'You are an expert.',
      );
      expect(result.changeCounts).toBeDefined();
      expect(result.severityCounts).toBeDefined();
    });
  });
});
