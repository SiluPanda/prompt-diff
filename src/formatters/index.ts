import type { PromptDiff, OutputFormat } from '../types.js';
import { formatTerminal } from './terminal.js';
import { formatJson } from './json.js';
import { formatSummary } from './summary.js';

/**
 * Format a PromptDiff into the specified output format.
 */
export function format(result: PromptDiff, outputFormat: OutputFormat): string {
  switch (outputFormat) {
    case 'terminal':
      return formatTerminal(result);
    case 'json':
      return formatJson(result);
    case 'summary':
      return formatSummary(result);
    case 'markdown':
      return formatMarkdown(result);
    case 'patch':
      return formatPatch(result);
    default:
      return formatSummary(result);
  }
}

function formatMarkdown(result: PromptDiff): string {
  const lines: string[] = [];

  lines.push('## Prompt Diff');
  lines.push('');

  if (result.identical) {
    lines.push('No differences found.');
    return lines.join('\n');
  }

  const tokenNet = result.tokenImpact.net >= 0
    ? `+${result.tokenImpact.net}`
    : `${result.tokenImpact.net}`;

  lines.push(`**${result.changes.length} change(s)** | Token impact: ${tokenNet} tokens (${result.tokenImpact.beforeTokens} -> ${result.tokenImpact.afterTokens})`);
  lines.push('');

  // Group by severity
  const severities = ['high', 'medium', 'low', 'none'] as const;
  for (const sev of severities) {
    const sevChanges = result.changes.filter(c => c.severity === sev);
    if (sevChanges.length === 0) continue;

    lines.push(`### ${sev.charAt(0).toUpperCase() + sev.slice(1)} Severity`);
    lines.push('');

    for (const change of sevChanges) {
      lines.push(`- **${change.type}**: ${change.description}`);
      if (change.before !== null) {
        lines.push(`  - Before: \`${truncate(change.before, 100)}\``);
      }
      if (change.after !== null) {
        lines.push(`  - After: \`${truncate(change.after, 100)}\``);
      }
    }
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`*Analyzed in ${result.durationMs}ms using ${result.mode} mode*`);

  return lines.join('\n');
}

function formatPatch(result: PromptDiff): string {
  const lines: string[] = [];

  lines.push('--- prompt A');
  lines.push('+++ prompt B');
  lines.push('');

  for (const change of result.changes) {
    lines.push(`@@ ${change.type} ${change.path} @@`);
    if (change.before !== null) {
      for (const line of change.before.split('\n')) {
        lines.push(`-${line}`);
      }
    }
    if (change.after !== null) {
      for (const line of change.after.split('\n')) {
        lines.push(`+${line}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function truncate(text: string, max: number): string {
  const singleLine = text.replace(/\n/g, '\\n');
  return singleLine.length > max ? singleLine.slice(0, max) + '...' : singleLine;
}
