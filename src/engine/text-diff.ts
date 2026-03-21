import type { DiffSegment } from '../types.js';
import { tokenize } from '../utils/text.js';

/**
 * Compute word-level diff between two strings using LCS.
 */
export function computeTextDiff(before: string, after: string): DiffSegment[] {
  const wordsA = tokenize(before);
  const wordsB = tokenize(after);

  if (wordsA.length === 0 && wordsB.length === 0) return [];
  if (wordsA.length === 0) {
    return [{ text: after, type: 'added' }];
  }
  if (wordsB.length === 0) {
    return [{ text: before, type: 'removed' }];
  }

  // Compute LCS
  const lcs = computeLCS(wordsA, wordsB);
  const segments: DiffSegment[] = [];

  let idxA = 0;
  let idxB = 0;

  for (const lcsWord of lcs) {
    // Collect removed words before the LCS word
    const removedWords: string[] = [];
    while (idxA < wordsA.length && wordsA[idxA] !== lcsWord) {
      removedWords.push(wordsA[idxA]);
      idxA++;
    }
    if (removedWords.length > 0) {
      segments.push({ text: removedWords.join(' '), type: 'removed' });
    }

    // Collect added words before the LCS word
    const addedWords: string[] = [];
    while (idxB < wordsB.length && wordsB[idxB] !== lcsWord) {
      addedWords.push(wordsB[idxB]);
      idxB++;
    }
    if (addedWords.length > 0) {
      segments.push({ text: addedWords.join(' '), type: 'added' });
    }

    // The LCS word is unchanged
    segments.push({ text: lcsWord, type: 'unchanged' });
    idxA++;
    idxB++;
  }

  // Remaining words after LCS
  if (idxA < wordsA.length) {
    segments.push({ text: wordsA.slice(idxA).join(' '), type: 'removed' });
  }
  if (idxB < wordsB.length) {
    segments.push({ text: wordsB.slice(idxB).join(' '), type: 'added' });
  }

  // Merge consecutive segments of the same type
  return mergeSegments(segments);
}

/**
 * Compute longest common subsequence of two word arrays.
 */
function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

/**
 * Merge consecutive segments of the same type.
 */
function mergeSegments(segments: DiffSegment[]): DiffSegment[] {
  if (segments.length === 0) return [];

  const merged: DiffSegment[] = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const last = merged[merged.length - 1];
    if (last.type === segments[i].type) {
      last.text += ' ' + segments[i].text;
    } else {
      merged.push({ ...segments[i] });
    }
  }

  return merged;
}
