import type {
  PromptStructure,
  PromptMessage,
  AnthropicPrompt,
  RoleBlock,
  ParseOptions,
  Section,
  Instruction,
  Constraint,
  ExampleBlock,
} from '../types.js';
import { estimateTokens } from '../utils/text.js';
import { detectSections } from './section-detector.js';
import { extractVariables } from './variable-extractor.js';
import { detectInstructions } from './instruction-detector.js';
import { detectConstraints } from './constraint-detector.js';
import { detectExamples } from './example-detector.js';
import { detectOutputFormat } from './output-format-detector.js';

/**
 * Parse an OpenAI-style message array into a PromptStructure.
 */
export function parseMessageArray(
  messages: PromptMessage[],
  options?: ParseOptions,
): PromptStructure {
  const source = JSON.stringify(messages);
  let offset = 0;
  const roles: RoleBlock[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const role = msg.role === 'developer' ? 'system' : msg.role;
    const content = msg.content;

    roles.push({
      role,
      content,
      startOffset: offset,
      endOffset: offset + content.length,
      sections: [],
    });

    offset += content.length + 1; // +1 for separator
  }

  return buildStructure(source, 'message-array', roles, options);
}

/**
 * Parse an Anthropic-style prompt into a PromptStructure.
 */
export function parseAnthropicPrompt(
  prompt: AnthropicPrompt,
  options?: ParseOptions,
): PromptStructure {
  const source = JSON.stringify(prompt);
  let offset = 0;
  const roles: RoleBlock[] = [];

  // System role
  if (prompt.system) {
    roles.push({
      role: 'system',
      content: prompt.system,
      startOffset: offset,
      endOffset: offset + prompt.system.length,
      sections: [],
    });
    offset += prompt.system.length + 1;
  }

  // Messages
  for (const msg of prompt.messages) {
    roles.push({
      role: msg.role,
      content: msg.content,
      startOffset: offset,
      endOffset: offset + msg.content.length,
      sections: [],
    });
    offset += msg.content.length + 1;
  }

  return buildStructure(source, 'anthropic', roles, options);
}

function buildStructure(
  source: string,
  format: 'message-array' | 'anthropic',
  roles: RoleBlock[],
  options?: ParseOptions,
): PromptStructure {
  const allSections: Section[] = [];
  const allText = roles.map(r => r.content).join('\n');

  // Detect sections within each role
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

  // Extract variables from all content
  const { variables, detectedSyntax } = extractVariables(
    allText,
    0,
    options?.templateSyntax,
  );

  // Detect instructions, constraints, examples
  const allInstructions: Instruction[] = [];
  const allConstraints: Constraint[] = [];
  const allExamples: ExampleBlock[] = [];

  if (allSections.length > 0) {
    for (let sIdx = 0; sIdx < allSections.length; sIdx++) {
      const section = allSections[sIdx];
      const sectionTitle = section.title?.toLowerCase() || '';

      if (/example/i.test(sectionTitle)) {
        const examples = detectExamples(section.content, section.startOffset, sIdx);
        allExamples.push(...examples);
      } else {
        const instructions = detectInstructions(section.content, section.startOffset, sIdx);
        allInstructions.push(...instructions);
        const constraints = detectConstraints(section.content, section.startOffset, sIdx);
        allConstraints.push(...constraints);
      }
    }
  } else {
    for (const role of roles) {
      const instructions = detectInstructions(role.content, role.startOffset, null);
      allInstructions.push(...instructions);
      const constraints = detectConstraints(role.content, role.startOffset, null);
      allConstraints.push(...constraints);
      const examples = detectExamples(role.content, role.startOffset, null);
      allExamples.push(...examples);
    }
  }

  const filteredInstructions = allInstructions.filter(inst => {
    return !allConstraints.some(c => c.text === inst.text);
  });

  const outputFormat = detectOutputFormat(allText, 0);

  return {
    source,
    format,
    templateSyntax: detectedSyntax,
    roles,
    sections: allSections,
    variables,
    instructions: filteredInstructions,
    constraints: allConstraints,
    examples: allExamples,
    outputFormat,
    characterCount: allText.length,
    estimatedTokens: estimateTokens(allText),
  };
}
