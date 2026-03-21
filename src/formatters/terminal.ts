import type { PromptDiff } from '../types.js';

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

const SEVERITY_COLORS: Record<string, string> = {
  high: COLORS.red,
  medium: COLORS.yellow,
  low: COLORS.blue,
  none: COLORS.gray,
};

/**
 * Format a PromptDiff as colored terminal output.
 */
export function formatTerminal(result: PromptDiff): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`  ${COLORS.bold}prompt-diff${COLORS.reset}`);
  lines.push('');
  lines.push(`  Mode: ${result.mode}`);
  lines.push('');

  if (result.identical) {
    lines.push(`  ${COLORS.green}No differences found.${COLORS.reset}`);
    lines.push('');
    return lines.join('\n');
  }

  // Summary box
  const highCount = result.severityCounts.high;
  const medCount = result.severityCounts.medium;
  const lowCount = result.severityCounts.low;
  const noneCount = result.severityCounts.none;

  const severityParts: string[] = [];
  if (highCount > 0) severityParts.push(`${highCount} high`);
  if (medCount > 0) severityParts.push(`${medCount} medium`);
  if (lowCount > 0) severityParts.push(`${lowCount} low`);
  if (noneCount > 0) severityParts.push(`${noneCount} none`);

  const tokenNet = result.tokenImpact.net >= 0
    ? `+${result.tokenImpact.net}`
    : `${result.tokenImpact.net}`;

  lines.push(`  ${result.changes.length} change${result.changes.length === 1 ? '' : 's'} (${severityParts.join(', ')} severity)`);
  lines.push(`  Token impact: ${tokenNet} tokens (${result.tokenImpact.beforeTokens} -> ${result.tokenImpact.afterTokens})`);
  lines.push('');

  // Changes
  for (const change of result.changes) {
    const sevColor = SEVERITY_COLORS[change.severity] || COLORS.gray;
    const sevLabel = change.severity.toUpperCase().padEnd(6);

    lines.push(`  ${sevColor}${COLORS.bold}${sevLabel}${COLORS.reset} ${change.type.padEnd(30)} ${COLORS.gray}${change.path}${COLORS.reset}`);

    if (change.before !== null) {
      lines.push(`         ${COLORS.red}- ${truncate(change.before, 80)}${COLORS.reset}`);
    }
    if (change.after !== null) {
      lines.push(`         ${COLORS.green}+ ${truncate(change.after, 80)}${COLORS.reset}`);
    }

    lines.push(`         ${COLORS.gray}${change.description}${COLORS.reset}`);
    lines.push('');
  }

  // Footer
  lines.push(`  ${COLORS.gray}${'─'.repeat(50)}${COLORS.reset}`);
  lines.push(`  ${severityParts.join(', ')} severity changes`);
  lines.push(`  Token impact: ${tokenNet} tokens (${result.tokenImpact.beforeTokens} -> ${result.tokenImpact.afterTokens})`);
  lines.push(`  Analyzed in ${result.durationMs}ms`);
  lines.push('');

  return lines.join('\n');
}

function truncate(text: string, max: number): string {
  const singleLine = text.replace(/\n/g, '\\n');
  return singleLine.length > max ? singleLine.slice(0, max) + '...' : singleLine;
}
