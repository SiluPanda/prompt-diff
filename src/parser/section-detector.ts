import type { Section, SectionPattern } from '../types.js';

interface RawSection {
  title: string | null;
  type: Section['type'];
  content: string;
  startOffset: number;
  endOffset: number;
}

/**
 * Detect sections within a text block using headers, XML tags, labels, and separators.
 */
export function detectSections(
  text: string,
  baseOffset: number,
  roleIndex: number,
  customPatterns?: SectionPattern[],
): Section[] {
  const markers: Array<{
    title: string | null;
    type: Section['type'];
    markerStart: number;
    contentStart: number;
  }> = [];

  // Markdown headers: #, ##, ###
  const headerRegex = /^(#{1,3})\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = headerRegex.exec(text)) !== null) {
    markers.push({
      title: match[2].trim(),
      type: 'header',
      markerStart: match.index,
      contentStart: match.index + match[0].length,
    });
  }

  // XML tags: <instructions>, <examples>, <context>, <output>, <rules>, <constraints>
  const xmlSectionRegex = /<(instructions|examples|context|output|rules|constraints|system|user|assistant)>([\s\S]*?)<\/\1>/gi;
  while ((match = xmlSectionRegex.exec(text)) !== null) {
    markers.push({
      title: match[1].toLowerCase(),
      type: 'xml-tag',
      markerStart: match.index,
      contentStart: match.index + match[1].length + 2, // skip <tag>
    });
  }

  // Labeled blocks: Instructions:, Output Format:, Examples:, Context:, Rules:, Constraints:
  const labelRegex = /^(instructions|output\s*format|examples?|context|rules|constraints|guidelines|requirements)\s*:\s*$/gim;
  while ((match = labelRegex.exec(text)) !== null) {
    markers.push({
      title: match[1].trim(),
      type: 'label',
      markerStart: match.index,
      contentStart: match.index + match[0].length,
    });
  }

  // Horizontal rules: ---, ***, ___
  const hrRegex = /^([-*_]){3,}\s*$/gm;
  while ((match = hrRegex.exec(text)) !== null) {
    markers.push({
      title: null,
      type: 'separator',
      markerStart: match.index,
      contentStart: match.index + match[0].length,
    });
  }

  // Custom patterns
  if (customPatterns) {
    for (const pattern of customPatterns) {
      while ((match = pattern.startPattern.exec(text)) !== null) {
        const title = pattern.titleGroup !== undefined ? match[pattern.titleGroup] : pattern.name;
        markers.push({
          title,
          type: 'label',
          markerStart: match.index,
          contentStart: match.index + match[0].length,
        });
        // Reset lastIndex if the regex is not global
        if (!pattern.startPattern.global) break;
      }
    }
  }

  if (markers.length === 0) {
    return [];
  }

  // Sort markers by position
  markers.sort((a, b) => a.markerStart - b.markerStart);

  // Build sections from markers
  const sections: RawSection[] = [];
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const contentEnd = i + 1 < markers.length
      ? markers[i + 1].markerStart
      : text.length;
    const content = text.slice(marker.contentStart, contentEnd).trim();
    sections.push({
      title: marker.title,
      type: marker.type,
      content,
      startOffset: marker.markerStart,
      endOffset: contentEnd,
    });
  }

  return sections.map((s, idx) => ({
    title: s.title,
    type: s.type,
    content: s.content,
    startOffset: s.startOffset + baseOffset,
    endOffset: s.endOffset + baseOffset,
    roleIndex,
    positionIndex: idx,
  }));
}
