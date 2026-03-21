import type {
  PromptInput,
  PromptStructure,
  DiffOptions,
  PromptDiff,
  PromptChange,
  ComparisonMode,
  Severity,
} from '../types.js';
import { parse } from '../parser/index.js';
import { align } from '../align/index.js';
import { computeTextDiff } from './text-diff.js';
import { getCategory, getSeverity, classifyConstraintChange, severityCompare } from './change-classifier.js';
import { calculateTokenImpact, aggregateTokenImpact } from './token-counter.js';
import { semanticEqual, normalizeText } from '../utils/text.js';
import { jaccardSimilarity } from '../align/similarity.js';

/**
 * Compute a semantic diff between two prompts.
 */
export function diff(
  promptA: PromptInput,
  promptB: PromptInput,
  options?: DiffOptions,
): PromptDiff {
  const startTime = Date.now();
  const mode: ComparisonMode = options?.mode ?? 'semantic';

  // Phase 1: Parse
  const structA = parse(promptA, {
    templateSyntax: options?.templateSyntax,
    customSectionPatterns: options?.customSectionPatterns,
  });
  const structB = parse(promptB, {
    templateSyntax: options?.templateSyntax,
    customSectionPatterns: options?.customSectionPatterns,
  });

  // Quick check for identical prompts
  if (structA.source === structB.source) {
    return buildIdenticalResult(structA, structB, mode, startTime);
  }

  // For semantic mode, check normalized equality
  if (mode === 'semantic' && semanticEqual(structA.source, structB.source)) {
    return buildWhitespaceOnlyResult(structA, structB, mode, startTime);
  }

  // Phase 2: Align
  const alignment = align(structA, structB, options);

  // Phase 3 & 4: Diff and classify
  const changes: PromptChange[] = [];
  const moveThreshold = options?.moveThreshold ?? 0.9;
  const isStructuralOnly = mode === 'structural';

  // --- Role changes ---
  for (const removed of alignment.roles.removedFromA) {
    changes.push(createChange('role-removed', `roles[${removed.index}]`, removed.role.content, null));
  }
  for (const added of alignment.roles.addedInB) {
    changes.push(createChange('role-added', `roles[${added.index}]`, null, added.role.content));
  }
  for (const match of alignment.roles.matched) {
    if (match.a.content !== match.b.content) {
      if (isStructuralOnly) continue;
      if (mode === 'semantic' && semanticEqual(match.a.content, match.b.content)) continue;
      changes.push(createChange(
        'role-content-changed',
        `roles[${match.indexA}]`,
        match.a.content,
        match.b.content,
      ));
    }
  }

  // --- Section changes ---
  for (const section of alignment.sections.removedFromA) {
    changes.push(createChange(
      'section-removed',
      `roles[${section.roleIndex}].sections[${section.positionIndex}]`,
      section.content,
      null,
      section.title,
    ));
  }
  for (const section of alignment.sections.addedInB) {
    changes.push(createChange(
      'section-added',
      `roles[${section.roleIndex}].sections[${section.positionIndex}]`,
      null,
      section.content,
      section.title,
    ));
  }
  for (const match of alignment.sections.matched) {
    if (match.renamed) {
      changes.push(createChange(
        'section-renamed',
        `roles[${match.a.roleIndex}].sections[${match.a.positionIndex}]`,
        match.a.title,
        match.b.title,
      ));
    }
    if (match.moved) {
      const similarity = jaccardSimilarity(match.a.content, match.b.content);
      if (similarity >= moveThreshold) {
        changes.push({
          ...createChange(
            'section-moved',
            `roles[${match.a.roleIndex}].sections[${match.a.positionIndex}]`,
            match.a.content,
            match.b.content,
          ),
          description: `Section "${match.a.title || 'untitled'}" moved from position ${match.a.positionIndex} to ${match.b.positionIndex}`,
        });
      }
    }
    if (match.a.content !== match.b.content && !match.moved) {
      if (isStructuralOnly) continue;
      if (mode === 'semantic' && semanticEqual(match.a.content, match.b.content)) continue;
      changes.push(createChange(
        'section-modified',
        `roles[${match.a.roleIndex}].sections[${match.a.positionIndex}]`,
        match.a.content,
        match.b.content,
        match.a.title,
      ));
    }
  }

  // --- Variable changes ---
  for (const v of alignment.variables.removedFromA) {
    changes.push(createChange('variable-removed', `variables.${v.name}`, v.name, null));
  }
  for (const v of alignment.variables.addedInB) {
    changes.push(createChange('variable-added', `variables.${v.name}`, null, v.name));
  }
  for (const r of alignment.variables.renamed) {
    changes.push({
      ...createChange('variable-renamed', `variables.${r.a.name}`, r.a.name, r.b.name),
      description: `Variable {{${r.a.name}}} renamed to {{${r.b.name}}}`,
    });
  }

  // --- Example changes ---
  for (const ex of alignment.examples.removedFromA) {
    changes.push(createChange('example-removed', 'examples', ex.content, null));
  }
  for (const ex of alignment.examples.addedInB) {
    changes.push(createChange('example-added', 'examples', null, ex.content));
  }
  for (const match of alignment.examples.matched) {
    if (match.a.content !== match.b.content) {
      if (isStructuralOnly) continue;
      if (mode === 'semantic' && semanticEqual(match.a.content, match.b.content)) continue;
      changes.push(createChange('example-modified', 'examples', match.a.content, match.b.content));
    }
  }

  // --- Instruction changes ---
  for (const inst of alignment.instructions.removedFromA) {
    changes.push(createChange('instruction-removed', 'instructions', inst.text, null));
  }
  for (const inst of alignment.instructions.addedInB) {
    changes.push(createChange('instruction-added', 'instructions', null, inst.text));
  }
  for (const match of alignment.instructions.matched) {
    if (match.a.text !== match.b.text) {
      if (isStructuralOnly) continue;
      if (mode === 'semantic' && semanticEqual(match.a.text, match.b.text)) continue;
      changes.push(createChange('instruction-modified', 'instructions', match.a.text, match.b.text));
    }
  }

  // --- Constraint changes ---
  for (const c of alignment.constraints.removedFromA) {
    changes.push(createChange('constraint-removed', 'constraints', c.text, null));
  }
  for (const c of alignment.constraints.addedInB) {
    changes.push(createChange('constraint-added', 'constraints', null, c.text));
  }
  for (const match of alignment.constraints.matched) {
    if (match.a.text !== match.b.text) {
      if (isStructuralOnly) continue;
      if (mode === 'semantic' && semanticEqual(match.a.text, match.b.text)) continue;
      const constraintType = classifyConstraintChange(
        match.a.text,
        match.b.text,
        match.a.numericValue,
        match.b.numericValue,
      );
      changes.push(createChange(constraintType, 'constraints', match.a.text, match.b.text));
    }
  }

  // --- Output format changes ---
  const fmtA = structA.outputFormat;
  const fmtB = structB.outputFormat;
  if (fmtA && !fmtB) {
    changes.push(createChange('output-format-changed', 'outputFormat', fmtA.content, null));
  } else if (!fmtA && fmtB) {
    changes.push(createChange('output-format-changed', 'outputFormat', null, fmtB.content));
  } else if (fmtA && fmtB && fmtA.content !== fmtB.content) {
    if (!isStructuralOnly) {
      changes.push(createChange('output-format-changed', 'outputFormat', fmtA.content, fmtB.content));
    }
  }

  // If no structural changes found but text differs, it might be whitespace/formatting only
  if (changes.length === 0 && structA.source !== structB.source) {
    if (normalizeText(structA.source) === normalizeText(structB.source)) {
      changes.push(createChange('whitespace-only', 'root', structA.source, structB.source));
    } else {
      changes.push(createChange('formatting-only', 'root', structA.source, structB.source));
    }
  }

  // Sort by severity (high first), then by path
  changes.sort((a, b) => {
    const sevCmp = severityCompare(a.severity, b.severity);
    if (sevCmp !== 0) return sevCmp;
    return a.path.localeCompare(b.path);
  });

  // Build result
  const tokenImpact = aggregateTokenImpact(
    changes,
    structA.estimatedTokens,
    structB.estimatedTokens,
  );

  const changeCounts: Record<string, number> = {};
  const severityCounts: Record<Severity, number> = { high: 0, medium: 0, low: 0, none: 0 };

  for (const change of changes) {
    changeCounts[change.category] = (changeCounts[change.category] || 0) + 1;
    severityCounts[change.severity]++;
  }

  const durationMs = Date.now() - startTime;

  return {
    identical: changes.length === 0,
    changes,
    summary: buildSummary(changes, tokenImpact),
    tokenImpact,
    mode,
    structureA: structA,
    structureB: structB,
    durationMs,
    timestamp: new Date().toISOString(),
    changeCounts,
    severityCounts,
  };
}

function createChange(
  type: PromptChange['type'],
  path: string,
  before: string | null,
  after: string | null,
  contextTitle?: string | null,
): PromptChange {
  const category = getCategory(type);
  const severity = getSeverity(type);
  const textDiff = before && after ? computeTextDiff(before, after) : null;
  const { tokensAdded, tokensRemoved } = calculateTokenImpact(before, after);

  let description = formatDescription(type, before, after, contextTitle);

  return {
    type,
    category,
    severity,
    path,
    before,
    after,
    textDiff,
    tokensAdded,
    tokensRemoved,
    description,
  };
}

function formatDescription(
  type: string,
  before: string | null,
  after: string | null,
  contextTitle?: string | null,
): string {
  const ctx = contextTitle ? ` in "${contextTitle}"` : '';
  const truncate = (s: string, max: number = 60): string =>
    s.length > max ? s.slice(0, max) + '...' : s;

  switch (type) {
    case 'role-added':
      return `Role added${ctx}`;
    case 'role-removed':
      return `Role removed${ctx}`;
    case 'role-content-changed':
      return `Role content changed${ctx}`;
    case 'section-added':
      return `Section "${contextTitle || 'untitled'}" added`;
    case 'section-removed':
      return `Section "${contextTitle || 'untitled'}" removed`;
    case 'section-modified':
      return `Section "${contextTitle || 'untitled'}" modified`;
    case 'section-moved':
      return `Section "${contextTitle || 'untitled'}" moved`;
    case 'section-renamed':
      return `Section renamed from "${before || ''}" to "${after || ''}"`;
    case 'variable-added':
      return `Variable {{${after}}} added`;
    case 'variable-removed':
      return `Variable {{${before}}} removed`;
    case 'variable-renamed':
      return `Variable {{${before}}} renamed to {{${after}}}`;
    case 'example-added':
      return `Example added`;
    case 'example-removed':
      return `Example removed`;
    case 'example-modified':
      return `Example modified`;
    case 'instruction-added':
      return `Instruction added: "${truncate(after || '')}"`;
    case 'instruction-removed':
      return `Instruction removed: "${truncate(before || '')}"`;
    case 'instruction-modified':
      return `Instruction modified: "${truncate(before || '')}" -> "${truncate(after || '')}"`;
    case 'constraint-added':
      return `Constraint added: "${truncate(after || '')}"`;
    case 'constraint-removed':
      return `Constraint removed: "${truncate(before || '')}"`;
    case 'constraint-relaxed':
      return `Constraint relaxed: "${truncate(before || '')}" -> "${truncate(after || '')}"`;
    case 'constraint-tightened':
      return `Constraint tightened: "${truncate(before || '')}" -> "${truncate(after || '')}"`;
    case 'constraint-modified':
      return `Constraint modified: "${truncate(before || '')}" -> "${truncate(after || '')}"`;
    case 'output-format-changed':
      return `Output format changed`;
    case 'whitespace-only':
      return `Whitespace-only changes`;
    case 'formatting-only':
      return `Formatting-only changes`;
    default:
      return `${type}${ctx}`;
  }
}

function buildSummary(changes: PromptChange[], tokenImpact: { net: number }): string {
  if (changes.length === 0) return 'No changes detected.';

  const counts: Record<string, number> = {};
  for (const change of changes) {
    const key = change.type;
    counts[key] = (counts[key] || 0) + 1;
  }

  const parts: string[] = [];
  for (const [type, count] of Object.entries(counts)) {
    const label = type.replace(/-/g, ' ');
    parts.push(`${count} ${label}`);
  }

  const tokenPart = tokenImpact.net >= 0
    ? `+${tokenImpact.net} tokens`
    : `${tokenImpact.net} tokens`;

  return `${changes.length} change${changes.length === 1 ? '' : 's'}: ${parts.join(', ')}. Token impact: ${tokenPart}.`;
}

function buildIdenticalResult(
  structA: PromptStructure,
  structB: PromptStructure,
  mode: ComparisonMode,
  startTime: number,
): PromptDiff {
  return {
    identical: true,
    changes: [],
    summary: 'No changes detected.',
    tokenImpact: {
      totalAdded: 0,
      totalRemoved: 0,
      net: 0,
      beforeTokens: structA.estimatedTokens,
      afterTokens: structB.estimatedTokens,
    },
    mode,
    structureA: structA,
    structureB: structB,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    changeCounts: {},
    severityCounts: { high: 0, medium: 0, low: 0, none: 0 },
  };
}

function buildWhitespaceOnlyResult(
  structA: PromptStructure,
  structB: PromptStructure,
  mode: ComparisonMode,
  startTime: number,
): PromptDiff {
  // In semantic mode, whitespace-only differences are ignored
  return buildIdenticalResult(structA, structB, mode, startTime);
}
