import { normalizeText, tokenize } from '../utils/text.js';

/**
 * Compute Jaccard similarity between two word sets.
 * Returns a value between 0 and 1.
 */
export function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(tokenize(normalizeText(a)));
  const wordsB = new Set(tokenize(normalizeText(b)));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Normalized text similarity using token overlap ratio.
 * More lenient than Jaccard for texts of different lengths.
 */
export function normalizedSimilarity(a: string, b: string): number {
  const setA = new Set(tokenize(normalizeText(a)));
  const setB = new Set(tokenize(normalizeText(b)));

  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  // Average of both coverage ratios (always in [0, 1])
  const coverageA = intersection / setA.size;
  const coverageB = intersection / setB.size;

  return (coverageA + coverageB) / 2;
}
