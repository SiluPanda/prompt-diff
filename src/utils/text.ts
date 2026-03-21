/**
 * Normalize text for semantic comparison.
 * Collapses whitespace, trims, and lowercases.
 */
export function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Tokenize text into words by splitting on whitespace and punctuation boundaries.
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

/**
 * Split text into lines, preserving empty lines.
 */
export function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

/**
 * Estimate token count using the rough heuristic of chars / 4.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if two strings are equal after whitespace normalization.
 */
export function semanticEqual(a: string, b: string): boolean {
  return normalizeText(a) === normalizeText(b);
}
