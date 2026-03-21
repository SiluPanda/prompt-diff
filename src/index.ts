// prompt-diff - Semantic diff engine for LLM prompts

// Core API
export { diff } from './engine/index.js';
export { parse } from './parser/index.js';
export { format } from './formatters/index.js';

// Summarize helper
export { summarize } from './summarize.js';

// Types
export type {
  PromptInput,
  PromptMessage,
  AnthropicPrompt,
  ComparisonMode,
  DiffOptions,
  ParseOptions,
  PromptStructure,
  FormatType,
  TemplateSyntax,
  RoleBlock,
  Section,
  Variable,
  Instruction,
  Constraint,
  SingleExample,
  ExampleBlock,
  OutputFormatSpec,
  ChangeType,
  ChangeCategory,
  Severity,
  DiffSegment,
  PromptChange,
  TokenImpact,
  PromptDiff,
  OutputFormat,
  FormatOptions,
  SectionPattern,
  IgnorePattern,
} from './types.js';
