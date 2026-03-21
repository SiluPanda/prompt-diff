import type { Instruction } from '../types.js';

/**
 * Imperative verb patterns that indicate instructions.
 */
const IMPERATIVE_STARTERS = /^(write|generate|analyze|return|always|never|do not|don't|make sure|ensure|you must|you should|you will|you are|provide|create|use|include|output|respond|answer|explain|describe|list|summarize|translate|format|follow|keep|maintain|consider|check|verify|review|evaluate|assess|identify|extract|parse|convert|transform|apply|implement|define|specify|set|configure|enable|disable|avoid|refrain|limit)\b/i;

/**
 * Modal directives that indicate instructions within sentences.
 */
const MODAL_PATTERNS = /\b(must|should|shall|need to|have to|required to|expected to)\b/i;

/**
 * Detect instruction directives in text.
 */
export function detectInstructions(
  text: string,
  baseOffset: number,
  sectionIndex: number | null,
): Instruction[] {
  const instructions: Instruction[] = [];
  const sentences = splitIntoSentences(text);

  for (const sentence of sentences) {
    const trimmed = sentence.text.trim();
    if (!trimmed || trimmed.length < 5) continue;

    const isImperative = IMPERATIVE_STARTERS.test(trimmed);
    const hasModal = MODAL_PATTERNS.test(trimmed);

    if (isImperative || hasModal) {
      instructions.push({
        text: trimmed,
        startOffset: sentence.offset + baseOffset,
        endOffset: sentence.offset + sentence.text.length + baseOffset,
        sectionIndex,
      });
    }
  }

  return instructions;
}

interface SentenceSpan {
  text: string;
  offset: number;
}

function splitIntoSentences(text: string): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  // Split on sentence boundaries (period, exclamation, question mark, newline)
  // Also split on bullet points and numbered items
  const lines = text.split(/\r?\n/);
  let offset = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      offset += line.length + 1; // +1 for newline
      continue;
    }

    // Handle bullet points: -, *, numbered items
    const bulletMatch = trimmedLine.match(/^[-*]\s+|^\d+[.)]\s+/);
    if (bulletMatch) {
      const bulletText = trimmedLine.slice(bulletMatch[0].length);
      const lineOffset = text.indexOf(line, offset);
      const bulletOffset = lineOffset + line.indexOf(trimmedLine) + bulletMatch[0].length;
      if (bulletText.trim()) {
        spans.push({
          text: bulletText.trim(),
          offset: bulletOffset,
        });
      }
    } else {
      // Split line into sentences
      const sentenceRegex = /[^.!?]+[.!?]?/g;
      let sentMatch: RegExpExecArray | null;
      const lineOffset = text.indexOf(line, offset);

      while ((sentMatch = sentenceRegex.exec(trimmedLine)) !== null) {
        const sentText = sentMatch[0].trim();
        if (sentText) {
          spans.push({
            text: sentText,
            offset: lineOffset + line.indexOf(trimmedLine) + sentMatch.index,
          });
        }
      }
    }

    offset += line.length + 1;
  }

  return spans;
}
