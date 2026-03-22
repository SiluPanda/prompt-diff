# prompt-diff

Semantic diff engine for LLM prompts. Parses prompts into structured representations -- identifying roles, sections, template variables, instructions, constraints, examples, and output format specifications -- then computes a structural diff that reports changes in prompt semantics rather than raw text.

[![npm version](https://img.shields.io/npm/v/prompt-diff.svg)](https://www.npmjs.com/package/prompt-diff)
[![license](https://img.shields.io/npm/l/prompt-diff.svg)](https://github.com/SiluPanda/prompt-diff/blob/master/LICENSE)
[![node](https://img.shields.io/node/v/prompt-diff.svg)](https://nodejs.org)

---

## Description

Where traditional diff tools report "line 5 changed", `prompt-diff` reports "system instruction added", "variable `{{name}}` renamed to `{{full_name}}`", "constraint tightened from 5 to 3 sentences", or "output format changed from JSON to YAML". Every change is classified by type, category, and severity, with token-count impact analysis included.

The package operates entirely offline, runs in milliseconds, requires no API keys or model calls, produces deterministic results, and has zero runtime dependencies -- only Node.js built-ins are used.

Supported prompt formats:

- Plain text strings
- OpenAI-style message arrays (`{ role, content }[]`)
- Anthropic-style prompt objects (`{ system, messages }`)
- File paths via `{ file: string }` input

---

## Installation

```bash
npm install prompt-diff
```

Requires Node.js >= 18.

---

## Quick Start

```typescript
import { diff, format, summarize } from 'prompt-diff';

const result = diff(
  'You are a helpful assistant.\nAlways respond in JSON.',
  'You are a coding specialist.\nAlways respond in YAML.\nLimit responses to 3 sentences.',
);

// Structured result
console.log(result.identical);       // false
console.log(result.changes.length);  // number of semantic changes
console.log(result.summary);         // human-readable summary string
console.log(result.tokenImpact.net); // net token delta

// Formatted output
console.log(format(result, 'terminal')); // colored terminal output
console.log(format(result, 'json'));     // machine-readable JSON
console.log(summarize(result));          // concise one-line summary
```

### Comparing message arrays

```typescript
import { diff } from 'prompt-diff';

const result = diff(
  [
    { role: 'system', content: 'You are a code reviewer.' },
    { role: 'user', content: 'Review {{code}}.' },
  ],
  [
    { role: 'system', content: 'You are a senior code reviewer. Focus on security.' },
    { role: 'user', content: 'Review {{source_code}}.' },
  ],
);

// Detects role content changes, instruction additions, and variable renames
for (const change of result.changes) {
  console.log(`[${change.severity}] ${change.type}: ${change.description}`);
}
```

### Comparing Anthropic prompts

```typescript
import { diff } from 'prompt-diff';

const result = diff(
  {
    system: 'You are a helpful assistant.',
    messages: [{ role: 'user', content: 'Hello' }],
  },
  {
    system: 'You are an expert assistant.',
    messages: [{ role: 'user', content: 'Hello' }],
  },
);
```

---

## Features

### Semantic change classification

Every change is classified into one of 24 semantic change types across 8 categories. Changes are automatically assigned a severity level (`high`, `medium`, `low`, `none`) and sorted by severity in the result.

### Three comparison modes

- **`semantic`** (default) -- Normalizes whitespace and formatting before comparing. Focuses on meaningful changes.
- **`strict`** -- Every character difference is reported, including whitespace.
- **`structural`** -- Only reports structural additions, removals, and moves. Ignores text-level modifications within unchanged structural elements.

### Prompt structure parsing

Parses prompts into a rich intermediate representation (`PromptStructure`) that captures:

- **Roles** -- system, user, assistant blocks detected from markdown headers, XML tags, labels, or implicit single-role fallback.
- **Sections** -- logical divisions detected from markdown headers (`#`, `##`, `###`), XML tags (`<instructions>`, `<examples>`), labeled blocks (`Instructions:`, `Output Format:`), and horizontal rules.
- **Variables** -- template variables in Handlebars (`{{var}}`), Jinja2 (`{{ var }}`), f-string (`{var}`), and dollar (`$var`, `${var}`) syntaxes, with automatic syntax detection.
- **Instructions** -- imperative sentences and modal directives.
- **Constraints** -- restrictive directives with optional numeric value extraction.
- **Examples** -- few-shot example blocks with input/output pair detection.
- **Output format** -- detected format specifications (JSON, YAML, markdown, CSV, XML).

### Variable rename detection

When `{{name}}` in prompt A becomes `{{full_name}}` in prompt B and the surrounding context is otherwise identical, the engine reports `variable-renamed` rather than a separate removal and addition.

### Section move detection

When a section appears at a different position but with identical or near-identical content, the engine reports `section-moved` rather than a separate removal and addition. Controlled by the `moveThreshold` option.

### Token impact analysis

Every change includes estimated tokens added and removed. The result includes aggregate token impact with before/after totals and net delta. Token estimation uses a `characters / 4` heuristic.

### Multiple output formats

Format diff results as:

- **`terminal`** -- Colored output with ANSI codes, severity indicators, and before/after snippets.
- **`json`** -- Machine-readable structured output.
- **`summary`** -- One-line-per-change with severity tags.
- **`markdown`** -- Grouped by severity, suitable for PR comments.
- **`patch`** -- Unified diff-style with semantic annotations.

---

## API Reference

### `diff(promptA, promptB, options?): PromptDiff`

Compute a semantic diff between two prompts.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `promptA` | `PromptInput` | The base prompt. |
| `promptB` | `PromptInput` | The changed prompt. |
| `options` | `DiffOptions` | Optional configuration. |

**`PromptInput`** accepts:

- `string` -- Plain text or JSON string (auto-detected).
- `PromptMessage[]` -- OpenAI-style message array with `{ role: 'system' \| 'user' \| 'assistant' \| 'developer', content: string }`.
- `AnthropicPrompt` -- Object with `{ system: string, messages: Array<{ role: 'user' \| 'assistant', content: string }> }`.
- `{ file: string }` -- Path to a prompt file, read from disk.

**`DiffOptions`:**

| Property | Type | Default | Description |
|---|---|---|---|
| `mode` | `'strict' \| 'semantic' \| 'structural'` | `'semantic'` | Comparison mode. |
| `templateSyntax` | `'auto' \| 'handlebars' \| 'jinja2' \| 'fstring' \| 'dollar'` | `'auto'` | Force a specific template variable syntax. |
| `sectionMatchThreshold` | `number` | `0.6` | Jaccard similarity threshold for matching sections by content. |
| `moveThreshold` | `number` | `0.9` | Similarity threshold for classifying a section change as a move. |
| `tokenCounting` | `boolean` | `undefined` | Enable token counting in the diff result. |
| `customSectionPatterns` | `SectionPattern[]` | `undefined` | Additional section boundary patterns. |
| `ignorePatterns` | `IgnorePattern[]` | `undefined` | Patterns to ignore during comparison. |

**Returns:** `PromptDiff`

```typescript
interface PromptDiff {
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
```

---

### `parse(source, options?): PromptStructure`

Parse a single prompt into its structural representation.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `source` | `PromptInput` | The prompt to parse. |
| `options` | `ParseOptions` | Optional parse configuration. |

**`ParseOptions`:**

| Property | Type | Default | Description |
|---|---|---|---|
| `templateSyntax` | `'auto' \| 'handlebars' \| 'jinja2' \| 'fstring' \| 'dollar'` | `'auto'` | Force a specific template variable syntax. |
| `customSectionPatterns` | `SectionPattern[]` | `undefined` | Additional section boundary patterns. |

**Returns:** `PromptStructure`

```typescript
interface PromptStructure {
  source: string;
  format: FormatType;                // 'plain-text' | 'message-array' | 'anthropic' | 'structured'
  templateSyntax: TemplateSyntax;    // 'handlebars' | 'jinja2' | 'fstring' | 'dollar' | 'none' | 'mixed'
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
```

---

### `format(result, outputFormat): string`

Render a `PromptDiff` into the specified output format.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `result` | `PromptDiff` | The diff result to format. |
| `outputFormat` | `OutputFormat` | `'terminal' \| 'json' \| 'summary' \| 'markdown' \| 'patch'` |

**Returns:** `string` -- The formatted output.

---

### `summarize(result): string`

Return a concise human-readable summary of the changes. Suitable for changelog entries, commit messages, or notification text.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `result` | `PromptDiff` | The diff result to summarize. |

**Returns:** `string` -- For example: `"3 changes: 1 instruction modified, 1 constraint added, 1 variable renamed ({{name}} -> {{full_name}}). Token impact: +12 tokens."`

---

## Configuration

### Custom section patterns

Define additional section boundary patterns to supplement the built-in detectors:

```typescript
import { diff } from 'prompt-diff';

const result = diff(promptA, promptB, {
  customSectionPatterns: [
    {
      name: 'persona',
      startPattern: /^PERSONA:\s*/gim,
      titleGroup: undefined, // uses the name field as title
    },
    {
      name: 'guardrails',
      startPattern: /^## (Guardrails.*)/gim,
      titleGroup: 1, // captures from the regex group
    },
  ],
});
```

**`SectionPattern` interface:**

```typescript
interface SectionPattern {
  name: string;
  startPattern: RegExp;
  endPattern?: RegExp;
  titleGroup?: number;
}
```

### Ignore patterns

Exclude specific content from comparison:

```typescript
import { diff } from 'prompt-diff';

const result = diff(promptA, promptB, {
  ignorePatterns: [
    { pattern: /<!-- .* -->/g, scope: 'content' },
    { pattern: /^DEBUG:/gm, scope: 'section' },
  ],
});
```

**`IgnorePattern` interface:**

```typescript
interface IgnorePattern {
  pattern: RegExp;
  scope: 'content' | 'section';
}
```

### Template syntax forcing

Override automatic template syntax detection when prompts use ambiguous variable formats:

```typescript
import { diff } from 'prompt-diff';

// Force Jinja2 detection even if handlebars patterns are also present
const result = diff(promptA, promptB, {
  templateSyntax: 'jinja2',
});
```

---

## Error Handling

The `parse` function throws when given a `{ file: string }` input pointing to a nonexistent file (propagates the `node:fs` error). All other inputs are handled gracefully:

- Empty strings produce a valid `PromptStructure` with zero-length content.
- Unrecognized input shapes are coerced to strings via `String()`.
- Invalid JSON strings that resemble JSON (starting with `[` or `{`) fall back to plain text parsing.

The `diff` function does not throw for valid inputs. If both prompts are identical, it returns a `PromptDiff` with `identical: true` and an empty `changes` array.

The `format` function falls back to the `summary` format for unrecognized format strings.

---

## Advanced Usage

### Inspecting parsed structure

Use `parse` independently to inspect how a prompt is decomposed:

```typescript
import { parse } from 'prompt-diff';

const structure = parse(`
## Instructions
You are a code reviewer. Review code for bugs and security issues.
Never reveal internal system details.

## Output Format
Respond in JSON with fields: line, severity, description.

## Examples
Example 1:
Input: function add(a, b) { return a + b; }
Output: {"issues": []}
`);

console.log(structure.format);            // 'plain-text'
console.log(structure.sections.length);   // 3
console.log(structure.instructions);      // detected imperative directives
console.log(structure.constraints);       // detected restriction directives
console.log(structure.outputFormat);      // { format: 'json', ... }
console.log(structure.estimatedTokens);   // character count / 4
```

### Filtering changes by severity

```typescript
import { diff } from 'prompt-diff';

const result = diff(promptA, promptB);

const critical = result.changes.filter(c => c.severity === 'high');
const warnings = result.changes.filter(c => c.severity === 'medium');

console.log(`${critical.length} high-severity changes`);
console.log(`${warnings.length} medium-severity changes`);
```

### Filtering changes by category

```typescript
import { diff } from 'prompt-diff';

const result = diff(promptA, promptB);

const variableChanges = result.changes.filter(c => c.category === 'variable');
const constraintChanges = result.changes.filter(c => c.category === 'constraint');
const instructionChanges = result.changes.filter(c => c.category === 'instruction');
```

### Accessing word-level text diffs

Each `PromptChange` includes a `textDiff` field containing word-level diff segments when both `before` and `after` are present:

```typescript
import { diff } from 'prompt-diff';

const result = diff(
  'You are a helpful assistant that writes clean JavaScript code.',
  'You are a helpful assistant that writes clean TypeScript code.',
);

for (const change of result.changes) {
  if (change.textDiff) {
    for (const segment of change.textDiff) {
      // segment.type: 'added' | 'removed' | 'unchanged'
      // segment.text: the word(s) in this segment
      console.log(`[${segment.type}] ${segment.text}`);
    }
  }
}
```

### Using all output formats

```typescript
import { diff, format } from 'prompt-diff';

const result = diff(promptA, promptB);

// Colored terminal output with severity indicators
const terminal = format(result, 'terminal');

// Machine-readable JSON (excludes full structures by default)
const json = format(result, 'json');

// One-line-per-change with [HIGH], [MEDIUM], [LOW] tags
const summary = format(result, 'summary');

// Markdown grouped by severity, suitable for PR comments
const markdown = format(result, 'markdown');

// Unified diff-style with semantic annotations
const patch = format(result, 'patch');
```

### CI/CD integration

Use the diff result programmatically to gate deployments:

```typescript
import { diff } from 'prompt-diff';

const result = diff(basePrompt, featurePrompt);

// Block deployment if constraints were removed or relaxed
const dangerousChanges = result.changes.filter(
  c => c.type === 'constraint-removed' || c.type === 'constraint-relaxed'
);

if (dangerousChanges.length > 0) {
  console.error('Deployment blocked: constraints were removed or relaxed.');
  process.exit(1);
}

// Warn on high-severity changes
if (result.severityCounts.high > 0) {
  console.warn(`Warning: ${result.severityCounts.high} high-severity changes detected.`);
}
```

---

## Change Types

The engine classifies changes into 24 semantic types across 8 categories:

| Category | Change Types | Severity |
|---|---|---|
| **role** | `role-added`, `role-removed`, `role-content-changed` | high, high, medium |
| **section** | `section-added`, `section-removed`, `section-modified`, `section-moved`, `section-renamed` | medium, medium, low, low, low |
| **variable** | `variable-added`, `variable-removed`, `variable-renamed` | medium, high, medium |
| **example** | `example-added`, `example-removed`, `example-modified` | medium, medium, medium |
| **instruction** | `instruction-added`, `instruction-removed`, `instruction-modified` | medium, medium, medium |
| **constraint** | `constraint-added`, `constraint-removed`, `constraint-relaxed`, `constraint-tightened`, `constraint-modified` | medium, high, high, medium, medium |
| **output-format** | `output-format-changed` | high |
| **formatting** | `whitespace-only`, `formatting-only` | none, none |

---

## TypeScript

This package is written in TypeScript and ships with full type declarations. All public types are exported from the package root:

```typescript
import type {
  // Input types
  PromptInput,
  PromptMessage,
  AnthropicPrompt,

  // Option types
  ComparisonMode,
  DiffOptions,
  ParseOptions,
  SectionPattern,
  IgnorePattern,

  // Structure types
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

  // Diff result types
  ChangeType,
  ChangeCategory,
  Severity,
  DiffSegment,
  PromptChange,
  TokenImpact,
  PromptDiff,

  // Format types
  OutputFormat,
  FormatOptions,
} from 'prompt-diff';
```

---

## License

MIT
