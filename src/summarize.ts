import type { PromptDiff } from './types.js';

/**
 * Returns a concise human-readable summary of the changes.
 * Suitable for changelog entries, commit messages, or notification text.
 */
export function summarize(result: PromptDiff): string {
  if (result.identical) {
    return 'No changes detected.';
  }

  const counts: Record<string, number> = {};
  for (const change of result.changes) {
    const key = change.type;
    counts[key] = (counts[key] || 0) + 1;
  }

  const parts: string[] = [];
  for (const [type, count] of Object.entries(counts)) {
    const label = type.replace(/-/g, ' ');
    parts.push(`${count} ${label}`);
  }

  // Add specific details for renames
  const renames = result.changes.filter(c => c.type === 'variable-renamed');
  const renameDetails = renames.map(r => `{{${r.before}}} -> {{${r.after}}}`);
  if (renameDetails.length > 0) {
    parts.push(`(${renameDetails.join(', ')})`);
  }

  const tokenNet = result.tokenImpact.net >= 0
    ? `+${result.tokenImpact.net}`
    : `${result.tokenImpact.net}`;

  return `${result.changes.length} change${result.changes.length === 1 ? '' : 's'}: ${parts.join(', ')}. Token impact: ${tokenNet} tokens.`;
}
