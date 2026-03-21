# prompt-diff

Semantic diff engine for LLM prompts. Parses prompts into structured representations and computes structural diffs that report changes in prompt semantics rather than raw text.

## Install

```bash
npm install prompt-diff
```

## Quick Start

```typescript
import { diff, format } from 'prompt-diff';

const result = diff(
  'You are a helpful assistant. Always respond in JSON.',
  'You are a coding assistant. Always respond in YAML.',
);

console.log(result.summary);
console.log(format(result, 'terminal'));
```

## API

### `diff(promptA, promptB, options?): PromptDiff`

Compare two prompts and return a structured diff.

- `options.mode` — `'strict' | 'semantic' | 'structural'` (default: `'semantic'`)
- `options.templateSyntax` — `'handlebars' | 'jinja2' | 'fstring' | 'dollar' | 'auto'`

### `parse(source, options?): PromptStructure`

Parse a single prompt into its structural representation.

### `format(diff, outputFormat): string`

Render a diff as `'terminal'`, `'json'`, or `'summary'`.

### `summarize(diff): string`

Return a one-line summary of the diff.

## Change Types

24 semantic change types: role, section, variable, example, instruction, constraint, output-format, and formatting changes.

## Comparison Modes

- **semantic** (default) — Ignores whitespace, focuses on meaning
- **strict** — Every character difference reported
- **structural** — Only structural changes (added/removed elements)

## License

MIT
