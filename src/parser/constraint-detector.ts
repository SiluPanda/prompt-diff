import type { Constraint } from '../types.js';

/**
 * Restriction language patterns that indicate constraints.
 */
const CONSTRAINT_PATTERNS = /\b(only|never|do not|don't|must not|mustn't|cannot|can't|at most|no more than|limit to|restrict to|exclusively|at least|no fewer than|maximum|minimum|no longer than|no shorter than|avoid|refrain from|forbidden|prohibited|not allowed)\b/i;

/**
 * Quantitative limit pattern: number followed by limit context.
 */
const NUMERIC_LIMIT_PATTERN = /\b(\d+)\s*(sentence|word|token|paragraph|line|character|item|point|bullet|response|minute|second|example|step|attempt)/i;

/**
 * Detect constraint directives in text.
 */
export function detectConstraints(
  text: string,
  baseOffset: number,
  sectionIndex: number | null,
): Constraint[] {
  const constraints: Constraint[] = [];
  const lines = text.split(/\r?\n/);
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) {
      offset += line.length + 1;
      continue;
    }

    const hasConstraintLang = CONSTRAINT_PATTERNS.test(trimmed);
    const numericMatch = trimmed.match(NUMERIC_LIMIT_PATTERN);

    if (hasConstraintLang || numericMatch) {
      const lineOffset = text.indexOf(line, offset);
      const lineStart = lineOffset + (line.length - line.trimStart().length);

      // Extract numeric value if present
      let numericValue: number | null = null;
      if (numericMatch) {
        numericValue = parseInt(numericMatch[1], 10);
      }

      // Also try to find any number in the constraint text
      if (numericValue === null) {
        const anyNumber = trimmed.match(/\b(\d+)\b/);
        if (anyNumber && hasConstraintLang) {
          numericValue = parseInt(anyNumber[1], 10);
        }
      }

      constraints.push({
        text: trimmed,
        startOffset: lineStart + baseOffset,
        endOffset: lineStart + trimmed.length + baseOffset,
        numericValue,
        sectionIndex,
      });
    }

    offset += line.length + 1;
  }

  return constraints;
}
