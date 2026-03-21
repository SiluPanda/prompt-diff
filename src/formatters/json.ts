import type { PromptDiff } from '../types.js';

/**
 * Format a PromptDiff as a JSON string.
 * Omits structureA and structureB by default to reduce size.
 */
export function formatJson(result: PromptDiff, includeStructures: boolean = false): string {
  const output: Record<string, unknown> = {
    identical: result.identical,
    changes: result.changes,
    summary: result.summary,
    tokenImpact: result.tokenImpact,
    mode: result.mode,
    durationMs: result.durationMs,
    timestamp: result.timestamp,
    changeCounts: result.changeCounts,
    severityCounts: result.severityCounts,
  };

  if (includeStructures) {
    output.structureA = result.structureA;
    output.structureB = result.structureB;
  }

  return JSON.stringify(output, null, 2);
}
