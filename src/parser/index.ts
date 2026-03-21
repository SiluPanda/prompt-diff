import type {
  PromptInput,
  PromptMessage,
  AnthropicPrompt,
  PromptStructure,
  ParseOptions,
} from '../types.js';
import { parsePlainText } from './parse-plain-text.js';
import { parseMessageArray, parseAnthropicPrompt } from './parse-messages.js';
import { readFileSync } from 'node:fs';

/**
 * Parse a prompt input into a PromptStructure.
 *
 * Handles plain text strings, OpenAI message arrays, Anthropic prompt objects,
 * and file paths. Automatically detects format when given a string.
 */
export function parse(
  source: PromptInput,
  options?: ParseOptions,
): PromptStructure {
  // Handle file input
  if (isFileInput(source)) {
    const content = readFileSync(source.file, 'utf-8');
    return parse(content, options);
  }

  // Handle message array
  if (Array.isArray(source)) {
    return parseMessageArray(source as PromptMessage[], options);
  }

  // Handle Anthropic prompt object
  if (isAnthropicPrompt(source)) {
    return parseAnthropicPrompt(source, options);
  }

  // Handle string input
  if (typeof source === 'string') {
    return parseString(source, options);
  }

  // Fallback: treat as string
  return parsePlainText(String(source), options);
}

function parseString(text: string, options?: ParseOptions): PromptStructure {
  // Try parsing as JSON
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);

      // Check for OpenAI message array
      if (Array.isArray(parsed) && parsed.length > 0 && isMessageObject(parsed[0])) {
        return parseMessageArray(parsed as PromptMessage[], options);
      }

      // Check for Anthropic format
      if (isAnthropicPrompt(parsed)) {
        return parseAnthropicPrompt(parsed, options);
      }
    } catch {
      // Not valid JSON, treat as plain text
    }
  }

  return parsePlainText(text, options);
}

function isFileInput(source: PromptInput): source is { file: string } {
  return (
    typeof source === 'object' &&
    source !== null &&
    !Array.isArray(source) &&
    'file' in source &&
    typeof (source as { file: string }).file === 'string'
  );
}

function isAnthropicPrompt(obj: unknown): obj is AnthropicPrompt {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'system' in obj &&
    typeof (obj as AnthropicPrompt).system === 'string' &&
    'messages' in obj &&
    Array.isArray((obj as AnthropicPrompt).messages)
  );
}

function isMessageObject(obj: unknown): boolean {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'role' in obj &&
    'content' in obj &&
    typeof (obj as PromptMessage).role === 'string' &&
    typeof (obj as PromptMessage).content === 'string'
  );
}
