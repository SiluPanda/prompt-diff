import type { Section } from '../types.js';
import { jaccardSimilarity } from './similarity.js';

export interface SectionAlignment {
  matched: Array<{
    a: Section;
    b: Section;
    moved: boolean;
    renamed: boolean;
  }>;
  removedFromA: Section[];
  addedInB: Section[];
}

/**
 * Align sections between two role blocks using title matching + content similarity.
 */
export function alignSections(
  sectionsA: Section[],
  sectionsB: Section[],
  threshold: number = 0.6,
): SectionAlignment {
  const matched: SectionAlignment['matched'] = [];
  const usedA = new Set<number>();
  const usedB = new Set<number>();

  // Pass 1: Title matching (case-insensitive)
  for (let i = 0; i < sectionsA.length; i++) {
    if (!sectionsA[i].title) continue;
    const titleA = sectionsA[i].title!.toLowerCase();

    for (let j = 0; j < sectionsB.length; j++) {
      if (usedB.has(j)) continue;
      if (!sectionsB[j].title) continue;
      const titleB = sectionsB[j].title!.toLowerCase();

      if (titleA === titleB) {
        matched.push({
          a: sectionsA[i],
          b: sectionsB[j],
          moved: sectionsA[i].positionIndex !== sectionsB[j].positionIndex,
          renamed: false,
        });
        usedA.add(i);
        usedB.add(j);
        break;
      }
    }
  }

  // Pass 2: Content similarity for unmatched sections
  for (let i = 0; i < sectionsA.length; i++) {
    if (usedA.has(i)) continue;

    let bestMatch = -1;
    let bestScore = 0;

    for (let j = 0; j < sectionsB.length; j++) {
      if (usedB.has(j)) continue;
      const score = jaccardSimilarity(sectionsA[i].content, sectionsB[j].content);
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = j;
      }
    }

    if (bestMatch !== -1) {
      const titleA = sectionsA[i].title?.toLowerCase();
      const titleB = sectionsB[bestMatch].title?.toLowerCase();
      const renamed = titleA !== titleB && !!titleA && !!titleB;

      matched.push({
        a: sectionsA[i],
        b: sectionsB[bestMatch],
        moved: sectionsA[i].positionIndex !== sectionsB[bestMatch].positionIndex,
        renamed,
      });
      usedA.add(i);
      usedB.add(bestMatch);
    }
  }

  const removedFromA = sectionsA.filter((_, i) => !usedA.has(i));
  const addedInB = sectionsB.filter((_, j) => !usedB.has(j));

  return { matched, removedFromA, addedInB };
}
