import type { TokenImpact, PromptChange } from '../types.js';
import { estimateTokens } from '../utils/text.js';

/**
 * Calculate token impact for a single change.
 */
export function calculateTokenImpact(
  before: string | null,
  after: string | null,
): { tokensAdded: number; tokensRemoved: number } {
  const tokensBefore = before ? estimateTokens(before) : 0;
  const tokensAfter = after ? estimateTokens(after) : 0;

  return {
    tokensAdded: Math.max(0, tokensAfter - tokensBefore),
    tokensRemoved: Math.max(0, tokensBefore - tokensAfter),
  };
}

/**
 * Aggregate token impact across all changes.
 */
export function aggregateTokenImpact(
  changes: PromptChange[],
  beforeTokens: number,
  afterTokens: number,
): TokenImpact {
  let totalAdded = 0;
  let totalRemoved = 0;

  for (const change of changes) {
    totalAdded += change.tokensAdded;
    totalRemoved += change.tokensRemoved;
  }

  return {
    totalAdded,
    totalRemoved,
    net: afterTokens - beforeTokens,
    beforeTokens,
    afterTokens,
  };
}
