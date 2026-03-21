import type { Variable } from '../types.js';

export interface VariableAlignment {
  matched: Array<{ a: Variable; b: Variable }>;
  renamed: Array<{ a: Variable; b: Variable }>;
  removedFromA: Variable[];
  addedInB: Variable[];
}

/**
 * Align variables between two prompt structures.
 * Matches by name, then detects renames by positional context.
 */
export function alignVariables(
  varsA: Variable[],
  varsB: Variable[],
  sourceA: string,
  sourceB: string,
): VariableAlignment {
  const matched: VariableAlignment['matched'] = [];
  const renamed: VariableAlignment['renamed'] = [];
  const usedA = new Set<number>();
  const usedB = new Set<number>();

  // Pass 1: Exact name matching
  for (let i = 0; i < varsA.length; i++) {
    for (let j = 0; j < varsB.length; j++) {
      if (usedB.has(j)) continue;
      if (varsA[i].name === varsB[j].name) {
        matched.push({ a: varsA[i], b: varsB[j] });
        usedA.add(i);
        usedB.add(j);
        break;
      }
    }
  }

  // Pass 2: Rename detection using surrounding context
  const unmatchedA = varsA.filter((_, i) => !usedA.has(i));
  const unmatchedB = varsB.filter((_, j) => !usedB.has(j));

  for (const varA of unmatchedA) {
    for (const varB of unmatchedB) {
      if (usedB.has(varsB.indexOf(varB))) continue;

      // Check if surrounding context matches
      if (hasSimilarContext(varA, varB, sourceA, sourceB)) {
        renamed.push({ a: varA, b: varB });
        usedA.add(varsA.indexOf(varA));
        usedB.add(varsB.indexOf(varB));
        break;
      }
    }
  }

  const removedFromA = varsA.filter((_, i) => !usedA.has(i));
  const addedInB = varsB.filter((_, j) => !usedB.has(j));

  return { matched, renamed, removedFromA, addedInB };
}

/**
 * Check if two variables share similar surrounding context.
 */
function hasSimilarContext(
  varA: Variable,
  varB: Variable,
  sourceA: string,
  sourceB: string,
): boolean {
  if (varA.occurrences.length === 0 || varB.occurrences.length === 0) return false;

  const contextLen = 30;
  const occA = varA.occurrences[0];
  const occB = varB.occurrences[0];

  const beforeA = sourceA.slice(Math.max(0, occA.startOffset - contextLen), occA.startOffset).trim();
  const afterA = sourceA.slice(occA.endOffset, occA.endOffset + contextLen).trim();

  const beforeB = sourceB.slice(Math.max(0, occB.startOffset - contextLen), occB.startOffset).trim();
  const afterB = sourceB.slice(occB.endOffset, occB.endOffset + contextLen).trim();

  // Context is similar if both before and after match
  return beforeA === beforeB && afterA === afterB;
}
