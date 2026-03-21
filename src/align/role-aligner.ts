import type { RoleBlock } from '../types.js';

export interface RoleAlignment {
  matched: Array<{ a: RoleBlock; b: RoleBlock; indexA: number; indexB: number }>;
  removedFromA: Array<{ role: RoleBlock; index: number }>;
  addedInB: Array<{ role: RoleBlock; index: number }>;
}

/**
 * Align roles between two prompt structures by role identifier.
 */
export function alignRoles(rolesA: RoleBlock[], rolesB: RoleBlock[]): RoleAlignment {
  const matched: RoleAlignment['matched'] = [];
  const usedB = new Set<number>();

  // Match by role identifier
  for (let i = 0; i < rolesA.length; i++) {
    const roleA = rolesA[i];
    let bestMatch = -1;

    for (let j = 0; j < rolesB.length; j++) {
      if (usedB.has(j)) continue;
      if (rolesB[j].role === roleA.role) {
        bestMatch = j;
        break;
      }
    }

    if (bestMatch !== -1) {
      matched.push({
        a: roleA,
        b: rolesB[bestMatch],
        indexA: i,
        indexB: bestMatch,
      });
      usedB.add(bestMatch);
    }
  }

  const matchedAIndices = new Set(matched.map(m => m.indexA));
  const removedFromA = rolesA
    .map((role, index) => ({ role, index }))
    .filter(r => !matchedAIndices.has(r.index));

  const addedInB = rolesB
    .map((role, index) => ({ role, index }))
    .filter(r => !usedB.has(r.index));

  return { matched, removedFromA, addedInB };
}
