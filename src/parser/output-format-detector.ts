import type { OutputFormatSpec } from '../types.js';

/**
 * Detect output format specifications in text.
 */
export function detectOutputFormat(
  text: string,
  baseOffset: number,
): OutputFormatSpec | null {
  // Look for explicit format instructions
  const jsonPatterns = [
    /respond\s+in\s+json/i,
    /return\s+(?:a\s+)?json/i,
    /format\s+(?:your\s+)?(?:response|output)\s+as\s+json/i,
    /output\s+(?:in\s+)?json/i,
    /json\s+format/i,
    /```json/i,
  ];

  const yamlPatterns = [
    /respond\s+in\s+yaml/i,
    /return\s+(?:a\s+)?yaml/i,
    /format\s+(?:your\s+)?(?:response|output)\s+as\s+yaml/i,
    /yaml\s+format/i,
    /```yaml/i,
  ];

  const markdownPatterns = [
    /respond\s+in\s+markdown/i,
    /format\s+(?:your\s+)?(?:response|output)\s+as\s+markdown/i,
    /markdown\s+format/i,
    /use\s+markdown/i,
  ];

  const csvPatterns = [
    /respond\s+in\s+csv/i,
    /csv\s+format/i,
    /format\s+(?:your\s+)?(?:response|output)\s+as\s+csv/i,
  ];

  const xmlPatterns = [
    /respond\s+in\s+xml/i,
    /xml\s+format/i,
    /format\s+(?:your\s+)?(?:response|output)\s+as\s+xml/i,
  ];

  // Check for output format sections
  const outputSectionRegex = /(?:^|\n)(?:#{1,3}\s+)?(?:output\s+format|response\s+format|expected\s+output|output)\s*:?\s*\n([\s\S]*?)(?=\n#{1,3}\s|\n[A-Z][a-z]+\s*:|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = outputSectionRegex.exec(text)) !== null) {
    const content = match[1]?.trim() || match[0].trim();
    const format = detectFormatType(content);
    return {
      format,
      content,
      startOffset: match.index + baseOffset,
      endOffset: match.index + match[0].length + baseOffset,
    };
  }

  // Check for inline format instructions
  for (const pattern of jsonPatterns) {
    match = pattern.exec(text);
    if (match) {
      return buildFormatSpec('json', text, match, baseOffset);
    }
  }

  for (const pattern of yamlPatterns) {
    match = pattern.exec(text);
    if (match) {
      return buildFormatSpec('yaml', text, match, baseOffset);
    }
  }

  for (const pattern of markdownPatterns) {
    match = pattern.exec(text);
    if (match) {
      return buildFormatSpec('markdown', text, match, baseOffset);
    }
  }

  for (const pattern of csvPatterns) {
    match = pattern.exec(text);
    if (match) {
      return buildFormatSpec('csv', text, match, baseOffset);
    }
  }

  for (const pattern of xmlPatterns) {
    match = pattern.exec(text);
    if (match) {
      return buildFormatSpec('xml', text, match, baseOffset);
    }
  }

  return null;
}

function buildFormatSpec(
  format: OutputFormatSpec['format'],
  text: string,
  match: RegExpExecArray,
  baseOffset: number,
): OutputFormatSpec {
  // Find the sentence/line containing the format instruction
  const lineStart = text.lastIndexOf('\n', match.index) + 1;
  const lineEnd = text.indexOf('\n', match.index + match[0].length);
  const end = lineEnd === -1 ? text.length : lineEnd;
  const content = text.slice(lineStart, end).trim();

  return {
    format,
    content,
    startOffset: lineStart + baseOffset,
    endOffset: end + baseOffset,
  };
}

function detectFormatType(content: string): OutputFormatSpec['format'] {
  const lower = content.toLowerCase();
  if (lower.includes('json') || /```json/i.test(content)) return 'json';
  if (lower.includes('yaml') || /```yaml/i.test(content)) return 'yaml';
  if (lower.includes('markdown')) return 'markdown';
  if (lower.includes('csv')) return 'csv';
  if (lower.includes('xml')) return 'xml';
  return 'custom';
}
