import type { Variable, TemplateSyntax } from '../types.js';

interface RawOccurrence {
  name: string;
  syntax: Variable['syntax'];
  startOffset: number;
  endOffset: number;
}

/**
 * Extract template variables from text. Supports handlebars, jinja2, fstring, and dollar syntaxes.
 */
export function extractVariables(
  text: string,
  baseOffset: number,
  forceSyntax?: 'auto' | 'handlebars' | 'jinja2' | 'fstring' | 'dollar',
): { variables: Variable[]; detectedSyntax: TemplateSyntax } {
  const occurrences: RawOccurrence[] = [];

  // Handlebars/Mustache: {{variableName}} (no spaces required)
  const handlebarsRegex = /\{\{(\s*\w[\w.]*\s*)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = handlebarsRegex.exec(text)) !== null) {
    const name = match[1].trim();
    const hasSpaces = match[1] !== name;
    occurrences.push({
      name,
      syntax: hasSpaces ? 'jinja2' : 'handlebars',
      startOffset: match.index + baseOffset,
      endOffset: match.index + match[0].length + baseOffset,
    });
  }

  // Dollar: $variableName or ${variableName}
  const dollarRegex = /\$\{(\w[\w.]*)\}|\$(\w[\w.]*)/g;
  while ((match = dollarRegex.exec(text)) !== null) {
    const name = match[1] || match[2];
    occurrences.push({
      name,
      syntax: 'dollar',
      startOffset: match.index + baseOffset,
      endOffset: match.index + match[0].length + baseOffset,
    });
  }

  // f-string: {variableName} (single braces, not double)
  // Only match if we didn't already capture it as handlebars
  const fstringRegex = /(?<!\{)\{(\w[\w.]*)\}(?!\})/g;
  while ((match = fstringRegex.exec(text)) !== null) {
    const name = match[1];
    // Check it's not overlapping with a handlebars match
    const offset = match.index + baseOffset;
    const isOverlap = occurrences.some(
      o => offset >= o.startOffset && offset < o.endOffset,
    );
    if (!isOverlap) {
      occurrences.push({
        name,
        syntax: 'fstring',
        startOffset: offset,
        endOffset: match.index + match[0].length + baseOffset,
      });
    }
  }

  // Filter by forced syntax if specified
  const filtered = forceSyntax && forceSyntax !== 'auto'
    ? occurrences.filter(o => o.syntax === forceSyntax)
    : occurrences;

  // Group by variable name
  const varMap = new Map<string, Variable>();
  for (const occ of filtered) {
    const existing = varMap.get(occ.name);
    if (existing) {
      existing.occurrences.push({
        startOffset: occ.startOffset,
        endOffset: occ.endOffset,
      });
    } else {
      varMap.set(occ.name, {
        name: occ.name,
        syntax: occ.syntax,
        occurrences: [{
          startOffset: occ.startOffset,
          endOffset: occ.endOffset,
        }],
      });
    }
  }

  // Detect dominant syntax
  const syntaxCounts: Record<string, number> = {};
  for (const occ of filtered) {
    syntaxCounts[occ.syntax] = (syntaxCounts[occ.syntax] || 0) + 1;
  }

  let detectedSyntax: TemplateSyntax = 'none';
  const syntaxKeys = Object.keys(syntaxCounts);
  if (syntaxKeys.length === 1) {
    detectedSyntax = syntaxKeys[0] as TemplateSyntax;
  } else if (syntaxKeys.length > 1) {
    detectedSyntax = 'mixed';
  }

  return {
    variables: Array.from(varMap.values()),
    detectedSyntax,
  };
}
