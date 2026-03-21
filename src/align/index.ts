import type { PromptStructure, DiffOptions } from '../types.js';
import { alignRoles, type RoleAlignment } from './role-aligner.js';
import { alignSections, type SectionAlignment } from './section-aligner.js';
import { alignVariables, type VariableAlignment } from './variable-aligner.js';
import { alignExamples, type ExampleAlignment } from './example-aligner.js';
import { alignInstructions, alignConstraints, type InstructionAlignment, type ConstraintAlignment } from './instruction-aligner.js';

export interface PromptAlignment {
  roles: RoleAlignment;
  sections: SectionAlignment;
  variables: VariableAlignment;
  examples: ExampleAlignment;
  instructions: InstructionAlignment;
  constraints: ConstraintAlignment;
}

/**
 * Align structural elements between two parsed prompt structures.
 */
export function align(
  structA: PromptStructure,
  structB: PromptStructure,
  options?: DiffOptions,
): PromptAlignment {
  const sectionThreshold = options?.sectionMatchThreshold ?? 0.6;

  // 1. Align roles
  const roles = alignRoles(structA.roles, structB.roles);

  // 2. Align sections across matched roles
  let allSectionsA = structA.sections;
  let allSectionsB = structB.sections;

  // If no sections detected at top level, use role-level sections
  if (allSectionsA.length === 0) {
    allSectionsA = structA.roles.flatMap(r => r.sections);
  }
  if (allSectionsB.length === 0) {
    allSectionsB = structB.roles.flatMap(r => r.sections);
  }

  const sections = alignSections(allSectionsA, allSectionsB, sectionThreshold);

  // 3. Align variables
  const variables = alignVariables(
    structA.variables,
    structB.variables,
    structA.source,
    structB.source,
  );

  // 4. Align examples
  const examples = alignExamples(structA.examples, structB.examples);

  // 5. Align instructions
  const instructions = alignInstructions(structA.instructions, structB.instructions);

  // 6. Align constraints
  const constraints = alignConstraints(structA.constraints, structB.constraints);

  return { roles, sections, variables, examples, instructions, constraints };
}
