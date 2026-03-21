import type { Instruction, Constraint } from '../types.js';
import { normalizedSimilarity } from './similarity.js';

export interface InstructionAlignment {
  matched: Array<{ a: Instruction; b: Instruction }>;
  removedFromA: Instruction[];
  addedInB: Instruction[];
}

export interface ConstraintAlignment {
  matched: Array<{ a: Constraint; b: Constraint }>;
  removedFromA: Constraint[];
  addedInB: Constraint[];
}

/**
 * Align instructions using normalized text similarity.
 */
export function alignInstructions(
  instructionsA: Instruction[],
  instructionsB: Instruction[],
  threshold: number = 0.5,
): InstructionAlignment {
  const matched: InstructionAlignment['matched'] = [];
  const usedA = new Set<number>();
  const usedB = new Set<number>();

  // Pass 1: Exact matches
  for (let i = 0; i < instructionsA.length; i++) {
    for (let j = 0; j < instructionsB.length; j++) {
      if (usedB.has(j)) continue;
      if (instructionsA[i].text === instructionsB[j].text) {
        matched.push({ a: instructionsA[i], b: instructionsB[j] });
        usedA.add(i);
        usedB.add(j);
        break;
      }
    }
  }

  // Pass 2: Near-matches by similarity
  for (let i = 0; i < instructionsA.length; i++) {
    if (usedA.has(i)) continue;

    let bestMatch = -1;
    let bestScore = 0;

    for (let j = 0; j < instructionsB.length; j++) {
      if (usedB.has(j)) continue;
      const score = normalizedSimilarity(instructionsA[i].text, instructionsB[j].text);
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = j;
      }
    }

    if (bestMatch !== -1) {
      matched.push({ a: instructionsA[i], b: instructionsB[bestMatch] });
      usedA.add(i);
      usedB.add(bestMatch);
    }
  }

  const removedFromA = instructionsA.filter((_, i) => !usedA.has(i));
  const addedInB = instructionsB.filter((_, j) => !usedB.has(j));

  return { matched, removedFromA, addedInB };
}

/**
 * Align constraints using normalized text similarity.
 */
export function alignConstraints(
  constraintsA: Constraint[],
  constraintsB: Constraint[],
  threshold: number = 0.7,
): ConstraintAlignment {
  const matched: ConstraintAlignment['matched'] = [];
  const usedA = new Set<number>();
  const usedB = new Set<number>();

  // Pass 1: Exact matches
  for (let i = 0; i < constraintsA.length; i++) {
    for (let j = 0; j < constraintsB.length; j++) {
      if (usedB.has(j)) continue;
      if (constraintsA[i].text === constraintsB[j].text) {
        matched.push({ a: constraintsA[i], b: constraintsB[j] });
        usedA.add(i);
        usedB.add(j);
        break;
      }
    }
  }

  // Pass 2: Near-matches
  for (let i = 0; i < constraintsA.length; i++) {
    if (usedA.has(i)) continue;

    let bestMatch = -1;
    let bestScore = 0;

    for (let j = 0; j < constraintsB.length; j++) {
      if (usedB.has(j)) continue;
      const score = normalizedSimilarity(constraintsA[i].text, constraintsB[j].text);
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = j;
      }
    }

    if (bestMatch !== -1) {
      matched.push({ a: constraintsA[i], b: constraintsB[bestMatch] });
      usedA.add(i);
      usedB.add(bestMatch);
    }
  }

  const removedFromA = constraintsA.filter((_, i) => !usedA.has(i));
  const addedInB = constraintsB.filter((_, j) => !usedB.has(j));

  return { matched, removedFromA, addedInB };
}
