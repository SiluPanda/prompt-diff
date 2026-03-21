import type { PromptDiff } from '../types.js';

/**
 * Format a PromptDiff as a one-line-per-change summary.
 */
export function formatSummary(result: PromptDiff): string {
  if (result.identical) {
    return 'No differences found.';
  }

  const lines: string[] = [];

  for (const change of result.changes) {
    const sevTag = `[${change.severity.toUpperCase()}]`;
    lines.push(`${sevTag} ${change.type}: ${change.description}`);
  }

  const tokenNet = result.tokenImpact.net >= 0
    ? `+${result.tokenImpact.net}`
    : `${result.tokenImpact.net}`;

  lines.push('');
  lines.push(`${result.changes.length} total change(s). Token impact: ${tokenNet} tokens.`);

  return lines.join('\n');
}
