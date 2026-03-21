import type { ExampleBlock } from '../types.js';

export interface ExampleAlignment {
  matched: Array<{ a: ExampleBlock; b: ExampleBlock }>;
  removedFromA: ExampleBlock[];
  addedInB: ExampleBlock[];
}

/**
 * Align example blocks using index-based alignment.
 */
export function alignExamples(
  examplesA: ExampleBlock[],
  examplesB: ExampleBlock[],
): ExampleAlignment {
  const matched: ExampleAlignment['matched'] = [];
  const minLen = Math.min(examplesA.length, examplesB.length);

  for (let i = 0; i < minLen; i++) {
    matched.push({ a: examplesA[i], b: examplesB[i] });
  }

  const removedFromA = examplesA.slice(minLen);
  const addedInB = examplesB.slice(minLen);

  return { matched, removedFromA, addedInB };
}
