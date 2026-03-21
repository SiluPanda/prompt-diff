// ── Prompt Input ─────────────────────────────────────────────────────

/** A single message in a message array (OpenAI-style). */
export interface PromptMessage {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string;
}

/** Anthropic-style prompt with separate system field. */
export interface AnthropicPrompt {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/** A prompt in any supported format. */
export type PromptInput =
  | string
  | PromptMessage[]
  | AnthropicPrompt
  | { file: string };

// ── Comparison Mode ──────────────────────────────────────────────────

export type ComparisonMode = 'strict' | 'semantic' | 'structural';

// ── Section Pattern ──────────────────────────────────────────────────

export interface SectionPattern {
  name: string;
  startPattern: RegExp;
  endPattern?: RegExp;
  titleGroup?: number;
}

// ── Ignore Pattern ───────────────────────────────────────────────────

export interface IgnorePattern {
  pattern: RegExp;
  scope: 'content' | 'section';
}

// ── Diff Options ─────────────────────────────────────────────────────

export interface DiffOptions {
  mode?: ComparisonMode;
  templateSyntax?: 'auto' | 'handlebars' | 'jinja2' | 'fstring' | 'dollar';
  sectionMatchThreshold?: number;
  moveThreshold?: number;
  tokenCounting?: boolean;
  customSectionPatterns?: SectionPattern[];
  ignorePatterns?: IgnorePattern[];
}

// ── Prompt Structure ─────────────────────────────────────────────────

export type FormatType = 'plain-text' | 'message-array' | 'anthropic' | 'structured';

export type TemplateSyntax = 'handlebars' | 'jinja2' | 'fstring' | 'dollar' | 'none' | 'mixed';

export interface RoleBlock {
  role: 'system' | 'user' | 'assistant' | 'unknown';
  content: string;
  startOffset: number;
  endOffset: number;
  sections: Section[];
}

export interface Section {
  title: string | null;
  type: 'header' | 'xml-tag' | 'label' | 'separator';
  content: string;
  startOffset: number;
  endOffset: number;
  roleIndex: number;
  positionIndex: number;
}

export interface Variable {
  name: string;
  syntax: 'handlebars' | 'jinja2' | 'fstring' | 'dollar';
  occurrences: Array<{ startOffset: number; endOffset: number }>;
}

export interface Instruction {
  text: string;
  startOffset: number;
  endOffset: number;
  sectionIndex: number | null;
}

export interface Constraint {
  text: string;
  startOffset: number;
  endOffset: number;
  numericValue: number | null;
  sectionIndex: number | null;
}

export interface SingleExample {
  input: string | null;
  output: string | null;
  text: string;
  index: number;
}

export interface ExampleBlock {
  content: string;
  examples: SingleExample[];
  startOffset: number;
  endOffset: number;
  sectionIndex: number | null;
}

export interface OutputFormatSpec {
  format: 'json' | 'yaml' | 'markdown' | 'csv' | 'xml' | 'plain-text' | 'custom';
  content: string;
  startOffset: number;
  endOffset: number;
}

export interface PromptStructure {
  source: string;
  format: FormatType;
  templateSyntax: TemplateSyntax;
  roles: RoleBlock[];
  sections: Section[];
  variables: Variable[];
  instructions: Instruction[];
  constraints: Constraint[];
  examples: ExampleBlock[];
  outputFormat: OutputFormatSpec | null;
  characterCount: number;
  estimatedTokens: number;
}

// ── Change Types ─────────────────────────────────────────────────────

export type ChangeType =
  | 'role-added'
  | 'role-removed'
  | 'role-content-changed'
  | 'section-added'
  | 'section-removed'
  | 'section-modified'
  | 'section-moved'
  | 'section-renamed'
  | 'variable-added'
  | 'variable-removed'
  | 'variable-renamed'
  | 'example-added'
  | 'example-removed'
  | 'example-modified'
  | 'instruction-added'
  | 'instruction-removed'
  | 'instruction-modified'
  | 'constraint-added'
  | 'constraint-removed'
  | 'constraint-relaxed'
  | 'constraint-tightened'
  | 'constraint-modified'
  | 'output-format-changed'
  | 'whitespace-only'
  | 'formatting-only';

export type ChangeCategory =
  | 'role'
  | 'section'
  | 'variable'
  | 'example'
  | 'instruction'
  | 'constraint'
  | 'output-format'
  | 'formatting';

export type Severity = 'high' | 'medium' | 'low' | 'none';

export interface DiffSegment {
  text: string;
  type: 'added' | 'removed' | 'unchanged';
}

export interface PromptChange {
  type: ChangeType;
  category: ChangeCategory;
  severity: Severity;
  path: string;
  before: string | null;
  after: string | null;
  textDiff: DiffSegment[] | null;
  tokensAdded: number;
  tokensRemoved: number;
  description: string;
}

export interface TokenImpact {
  totalAdded: number;
  totalRemoved: number;
  net: number;
  beforeTokens: number;
  afterTokens: number;
}

export interface PromptDiff {
  identical: boolean;
  changes: PromptChange[];
  summary: string;
  tokenImpact: TokenImpact;
  mode: ComparisonMode;
  structureA: PromptStructure;
  structureB: PromptStructure;
  durationMs: number;
  timestamp: string;
  changeCounts: Record<string, number>;
  severityCounts: Record<Severity, number>;
}

// ── Format Types ─────────────────────────────────────────────────────

export type OutputFormat = 'terminal' | 'json' | 'markdown' | 'summary' | 'patch';

export interface FormatOptions {
  includeStructures?: boolean;
  colorize?: boolean;
}

// ── Parse Options ────────────────────────────────────────────────────

export interface ParseOptions {
  templateSyntax?: 'auto' | 'handlebars' | 'jinja2' | 'fstring' | 'dollar';
  customSectionPatterns?: SectionPattern[];
}
