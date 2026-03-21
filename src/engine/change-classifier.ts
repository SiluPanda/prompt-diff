import type { ChangeType, ChangeCategory, Severity } from '../types.js';

/**
 * Map change types to their categories.
 */
export function getCategory(type: ChangeType): ChangeCategory {
  if (type.startsWith('role-')) return 'role';
  if (type.startsWith('section-')) return 'section';
  if (type.startsWith('variable-')) return 'variable';
  if (type.startsWith('example-')) return 'example';
  if (type.startsWith('instruction-')) return 'instruction';
  if (type.startsWith('constraint-')) return 'constraint';
  if (type.startsWith('output-format')) return 'output-format';
  return 'formatting';
}

/**
 * Map change types to their severity levels.
 */
export function getSeverity(type: ChangeType): Severity {
  const severityMap: Record<ChangeType, Severity> = {
    'role-added': 'high',
    'role-removed': 'high',
    'role-content-changed': 'medium',
    'section-added': 'medium',
    'section-removed': 'medium',
    'section-modified': 'low',
    'section-moved': 'low',
    'section-renamed': 'low',
    'variable-added': 'medium',
    'variable-removed': 'high',
    'variable-renamed': 'medium',
    'example-added': 'medium',
    'example-removed': 'medium',
    'example-modified': 'medium',
    'instruction-added': 'medium',
    'instruction-removed': 'medium',
    'instruction-modified': 'medium',
    'constraint-added': 'medium',
    'constraint-removed': 'high',
    'constraint-relaxed': 'high',
    'constraint-tightened': 'medium',
    'constraint-modified': 'medium',
    'output-format-changed': 'high',
    'whitespace-only': 'none',
    'formatting-only': 'none',
  };

  return severityMap[type] ?? 'medium';
}

/**
 * Classify a constraint change as relaxed, tightened, or modified.
 */
export function classifyConstraintChange(
  before: string,
  after: string,
  numericBefore: number | null,
  numericAfter: number | null,
): 'constraint-relaxed' | 'constraint-tightened' | 'constraint-modified' {
  // Check numeric limit changes
  if (numericBefore !== null && numericAfter !== null) {
    if (numericAfter > numericBefore) return 'constraint-relaxed';
    if (numericAfter < numericBefore) return 'constraint-tightened';
  }

  const restrictionWords = /\b(only|never|do not|don't|must not|mustn't|cannot|can't|forbidden|prohibited|not allowed|avoid|refrain)\b/gi;

  const beforeRestrictions = (before.match(restrictionWords) || []).length;
  const afterRestrictions = (after.match(restrictionWords) || []).length;

  if (afterRestrictions < beforeRestrictions) return 'constraint-relaxed';
  if (afterRestrictions > beforeRestrictions) return 'constraint-tightened';

  return 'constraint-modified';
}

const SEVERITY_ORDER: Record<Severity, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};

/**
 * Sort order: high severity first, then by path.
 */
export function severityCompare(a: Severity, b: Severity): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}
