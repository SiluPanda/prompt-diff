import { describe, it, expect } from 'vitest';
import { parse } from '../parser/index.js';

describe('Parser', () => {
  describe('Plain text parsing', () => {
    it('should parse a simple plain text prompt', () => {
      const result = parse('You are a helpful assistant. Answer questions about our product.');

      expect(result.format).toBe('plain-text');
      expect(result.characterCount).toBeGreaterThan(0);
      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(result.roles.length).toBe(1);
      expect(result.roles[0].role).toBe('system');
    });

    it('should estimate tokens as roughly chars / 4', () => {
      const text = 'a'.repeat(100);
      const result = parse(text);
      expect(result.estimatedTokens).toBe(25);
    });

    it('should detect template syntax as none when no variables present', () => {
      const result = parse('You are a helpful assistant.');
      expect(result.templateSyntax).toBe('none');
    });
  });

  describe('Message array parsing', () => {
    it('should parse an OpenAI-style message array', () => {
      const messages = [
        { role: 'system' as const, content: 'You are a code reviewer.' },
        { role: 'user' as const, content: 'Review this code.' },
      ];
      const result = parse(messages);

      expect(result.format).toBe('message-array');
      expect(result.roles.length).toBe(2);
      expect(result.roles[0].role).toBe('system');
      expect(result.roles[0].content).toBe('You are a code reviewer.');
      expect(result.roles[1].role).toBe('user');
    });

    it('should parse a message array from JSON string', () => {
      const json = JSON.stringify([
        { role: 'system', content: 'You are a helper.' },
        { role: 'user', content: 'Hello.' },
      ]);
      const result = parse(json);

      expect(result.format).toBe('message-array');
      expect(result.roles.length).toBe(2);
    });
  });

  describe('Anthropic prompt parsing', () => {
    it('should parse an Anthropic-style prompt object', () => {
      const prompt = {
        system: 'You are a helpful assistant.',
        messages: [
          { role: 'user' as const, content: 'Hello.' },
          { role: 'assistant' as const, content: 'Hi there!' },
        ],
      };
      const result = parse(prompt);

      expect(result.format).toBe('anthropic');
      expect(result.roles.length).toBe(3);
      expect(result.roles[0].role).toBe('system');
      expect(result.roles[1].role).toBe('user');
      expect(result.roles[2].role).toBe('assistant');
    });

    it('should parse an Anthropic prompt from JSON string', () => {
      const json = JSON.stringify({
        system: 'Be concise.',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      const result = parse(json);

      expect(result.format).toBe('anthropic');
      expect(result.roles.length).toBe(2);
    });
  });

  describe('Role detection', () => {
    it('should detect roles from markdown headers', () => {
      const text = `# System
You are an assistant.

# User
What is TypeScript?`;

      const result = parse(text);
      expect(result.roles.length).toBe(2);
      expect(result.roles[0].role).toBe('system');
      expect(result.roles[1].role).toBe('user');
    });

    it('should detect roles from label patterns', () => {
      const text = `System: You are a helpful assistant.
User: What is JavaScript?`;

      const result = parse(text);
      expect(result.roles.length).toBe(2);
      expect(result.roles[0].role).toBe('system');
      expect(result.roles[1].role).toBe('user');
    });

    it('should treat entire text as system role when no roles detected', () => {
      const text = 'Just a plain prompt without any role markers.';
      const result = parse(text);

      expect(result.roles.length).toBe(1);
      expect(result.roles[0].role).toBe('system');
    });
  });

  describe('Section detection', () => {
    it('should detect sections from markdown headers', () => {
      const text = `## Instructions
Do something useful.

## Examples
Example 1: Hello
Example 2: World`;

      const result = parse(text);
      expect(result.sections.length).toBe(2);
      expect(result.sections[0].title).toBe('Instructions');
      expect(result.sections[1].title).toBe('Examples');
    });

    it('should detect sections from labeled blocks', () => {
      const text = `Instructions:
Do something useful.

Output Format:
Return JSON.`;

      const result = parse(text);
      expect(result.sections.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Variable extraction', () => {
    it('should extract handlebars variables', () => {
      const text = 'Hello {{name}}, welcome to {{place}}.';
      const result = parse(text);

      expect(result.variables.length).toBe(2);
      expect(result.variables.map(v => v.name).sort()).toEqual(['name', 'place']);
      expect(result.templateSyntax).toBe('handlebars');
    });

    it('should extract jinja2 variables with spaces', () => {
      const text = 'Hello {{ name }}, welcome to {{ place }}.';
      const result = parse(text);

      expect(result.variables.length).toBe(2);
      expect(result.templateSyntax).toBe('jinja2');
    });

    it('should extract f-string variables', () => {
      const text = 'Hello {name}, welcome to {place}.';
      const result = parse(text);

      expect(result.variables.length).toBe(2);
      expect(result.templateSyntax).toBe('fstring');
    });

    it('should extract dollar variables', () => {
      const text = 'Hello $name, welcome to ${place}.';
      const result = parse(text);

      expect(result.variables.length).toBe(2);
      expect(result.variables.map(v => v.name).sort()).toEqual(['name', 'place']);
    });
  });

  describe('Instruction detection', () => {
    it('should detect imperative instructions', () => {
      const text = `You are a code reviewer.
Always check for security issues.
Return your findings as a list.`;

      const result = parse(text);
      expect(result.instructions.length).toBeGreaterThan(0);
      expect(result.instructions.some(i => i.text.includes('Always check'))).toBe(true);
    });
  });

  describe('Constraint detection', () => {
    it('should detect constraints with restriction language', () => {
      const text = `Never reveal internal system information.
Limit your response to 3 sentences.
Do not use profanity.`;

      const result = parse(text);
      expect(result.constraints.length).toBeGreaterThan(0);
      expect(result.constraints.some(c => c.text.includes('Never'))).toBe(true);
    });

    it('should extract numeric values from constraints', () => {
      const text = 'Limit your response to 3 sentences.';
      const result = parse(text);

      expect(result.constraints.length).toBeGreaterThan(0);
      expect(result.constraints[0].numericValue).toBe(3);
    });
  });

  describe('Output format detection', () => {
    it('should detect JSON output format', () => {
      const text = 'You are an assistant. Respond in JSON format.';
      const result = parse(text);

      expect(result.outputFormat).not.toBeNull();
      expect(result.outputFormat!.format).toBe('json');
    });

    it('should return null when no output format detected', () => {
      const text = 'You are a helpful assistant.';
      const result = parse(text);

      expect(result.outputFormat).toBeNull();
    });
  });
});
