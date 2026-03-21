import type { PromptStructure, ParseOptions, Section, Instruction, Constraint, ExampleBlock } from '../types.js';
import { estimateTokens } from '../utils/text.js';
import { detectRoles } from './role-detector.js';
import { detectSections } from './section-detector.js';
import { extractVariables } from './variable-extractor.js';
import { detectInstructions } from './instruction-detector.js';
import { detectConstraints } from './constraint-detector.js';
import { detectExamples } from './example-detector.js';
import { detectOutputFormat } from './output-format-detector.js';

/**
 * Parse a plain text prompt into a PromptStructure.
 */
export function parsePlainText(
  text: string,
  options?: ParseOptions,
): PromptStructure {
  // Detect roles
  const roles = detectRoles(text);

  // Detect sections within each role
  const allSections: Section[] = [];
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    const sections = detectSections(
      role.content,
      role.startOffset,
      i,
      options?.customSectionPatterns,
    );
    role.sections = sections;
    allSections.push(...sections);
  }

  // Extract variables
  const { variables, detectedSyntax } = extractVariables(
    text,
    0,
    options?.templateSyntax,
  );

  // Detect instructions and constraints across all content
  const allInstructions: Instruction[] = [];
  const allConstraints: Constraint[] = [];
  const allExamples: ExampleBlock[] = [];

  // If we have sections, analyze each section
  if (allSections.length > 0) {
    for (let sIdx = 0; sIdx < allSections.length; sIdx++) {
      const section = allSections[sIdx];
      const sectionTitle = section.title?.toLowerCase() || '';

      // Detect examples in example sections
      if (/example/i.test(sectionTitle)) {
        const examples = detectExamples(section.content, section.startOffset, sIdx);
        allExamples.push(...examples);
      } else {
        // Detect instructions and constraints in non-example sections
        const instructions = detectInstructions(section.content, section.startOffset, sIdx);
        allInstructions.push(...instructions);

        const constraints = detectConstraints(section.content, section.startOffset, sIdx);
        allConstraints.push(...constraints);
      }
    }
  } else {
    // No sections detected; analyze role content directly
    for (const role of roles) {
      const instructions = detectInstructions(role.content, role.startOffset, null);
      allInstructions.push(...instructions);

      const constraints = detectConstraints(role.content, role.startOffset, null);
      allConstraints.push(...constraints);

      const examples = detectExamples(role.content, role.startOffset, null);
      allExamples.push(...examples);
    }
  }

  // Filter out instructions that overlap with constraints
  const filteredInstructions = allInstructions.filter(inst => {
    return !allConstraints.some(c => c.text === inst.text);
  });

  // Detect output format
  const outputFormat = detectOutputFormat(text, 0);

  return {
    source: text,
    format: 'plain-text',
    templateSyntax: detectedSyntax,
    roles,
    sections: allSections,
    variables,
    instructions: filteredInstructions,
    constraints: allConstraints,
    examples: allExamples,
    outputFormat,
    characterCount: text.length,
    estimatedTokens: estimateTokens(text),
  };
}
