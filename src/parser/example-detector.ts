import type { ExampleBlock, SingleExample } from '../types.js';

/**
 * Detect few-shot example blocks in text.
 */
export function detectExamples(
  text: string,
  baseOffset: number,
  sectionIndex: number | null,
): ExampleBlock[] {
  const blocks: ExampleBlock[] = [];

  // Look for labeled example sections
  const exampleSectionRegex = /(?:^|\n)(examples?|few-shot examples?)\s*:\s*\n([\s\S]*?)(?=\n(?:#{1,3}\s|[A-Z][a-z]+\s*:|$))/gi;
  let match: RegExpExecArray | null;

  while ((match = exampleSectionRegex.exec(text)) !== null) {
    const content = match[2].trim();
    if (content) {
      const examples = parseExamples(content);
      blocks.push({
        content,
        examples,
        startOffset: match.index + baseOffset,
        endOffset: match.index + match[0].length + baseOffset,
        sectionIndex,
      });
    }
  }

  if (blocks.length > 0) return blocks;

  // Look for numbered example patterns: Example 1:, 1., 1)
  const numberedExampleRegex = /(?:example\s*\d+\s*:|^\d+[.)]\s)/gim;
  const examplePositions: number[] = [];

  while ((match = numberedExampleRegex.exec(text)) !== null) {
    examplePositions.push(match.index);
  }

  if (examplePositions.length >= 2) {
    // Treat the range containing all numbered examples as an example block
    const startPos = examplePositions[0];
    const endPos = text.length;
    const content = text.slice(startPos, endPos).trim();
    const examples = parseNumberedExamples(content);

    if (examples.length > 0) {
      blocks.push({
        content,
        examples,
        startOffset: startPos + baseOffset,
        endOffset: endPos + baseOffset,
        sectionIndex,
      });
    }
  }

  // Look for Input:/Output: pairs
  if (blocks.length === 0) {
    const ioPattern = /(?:input|q)\s*:\s*([\s\S]*?)(?:output|a)\s*:\s*([\s\S]*?)(?=(?:input|q)\s*:|$)/gi;
    const ioExamples: SingleExample[] = [];
    let idx = 0;
    let firstStart = -1;
    let lastEnd = 0;

    while ((match = ioPattern.exec(text)) !== null) {
      if (firstStart === -1) firstStart = match.index;
      lastEnd = match.index + match[0].length;

      ioExamples.push({
        input: match[1].trim(),
        output: match[2].trim(),
        text: match[0].trim(),
        index: idx++,
      });
    }

    if (ioExamples.length > 0 && firstStart !== -1) {
      blocks.push({
        content: text.slice(firstStart, lastEnd).trim(),
        examples: ioExamples,
        startOffset: firstStart + baseOffset,
        endOffset: lastEnd + baseOffset,
        sectionIndex,
      });
    }
  }

  return blocks;
}

function parseExamples(content: string): SingleExample[] {
  const examples: SingleExample[] = [];

  // Try to split by numbered patterns
  const parts = content.split(/(?=example\s*\d+\s*:|\d+[.)]\s)/i).filter(p => p.trim());

  if (parts.length > 0) {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;

      const ioMatch = part.match(/(?:input|q)\s*:\s*([\s\S]*?)(?:output|a)\s*:\s*([\s\S]*)/i);

      examples.push({
        input: ioMatch ? ioMatch[1].trim() : null,
        output: ioMatch ? ioMatch[2].trim() : null,
        text: part,
        index: i,
      });
    }
  }

  if (examples.length === 0) {
    // Treat the entire content as a single example
    examples.push({
      input: null,
      output: null,
      text: content,
      index: 0,
    });
  }

  return examples;
}

function parseNumberedExamples(content: string): SingleExample[] {
  const examples: SingleExample[] = [];
  const parts = content.split(/(?=example\s*\d+\s*:|\n\d+[.)]\s)/i).filter(p => p.trim());

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    const ioMatch = part.match(/(?:input|q)\s*:\s*([\s\S]*?)(?:output|a)\s*:\s*([\s\S]*)/i);

    examples.push({
      input: ioMatch ? ioMatch[1].trim() : null,
      output: ioMatch ? ioMatch[2].trim() : null,
      text: part,
      index: i,
    });
  }

  return examples;
}
