# prompt-diff -- Specification

## 1. Overview

`prompt-diff` is a semantic diff engine for LLM prompts. It parses two prompts into structured representations -- identifying roles, sections, template variables, few-shot examples, instructions, constraints, and output format specifications -- then computes a structural diff that reports changes in terms of prompt semantics rather than raw text. Where `jsdiff` reports "line 5 changed" and `diff-match-patch` reports character-level insertions and deletions, `prompt-diff` reports "system instruction added", "example #3 removed", "variable `{{name}}` renamed to `{{full_name}}`", "constraint relaxed", or "output format changed from JSON to YAML". The result is a structured `PromptDiff` object containing classified changes, a human-readable summary, and optional token-count impact analysis.

The gap this package fills is specific and well-defined. Prompts are increasingly treated as source code: checked into version control, reviewed in pull requests, versioned with semantic versioning, and deployed to production. Yet every existing diff tool treats prompts as flat text. `jsdiff` (the most popular JavaScript diff library, with 7M+ weekly npm downloads) provides `diffWords`, `diffLines`, and `structuredPatch` -- all operating on raw strings with no awareness of prompt structure. `diff-match-patch` (Google's library powering Google Docs) computes character-level diffs with semantic cleanup that improves readability but still has no concept of roles, sections, or variables. `git diff` shows unified text diffs with optional word-diff mode, but cannot distinguish a whitespace normalization from a constraint change. `jsondiffpatch` handles structured JSON objects with move detection and array diffing, but it operates on arbitrary JSON, not on the semantic structure of prompts. The `llm-prompt-semantic-diff` tool uses embedding-based similarity scores to detect meaning changes, but it requires an LLM or embedding model, is non-deterministic, and reports a single similarity percentage rather than itemized structural changes.

`prompt-diff` operates entirely offline, runs in milliseconds, requires no API keys or model calls, and produces deterministic results. It understands prompt-specific structure: role boundaries (system/user/assistant), sections (delimited by markdown headers, XML tags, labeled blocks, or horizontal rules), template variables in multiple syntaxes (`{{var}}`, `{var}`, `{{ var }}`), few-shot example blocks, instructions and constraints, and output format specifications. It aligns structural elements between two prompts using a combination of positional matching and content similarity, computes per-element text diffs for modified elements, classifies each change into a semantic category (role change, section change, variable change, example change, instruction change, constraint change, formatting change), and produces a structured diff result that can be rendered as terminal output, JSON, markdown, or a one-line-per-change summary.

`prompt-diff` provides both a TypeScript/JavaScript API for programmatic use and a CLI for terminal and shell-script use. The API returns structured `PromptDiff` objects with per-change details, source locations, and token-count impact. The CLI prints human-readable or machine-readable output and exits with conventional codes (0 for no differences, 1 for differences found, 2 for configuration/usage errors). A `format` function renders diffs in multiple output formats. An `apply` function applies a diff as a patch to transform one prompt into another.

---

## 2. Goals and Non-Goals

### Goals

- Provide a `diff(promptA, promptB, options)` function that parses two prompts into structural representations, aligns their elements, computes semantic differences, classifies each change, and returns a structured `PromptDiff` result.
- Parse prompts into a `PromptStructure` intermediate representation that captures roles, sections, variables, instructions, examples, constraints, output format specifications, and delimiters -- enabling structural comparison without invoking an LLM.
- Detect and classify structural changes: role additions/removals/modifications, section additions/removals/modifications/moves, variable additions/removals/renames, example additions/removals/modifications, instruction additions/removals/modifications, constraint additions/removals/relaxations/tightenings, and output format changes.
- Distinguish semantic changes from formatting changes. A trailing whitespace removal is `formatting-only`. Adding a new constraint to the system prompt is `constraint-added`. Reordering two sections without changing their content is `section-moved`. The diff result classifies every change, and users can filter by classification.
- Detect variable renames: when `{{name}}` in prompt A becomes `{{full_name}}` in prompt B and the surrounding context is otherwise identical, report this as `variable-renamed` rather than `variable-removed` + `variable-added`.
- Detect section moves: when a section appears in a different position but with identical or near-identical content, report this as `section-moved` rather than `section-removed` + `section-added`.
- Provide token-count impact analysis: for each change, estimate the number of tokens added or removed, and report the total token delta for the entire diff.
- Support multiple prompt formats: plain text strings, OpenAI-style message arrays (`{role, content}[]`), Anthropic-style prompt objects (`{system, messages}`), template files with variables, and structured prompt files (YAML/JSON with sections).
- Provide a `format(diff, formatter)` function that renders a `PromptDiff` into terminal output (colored unified diff with semantic annotations), JSON (machine-readable structured diff), markdown (for PR comments and documentation), summary (one-line-per-change human-readable), or patch (applicable format).
- Provide an `apply(prompt, patch)` function that applies a structured diff as a patch to transform one prompt into another.
- Provide a `summarize(diff)` function that returns a concise human-readable summary of the changes (e.g., "2 instructions added, 1 example removed, variable `{{name}}` renamed to `{{full_name}}`").
- Provide a `parse(prompt)` function that parses a single prompt into a `PromptStructure`, exposed as a public API for use by other tools (e.g., `prompt-lint` could reuse this parser).
- Provide a CLI (`prompt-diff`) with file input, stdin piping, format selection, comparison mode selection, and deterministic exit codes.
- Support three comparison modes: `strict` (every character matters, including whitespace), `semantic` (normalize whitespace and formatting before comparing, focus on meaning), and `structural` (only report structural changes -- role/section/variable/example additions/removals/moves -- and ignore text-level modifications within unchanged structural elements).
- Integrate with git as a custom diff driver, enabling `git diff` to display semantic prompt diffs for prompt files.
- Keep dependencies minimal: zero runtime dependencies. The package uses only Node.js built-ins.

### Non-Goals

- **Not an LLM-based semantic comparator.** This package does not call any LLM API or use embedding models to assess semantic similarity between prompts. It uses deterministic, heuristic-based structural analysis. The `llm-prompt-semantic-diff` tool takes the embedding approach; `prompt-diff` takes the structural parsing approach. Both are valid strategies with different trade-offs. `prompt-diff` is fast, deterministic, free, and offline. Embedding-based comparison captures meaning nuances that structural analysis misses but requires API keys, costs money, and is non-deterministic.
- **Not a prompt linter.** This package compares two prompts and reports their differences. It does not evaluate whether either prompt is well-written. That is what `prompt-lint` does. The two packages share parsing logic (both parse prompts into structural representations) but serve different purposes.
- **Not a prompt version control system.** This package compares two prompt versions provided to it. It does not store, version, or manage prompt histories. Use git, PromptLayer, or LangSmith for prompt versioning. `prompt-diff` is the diff engine that those systems can use to display changes between versions.
- **Not a general-purpose text diff library.** This package is specialized for LLM prompts. For diffing arbitrary text, use `jsdiff`. For diffing JSON objects, use `jsondiffpatch`. For diffing source code, use `difftastic`. `prompt-diff` borrows diff algorithm concepts from these tools but applies them to prompt-specific structural elements.
- **Not a token counter.** While the package estimates token-count impact of changes, it does not provide exact token counts for specific models. Token estimation uses a rough heuristic (characters / 4). For exact counts, use `gpt-tokenizer`, `tiktoken`, or model-specific tokenizers.
- **Not a prompt template engine.** This package does not render or execute templates. It detects template variables for structural analysis purposes only.

---

## 3. Target Users and Use Cases

### Prompt Engineers Iterating on Prompts

Developers who write and maintain LLM prompts as part of their application code. When iterating on a system prompt -- adding examples, tightening constraints, restructuring sections -- they need to understand what changed between versions in prompt-specific terms. Running `prompt-diff v1.md v2.md` shows "2 instructions modified, 1 example added, constraint `max_tokens` tightened from 500 to 200" rather than a wall of red/green text lines.

### Pull Request Reviewers

Teams that review prompt changes in pull requests. A prompt change that looks like 50 lines of diff in `git diff` might be a simple section reorder. `prompt-diff` detects the reorder and reports `section-moved: "Examples" moved from position 3 to position 5`, making review faster and more accurate. The markdown output format is designed for embedding in PR comments.

### CI/CD Pipeline Operators

Teams that gate prompt deployments on change analysis. A CI step runs `prompt-diff` against the base branch and the feature branch versions of each prompt file. The structured output enables policy enforcement: block deployments that remove constraints, require approval for role changes, or flag variable renames that might break downstream template rendering. The CLI's deterministic exit codes enable gating (exit 0 for no changes, exit 1 for changes detected).

### Prompt A/B Test Comparison

Teams running A/B tests with prompt variants. Before deploying a test, they need to understand exactly how variant B differs from variant A in structural terms. `prompt-diff` provides a precise inventory of changes, and the token-count impact analysis shows whether the variant is more or less expensive to run.

### Prompt Library Maintainers

Teams maintaining shared prompt libraries or registries used by multiple applications. When updating a shared prompt, they need to communicate what changed to all consumers. The `summarize` function produces a concise changelog entry: "v2.1: Added error handling instructions. Renamed `{{input}}` to `{{user_query}}`. Removed example #4."

### AI/ML Platform Teams

Teams building prompt management platforms that need a diff engine for their version comparison UI. The structured `PromptDiff` output provides all the data needed to render a rich diff view: change types, source locations, token impact, and formatted output in multiple styles.

---

## 4. Core Concepts

### Prompt Structure

A Prompt Structure is the intermediate representation that `prompt-diff` produces by parsing a prompt. It is the "AST" equivalent for prompt diffing. The parser transforms raw prompt text into a tree of structural elements that can be aligned and compared.

A Prompt Structure contains:

- **Metadata**: detected format (plain text, message array, Anthropic, template file), detected template syntax, total character count, estimated token count.
- **Roles**: an ordered list of role blocks (system, user, assistant). Each role block contains the role identifier and its content. For plain text prompts without explicit roles, the entire text is treated as a single implicit system role.
- **Sections**: logical divisions within role blocks, detected by headers (markdown `#`, `##`), XML tags (`<instructions>`, `<examples>`), labeled blocks (`Instructions:`, `Output Format:`), or horizontal rules (`---`). Each section has an optional title, a type, and content.
- **Variables**: template variables extracted from the text, including their name, syntax style (`{{var}}`, `{var}`, `{{ var }}`), and all occurrence locations.
- **Instructions**: imperative sentences and directive statements that tell the model what to do or how to behave.
- **Constraints**: restrictive directives that limit the model's behavior ("only", "never", "do not", "must not", "at most", "no more than").
- **Examples**: few-shot example blocks, treated as atomic units. Each example block contains one or more individual examples with their input/output pairs.
- **Output Format Specification**: detected specifications for the expected output format (JSON schema, response template, format instructions).

### Diff Change

A Diff Change is the fundamental unit of the diff result. Each change represents a single structural difference between the two prompts. A change has:

- **Type**: the semantic category of the change (e.g., `role-added`, `section-moved`, `variable-renamed`).
- **Category**: the structural level (role, section, variable, example, instruction, constraint, output-format, formatting).
- **Path**: a structured path identifying where in the prompt structure the change occurred (e.g., `roles[0].sections[2]` or `variables.user_name`).
- **Before**: the content/value in prompt A (null for additions).
- **After**: the content/value in prompt B (null for removals).
- **Text Diff**: for modified elements, a fine-grained text diff showing what changed within the element.
- **Token Impact**: estimated tokens added and removed by this change.

### Structural Alignment

Before computing diffs, `prompt-diff` aligns the structural elements of the two prompts. Alignment matches elements in prompt A to their corresponding elements in prompt B. The alignment algorithm handles:

- **Positional matching**: elements at the same position in the same role block are candidates for matching.
- **Content similarity matching**: elements with highly similar content are matched regardless of position (enabling move detection).
- **Name matching**: sections with the same title, variables with the same name, and examples with the same index are strong match candidates.
- **Unmatched elements**: elements in A with no match in B are classified as removals. Elements in B with no match in A are classified as additions.

### Comparison Modes

`prompt-diff` supports three comparison modes that control the level of sensitivity:

- **Strict**: every character matters. Whitespace changes, formatting changes, and structural changes are all reported. This mode is useful for exact reproduction verification.
- **Semantic** (default): whitespace is normalized (collapsed, trimmed), and formatting differences (markdown bold/italic, trailing spaces) are ignored. Focus is on changes that affect the prompt's meaning. This is the right mode for most use cases.
- **Structural**: only structural changes are reported (role/section/variable/example additions, removals, moves, renames). Text-level modifications within unchanged structural elements are ignored. This mode is useful for high-level change summaries.

---

## 5. Prompt Parsing

### Overview

The parser transforms raw prompt input into a `PromptStructure`. Parsing is heuristic-based, not grammar-based. The parser makes best-effort structural identification and is designed to be conservative -- it prefers false negatives (missing a structural element) over false positives (misidentifying ordinary text as structure). The parser is shared with `prompt-lint` and follows the same detection patterns.

### Format Detection

When the input is a string, the parser auto-detects the format:

1. If the input parses as JSON and contains a `messages` array of objects with `role` and `content` fields, it is treated as a message array (OpenAI format).
2. If the input parses as JSON and contains a top-level `system` string and a `messages` array, it is treated as Anthropic format.
3. If the input parses as YAML and contains a structured prompt document with named sections, it is treated as a structured prompt file.
4. Otherwise, it is treated as plain text.

When the input is provided programmatically as a JavaScript object (array or object), the format is inferred from the shape.

### Role Detection

For message array and Anthropic format inputs, roles are explicit. For plain text inputs, the parser detects roles using these patterns:

- **Markdown headers**: `# System`, `## System Prompt`, `# User`, `# Assistant` (case-insensitive).
- **Label patterns**: `System:`, `User:`, `Assistant:`, `Human:`, `AI:` at the start of a line, followed by content.
- **XML tags**: `<system>`, `<user>`, `<assistant>` wrapping content blocks.
- **Anthropic legacy format**: `\n\nHuman:` and `\n\nAssistant:` markers.

If no role markers are detected, the entire text is treated as a single implicit system role block.

### Section Detection

Within each role block, the parser identifies logical sections:

- **Markdown headers**: `#`, `##`, `###` headers create section boundaries. The header text becomes the section title.
- **XML tags**: `<instructions>`, `<context>`, `<examples>`, `<output>`, `<rules>`, `<constraints>`, and similar tags create sections. The tag name becomes the section title.
- **Labeled blocks**: lines matching `Label:` followed by content (e.g., `Instructions:`, `Output Format:`, `Examples:`, `Context:`, `Rules:`, `Constraints:`).
- **Horizontal rules**: `---`, `***`, `___` on their own line create section boundaries. These sections have no title.

### Variable Extraction

The parser extracts template variables from the text. It supports multiple syntaxes and detects the dominant syntax used in the document:

| Syntax | Pattern | Example | Common In |
|---|---|---|---|
| Handlebars/Mustache | `{{variableName}}` | `{{user_input}}` | Handlebars, Mustache, promptfoo |
| Jinja2 | `{{ variableName }}` | `{{ user_input }}` | Jinja2, LangChain, Semantic Kernel |
| f-string | `{variableName}` | `{user_input}` | Python f-strings, LangChain |
| Dollar | `$variableName` or `${variableName}` | `$user_input` | Shell, some template engines |

For each variable, the parser records:

- **Name**: the variable identifier.
- **Syntax**: which syntax style is used.
- **Occurrences**: all locations where the variable appears.

### Instruction Detection

The parser identifies imperative sentences and directive statements. Detection heuristics:

- Sentences starting with imperative verbs: "Write", "Generate", "Analyze", "Return", "Always", "Never", "Do not", "Make sure", "Ensure", "You must", "You should", "You will".
- Sentences containing modal directives: "must", "should", "shall", "need to", "have to".
- Bullet points and numbered items within instruction-labeled sections.

### Constraint Detection

The parser separately identifies constraint directives -- instructions that restrict or limit the model's behavior rather than directing it to act. Constraint heuristics:

- Sentences containing restriction language: "only", "never", "do not", "must not", "cannot", "at most", "no more than", "limit to", "restrict to", "exclusively".
- Sentences with quantitative limits: numbers followed by limit language ("maximum 3 sentences", "no more than 500 tokens", "limit your response to 2 paragraphs").
- Negative imperatives: "Do not", "Never", "Avoid", "Refrain from".

Separating constraints from instructions enables the diff to classify changes as `constraint-relaxed` (limit increased or restriction removed) or `constraint-tightened` (limit decreased or new restriction added), which are semantically distinct from generic instruction modifications.

### Example Block Detection

The parser identifies few-shot example blocks using these patterns:

- Sections explicitly labeled "Examples", "Example", "Few-shot examples".
- Numbered patterns: `Example 1:`, `1.`, `1)` followed by structured content.
- Input/Output pairs: `Input:` / `Output:`, `Q:` / `A:`, `User:` / `Assistant:` within an example section.
- XML-tagged examples: `<example>`, `<examples>`.

Example blocks are treated as atomic units for diff purposes: an example is either added, removed, or modified as a whole. This prevents a single example's input/output pair from being split across multiple diff changes.

### Output Format Detection

The parser identifies output format specifications:

- Sections labeled "Output Format", "Response Format", "Output", "Expected Output".
- JSON/YAML schema blocks (fenced code blocks with `json` or `yaml` language markers containing schema-like structures).
- Explicit format instructions: "Respond in JSON", "Return a JSON object", "Format your response as", "Use the following schema".
- Structured response templates with placeholder fields.

---

## 6. Diff Algorithm

### Overview

The diff algorithm operates in four phases: parse, align, diff, classify. Each phase feeds into the next, producing progressively richer information about the differences between two prompts.

### Phase 1: Parse

Both prompts are parsed into `PromptStructure` representations using the parser described in Section 5. This phase is identical to the standalone `parse()` function. The parser runs independently on each prompt, producing two structural representations that share no state.

### Phase 2: Align

The alignment phase matches structural elements in prompt A to their corresponding elements in prompt B. Alignment is performed hierarchically:

1. **Role alignment**: Roles are matched by role identifier (system-to-system, user-to-user, assistant-to-assistant). Roles present in A but not B are marked as removed. Roles present in B but not A are marked as added.

2. **Section alignment within matched roles**: For each pair of matched role blocks, sections are aligned using a two-pass algorithm:
   - **Pass 1 -- Title matching**: Sections with identical titles (case-insensitive) are matched regardless of position. This handles section reordering.
   - **Pass 2 -- Content similarity**: Unmatched sections from Pass 1 are compared using normalized content similarity (Jaccard similarity on word sets). Sections with similarity above a configurable threshold (default: 0.6) are matched. This handles sections that were renamed but retain similar content.
   - **Remaining unmatched sections**: Sections in A with no match are marked as removed. Sections in B with no match are marked as added.

3. **Variable alignment**: Variables are matched by name. Variables with identical names in both prompts are matched. For unmatched variables, the algorithm checks for renames: if a variable in A was removed and a variable in B was added, and they appear in the same positional context (surrounded by identical text), they are matched as a rename.

4. **Example alignment**: Examples within matched example sections are aligned by index (example 1 to example 1, example 2 to example 2). When the number of examples differs, trailing examples are marked as added or removed. When example content differs significantly (similarity below threshold), the algorithm falls back to positional alignment to avoid false matches.

5. **Instruction and constraint alignment**: Instructions and constraints within matched sections are aligned using normalized text similarity. Exact matches are aligned first, then near-matches (similarity above 0.7) are paired.

### Phase 3: Diff

For each pair of aligned elements, a fine-grained text diff is computed to identify what changed within the element. The text diff uses a word-level diff algorithm (based on the longest common subsequence approach, similar to Myers' algorithm) that:

- Splits text into word tokens.
- Computes the longest common subsequence of words.
- Identifies inserted words, deleted words, and unchanged words.
- Groups contiguous changes into hunks for readable output.

For `semantic` comparison mode, text is normalized before diffing: whitespace is collapsed, trailing whitespace is removed, and case-insensitive comparison is used for structural markers (headers, labels). For `strict` mode, text is compared as-is. For `structural` mode, text diffs within matched elements are suppressed (only structural additions, removals, and moves are reported).

### Phase 4: Classify

Each difference is classified into a semantic change type. Classification uses the structural context (what kind of element changed) and the nature of the change (added, removed, modified, moved, renamed):

| Element Type | Change Nature | Classification |
|---|---|---|
| Role block | Added in B | `role-added` |
| Role block | Present in A, absent in B | `role-removed` |
| Role block | Matched, content differs | `role-content-changed` |
| Section | Added in B | `section-added` |
| Section | Present in A, absent in B | `section-removed` |
| Section | Matched, content differs | `section-modified` |
| Section | Matched, position differs | `section-moved` |
| Variable | Added in B | `variable-added` |
| Variable | Present in A, absent in B | `variable-removed` |
| Variable | Matched to different name | `variable-renamed` |
| Example block | Added in B | `example-added` |
| Example block | Present in A, absent in B | `example-removed` |
| Example block | Matched, content differs | `example-modified` |
| Instruction | Added in B | `instruction-added` |
| Instruction | Present in A, absent in B | `instruction-removed` |
| Instruction | Matched, content differs | `instruction-modified` |
| Constraint | Added in B | `constraint-added` |
| Constraint | Present in A, absent in B | `constraint-removed` |
| Constraint | Limit value increased | `constraint-relaxed` |
| Constraint | Limit value decreased | `constraint-tightened` |
| Constraint | Matched, other content differs | `constraint-modified` |
| Output format | Format type changed | `output-format-changed` |
| Any | Only whitespace/formatting differs | `whitespace-only` |
| Any | Only markdown formatting differs | `formatting-only` |

### Move Detection

Move detection identifies elements that changed position without changing content. The algorithm:

1. After alignment, identifies any matched pair where the element index in A differs from its index in B.
2. Computes the normalized content similarity between the matched elements.
3. If similarity exceeds the move threshold (default: 0.9), classifies the change as a move. Otherwise, classifies it as a removal + addition (the content changed too much to be considered a move).

Move detection prevents a section reorder from appearing as a large deletion followed by a large insertion, which is the default behavior of flat-text diff tools.

### Variable Rename Detection

Variable rename detection identifies variables that were renamed between prompt versions. The algorithm:

1. Collects all variables removed from A and all variables added in B.
2. For each removed variable, examines the text surrounding its occurrences.
3. For each added variable, examines the text surrounding its occurrences.
4. If a removed variable and an added variable share identical surrounding context (the text before and after the variable reference is the same), they are matched as a rename.

This heuristic works because variable renames typically change only the variable name while preserving the surrounding prompt text. For example, `Tell me about {{name}}` changing to `Tell me about {{full_name}}` has identical surrounding context and is detected as a rename.

### Constraint Relaxation/Tightening Detection

When a constraint is modified, the algorithm attempts to determine whether the change relaxes or tightens the constraint:

- **Numeric limits**: If a numeric value in the constraint increased (e.g., "maximum 3 sentences" to "maximum 5 sentences"), the constraint is `relaxed`. If it decreased, it is `tightened`.
- **Restriction removal**: If restrictive language was removed ("only", "never", "must not"), the constraint is `relaxed`.
- **Restriction addition**: If restrictive language was added, the constraint is `tightened`.
- **Ambiguous**: If the change cannot be clearly classified, it is reported as `constraint-modified`.

---

## 7. Change Types

### Complete Taxonomy

| Change Type | Category | Description |
|---|---|---|
| `role-added` | role | A role block (system, user, or assistant) was added in prompt B. |
| `role-removed` | role | A role block was removed from prompt A. |
| `role-content-changed` | role | A matched role block has different content. |
| `section-added` | section | A section was added in prompt B. |
| `section-removed` | section | A section was removed from prompt A. |
| `section-modified` | section | A matched section has different content. |
| `section-moved` | section | A section moved to a different position with identical or near-identical content. |
| `section-renamed` | section | A section's title changed but its content is similar. |
| `variable-added` | variable | A template variable was added in prompt B. |
| `variable-removed` | variable | A template variable was removed from prompt A. |
| `variable-renamed` | variable | A template variable was renamed (same positional context, different name). |
| `example-added` | example | A few-shot example was added in prompt B. |
| `example-removed` | example | A few-shot example was removed from prompt A. |
| `example-modified` | example | A matched few-shot example has different content. |
| `instruction-added` | instruction | An instruction directive was added in prompt B. |
| `instruction-removed` | instruction | An instruction directive was removed from prompt A. |
| `instruction-modified` | instruction | A matched instruction has different wording. |
| `constraint-added` | constraint | A constraint (restriction/limit) was added in prompt B. |
| `constraint-removed` | constraint | A constraint was removed from prompt A. |
| `constraint-relaxed` | constraint | A constraint was loosened (limit increased, restriction removed). |
| `constraint-tightened` | constraint | A constraint was strengthened (limit decreased, restriction added). |
| `constraint-modified` | constraint | A constraint changed in a way that is neither clearly relaxing nor tightening. |
| `output-format-changed` | output-format | The output format specification changed (e.g., JSON to YAML, schema modified). |
| `whitespace-only` | formatting | Only whitespace changed (spaces, tabs, blank lines). |
| `formatting-only` | formatting | Only text formatting changed (markdown bold/italic, indentation). |

### Change Severity Heuristic

Each change type has an associated severity heuristic that indicates how likely the change is to affect model behavior:

| Severity | Change Types |
|---|---|
| `high` | `role-added`, `role-removed`, `constraint-removed`, `constraint-relaxed`, `output-format-changed`, `variable-removed` |
| `medium` | `role-content-changed`, `section-added`, `section-removed`, `instruction-added`, `instruction-removed`, `instruction-modified`, `constraint-added`, `constraint-tightened`, `constraint-modified`, `example-added`, `example-removed`, `example-modified`, `variable-added`, `variable-renamed` |
| `low` | `section-modified`, `section-moved`, `section-renamed` |
| `none` | `whitespace-only`, `formatting-only` |

This severity classification is informational only -- it helps users prioritize their review. It is not a quality judgment.

---

## 8. API Surface

### Installation

```bash
npm install prompt-diff
```

### No Runtime Dependencies

`prompt-diff` has zero runtime dependencies. It uses only Node.js built-ins (`node:fs`, `node:path`, `node:util`). The parser, diff engine, and formatters are all self-contained.

### Main Export: `diff`

The primary API is a function that accepts two prompts and a configuration, parses both prompts, computes the structural diff, classifies the changes, and returns a `PromptDiff` result.

```typescript
import { diff } from 'prompt-diff';

const result = diff(
  'You are a helpful assistant. Answer questions about our product.',
  'You are a knowledgeable product specialist. Answer questions about our product catalog. Respond in JSON format.',
);

console.log(result.summary);
// "3 changes: 1 instruction modified, 1 instruction added, 1 output format changed"

console.log(result.changes.length); // 3
console.log(result.tokenDelta);     // +12 tokens
```

### Type Definitions

```typescript
// ── Prompt Input ─────────────────────────────────────────────────────

/**
 * A prompt in any supported format.
 */
type PromptInput =
  | string                        // Plain text prompt
  | PromptMessage[]               // OpenAI-style message array
  | AnthropicPrompt               // Anthropic-style prompt object
  | { file: string };             // Read from file path

/** A single message in a message array. */
interface PromptMessage {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string;
}

/** Anthropic-style prompt with separate system field. */
interface AnthropicPrompt {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// ── Diff Options ─────────────────────────────────────────────────────

/** Comparison mode controlling sensitivity level. */
type ComparisonMode = 'strict' | 'semantic' | 'structural';

/** Complete diff configuration. */
interface DiffOptions {
  /**
   * Comparison mode.
   * - 'strict': every character matters, including whitespace.
   * - 'semantic': normalize whitespace, ignore formatting. Default.
   * - 'structural': only structural changes (additions/removals/moves).
   */
  mode?: ComparisonMode;

  /**
   * Template syntax to use for variable extraction.
   * Default: 'auto' (detect from content).
   */
  templateSyntax?: 'auto' | 'handlebars' | 'jinja2' | 'fstring' | 'dollar';

  /**
   * Similarity threshold for section matching (0.0 to 1.0).
   * Sections with normalized similarity above this threshold are
   * considered matches. Default: 0.6.
   */
  sectionMatchThreshold?: number;

  /**
   * Similarity threshold for move detection (0.0 to 1.0).
   * Matched elements with similarity above this threshold that
   * changed position are classified as moves. Default: 0.9.
   */
  moveThreshold?: number;

  /**
   * Whether to compute token-count impact for each change.
   * Default: true.
   */
  tokenCounting?: boolean;

  /**
   * Custom section detection patterns. Augments the built-in
   * section detectors with additional patterns.
   */
  customSectionPatterns?: SectionPattern[];

  /**
   * Patterns to ignore when computing diffs. Changes matching
   * these patterns are excluded from the result.
   */
  ignorePatterns?: IgnorePattern[];
}

/** A custom section detection pattern. */
interface SectionPattern {
  /** Pattern name for identification. */
  name: string;

  /** Regex matching the section start marker. */
  startPattern: RegExp;

  /** Regex matching the section end marker (optional; section ends at next section start if omitted). */
  endPattern?: RegExp;

  /** How to extract the section title from the start pattern match. */
  titleGroup?: number;
}

/** A pattern for ignoring specific changes. */
interface IgnorePattern {
  /** What to ignore: regex matching text to exclude from diff consideration. */
  pattern: RegExp;

  /** Where to apply: 'content' (ignore matching text changes) or 'section' (ignore entire sections matching the pattern). */
  scope: 'content' | 'section';
}

// ── Prompt Structure ─────────────────────────────────────────────────

/** The parsed structural representation of a prompt. */
interface PromptStructure {
  /** The raw source text. */
  source: string;

  /** Detected prompt format. */
  format: 'plain-text' | 'message-array' | 'anthropic' | 'structured';

  /** Detected template syntax (if any). */
  templateSyntax: 'handlebars' | 'jinja2' | 'fstring' | 'dollar' | 'none' | 'mixed';

  /** Role blocks in order of appearance. */
  roles: RoleBlock[];

  /** All detected sections across all role blocks. */
  sections: Section[];

  /** All detected template variables. */
  variables: Variable[];

  /** All detected instructions. */
  instructions: Instruction[];

  /** All detected constraints. */
  constraints: Constraint[];

  /** All detected example blocks. */
  examples: ExampleBlock[];

  /** Detected output format specification (if any). */
  outputFormat: OutputFormatSpec | null;

  /** Total character count. */
  characterCount: number;

  /** Estimated token count (rough: chars / 4). */
  estimatedTokens: number;
}

/** A role block within the prompt. */
interface RoleBlock {
  /** The role identifier. */
  role: 'system' | 'user' | 'assistant' | 'unknown';

  /** The raw content of this role block. */
  content: string;

  /** Character offset range in the source text. */
  startOffset: number;
  endOffset: number;

  /** Sections within this role block. */
  sections: Section[];
}

/** A logical section within a role block. */
interface Section {
  /** Section title (null for untitled sections delimited by horizontal rules). */
  title: string | null;

  /** How the section boundary was detected. */
  type: 'header' | 'xml-tag' | 'label' | 'separator';

  /** The raw content of this section. */
  content: string;

  /** Character offset range in the source text. */
  startOffset: number;
  endOffset: number;

  /** Index of the parent role block. */
  roleIndex: number;

  /** Position index within the parent role block's sections. */
  positionIndex: number;
}

/** A template variable. */
interface Variable {
  /** The variable name. */
  name: string;

  /** The template syntax used. */
  syntax: 'handlebars' | 'jinja2' | 'fstring' | 'dollar';

  /** All occurrence offsets in the source text. */
  occurrences: Array<{ startOffset: number; endOffset: number }>;
}

/** An instruction directive. */
interface Instruction {
  /** The instruction text. */
  text: string;

  /** Character offset range. */
  startOffset: number;
  endOffset: number;

  /** Parent section index (null if not within a detected section). */
  sectionIndex: number | null;
}

/** A constraint directive. */
interface Constraint {
  /** The constraint text. */
  text: string;

  /** Character offset range. */
  startOffset: number;
  endOffset: number;

  /** Extracted numeric limit value (if any). */
  numericValue: number | null;

  /** Parent section index. */
  sectionIndex: number | null;
}

/** A few-shot example block. */
interface ExampleBlock {
  /** The raw content of the example block. */
  content: string;

  /** Individual examples within the block. */
  examples: SingleExample[];

  /** Character offset range. */
  startOffset: number;
  endOffset: number;

  /** Parent section index. */
  sectionIndex: number | null;
}

/** A single example within an example block. */
interface SingleExample {
  /** The input portion (if detectable). */
  input: string | null;

  /** The output portion (if detectable). */
  output: string | null;

  /** The full text of this example. */
  text: string;

  /** Index within the parent example block. */
  index: number;
}

/** An output format specification. */
interface OutputFormatSpec {
  /** The detected format type. */
  format: 'json' | 'yaml' | 'markdown' | 'csv' | 'xml' | 'plain-text' | 'custom';

  /** The raw text of the format specification. */
  content: string;

  /** Character offset range. */
  startOffset: number;
  endOffset: number;
}

// ── Diff Result ──────────────────────────────────────────────────────

/** A single change in the diff. */
interface PromptChange {
  /** The semantic change type. */
  type: ChangeType;

  /** The structural category. */
  category: 'role' | 'section' | 'variable' | 'example' | 'instruction' | 'constraint' | 'output-format' | 'formatting';

  /** Severity heuristic for this change. */
  severity: 'high' | 'medium' | 'low' | 'none';

  /**
   * Structural path identifying where the change occurred.
   * E.g., 'roles[0].sections[2]', 'variables.user_name'.
   */
  path: string;

  /** Content/value in prompt A (null for additions). */
  before: string | null;

  /** Content/value in prompt B (null for removals). */
  after: string | null;

  /**
   * Fine-grained word-level text diff for modified elements.
   * Each segment is marked as 'added', 'removed', or 'unchanged'.
   */
  textDiff: DiffSegment[] | null;

  /** Estimated tokens added by this change. */
  tokensAdded: number;

  /** Estimated tokens removed by this change. */
  tokensRemoved: number;

  /** Human-readable description of this change. */
  description: string;
}

/** A change type identifier. */
type ChangeType =
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

/** A segment of a fine-grained text diff. */
interface DiffSegment {
  /** The text content of this segment. */
  text: string;

  /** Whether this segment was added, removed, or unchanged. */
  type: 'added' | 'removed' | 'unchanged';
}

/** Token impact summary. */
interface TokenImpact {
  /** Total estimated tokens added across all changes. */
  totalAdded: number;

  /** Total estimated tokens removed across all changes. */
  totalRemoved: number;

  /** Net token delta (positive = prompt grew, negative = prompt shrank). */
  net: number;

  /** Estimated token count of prompt A. */
  beforeTokens: number;

  /** Estimated token count of prompt B. */
  afterTokens: number;
}

/** The complete diff result returned by diff(). */
interface PromptDiff {
  /** Whether the two prompts are identical (no changes). */
  identical: boolean;

  /** All changes, sorted by severity (high first) then by position. */
  changes: PromptChange[];

  /** Human-readable one-line summary of all changes. */
  summary: string;

  /** Token impact analysis. */
  tokenImpact: TokenImpact;

  /** The comparison mode that was used. */
  mode: ComparisonMode;

  /** The parsed structure of prompt A. */
  structureA: PromptStructure;

  /** The parsed structure of prompt B. */
  structureB: PromptStructure;

  /** Wall-clock time for the diff analysis, in milliseconds. */
  durationMs: number;

  /** ISO 8601 timestamp of when the diff was performed. */
  timestamp: string;

  /** Count of changes by category. */
  changeCounts: Record<string, number>;

  /** Count of changes by severity. */
  severityCounts: Record<'high' | 'medium' | 'low' | 'none', number>;
}
```

### Example: Diff Two Plain Text Prompts

```typescript
import { diff } from 'prompt-diff';

const result = diff(
  `You are a helpful assistant.
Answer questions about our product.
Be concise.`,
  `You are a knowledgeable product specialist.
Answer questions about our product catalog.
Be concise. Respond in JSON format.`,
);

// result.changes:
// - instruction-modified: "You are a helpful assistant" -> "You are a knowledgeable product specialist"
// - instruction-modified: "Answer questions about our product" -> "Answer questions about our product catalog"
// - instruction-added: "Respond in JSON format."
// result.tokenImpact.net: +8
```

### Example: Diff Message Arrays

```typescript
import { diff } from 'prompt-diff';

const result = diff(
  [
    { role: 'system', content: 'You are a code reviewer.' },
    { role: 'user', content: '{{code}}' },
  ],
  [
    { role: 'system', content: 'You are a senior code reviewer. Focus on security issues.' },
    { role: 'user', content: '{{source_code}}' },
  ],
);

// result.changes:
// - role-content-changed: system role modified
// - instruction-added: "Focus on security issues."
// - variable-renamed: {{code}} -> {{source_code}}
```

### Example: Diff Files

```typescript
import { diff } from 'prompt-diff';

const result = diff(
  { file: './prompts/v1/system-prompt.md' },
  { file: './prompts/v2/system-prompt.md' },
  { mode: 'semantic' },
);
```

### Helper Export: `parse`

A function that parses a single prompt into a `PromptStructure` without computing a diff. Useful for inspecting prompt structure or building custom analysis tools.

```typescript
import { parse } from 'prompt-diff';

const structure = parse(`
## Instructions
You are a code reviewer. Review code for bugs and security issues.

## Output Format
Respond in JSON with fields: line, severity, description.

## Examples
Example 1:
Input: function add(a, b) { return a + b; }
Output: {"issues": []}
`);

console.log(structure.format);           // 'plain-text'
console.log(structure.sections.length);  // 3 (Instructions, Output Format, Examples)
console.log(structure.examples.length);  // 1
console.log(structure.outputFormat);     // { format: 'json', ... }
console.log(structure.estimatedTokens);  // ~60
```

**Signature:**

```typescript
function parse(
  source: PromptInput,
  options?: {
    templateSyntax?: 'auto' | 'handlebars' | 'jinja2' | 'fstring' | 'dollar';
    customSectionPatterns?: SectionPattern[];
  },
): PromptStructure;
```

### Helper Export: `format`

Renders a `PromptDiff` into a displayable string in the specified format.

```typescript
import { diff, format } from 'prompt-diff';

const result = diff(promptA, promptB);

console.log(format(result, 'terminal'));   // Colored terminal output
console.log(format(result, 'json'));       // JSON string
console.log(format(result, 'markdown'));   // Markdown for PR comments
console.log(format(result, 'summary'));    // One-line-per-change summary
console.log(format(result, 'patch'));      // Applicable patch format
```

**Signature:**

```typescript
type OutputFormat = 'terminal' | 'json' | 'markdown' | 'summary' | 'patch';

function format(diff: PromptDiff, outputFormat: OutputFormat): string;
```

### Helper Export: `apply`

Applies a `PromptDiff` as a patch to transform prompt A into prompt B. This enables prompt patching workflows where changes are computed once and applied to multiple prompt variants.

```typescript
import { diff, apply } from 'prompt-diff';

const patch = diff(promptV1, promptV2);
const transformed = apply(promptV1, patch);

// transformed === promptV2 (modulo whitespace normalization in semantic mode)
```

**Signature:**

```typescript
function apply(prompt: string, diff: PromptDiff): string;
```

### Helper Export: `summarize`

Returns a concise human-readable summary of the changes, suitable for changelog entries, commit messages, or notification text.

```typescript
import { diff, summarize } from 'prompt-diff';

const result = diff(promptV1, promptV2);

console.log(summarize(result));
// "3 changes: 1 instruction modified, 1 example added, variable {{name}} renamed to {{full_name}}. Token impact: +45 tokens."
```

**Signature:**

```typescript
function summarize(diff: PromptDiff): string;
```

---

## 9. Output Formats

### Terminal (Colored)

The default format for CLI use. Produces a colored unified diff with semantic annotations. Changes are grouped by category, with severity-colored badges. The output interleaves structural annotations (e.g., "SECTION MOVED: Examples (position 3 -> 5)") with traditional red/green text diffs for modified content.

```
$ prompt-diff v1.md v2.md

  prompt-diff v0.1.0

  Comparing: v1.md -> v2.md
  Mode: semantic

  ╔══════════════════════════════════════════════════════╗
  ║  3 changes (1 high, 1 medium, 1 low severity)       ║
  ║  Token impact: +45 tokens (320 -> 365)               ║
  ╚══════════════════════════════════════════════════════╝

  HIGH   constraint-removed              section: Rules
         - "Limit responses to 3 sentences."
         Constraint was removed entirely.

  MEDIUM instruction-modified            section: Instructions
         - "Answer questions about our product."
         + "Answer questions about our product catalog using only provided context."

  LOW    section-moved                   section: Examples
         Section "Examples" moved from position 3 to position 5.

  ─────────────────────────────────────────────────────────
  1 high, 1 medium, 1 low severity changes
  Token impact: +45 tokens (320 -> 365)
  Analyzed in 4ms
```

### JSON

Machine-readable structured output. Outputs the complete `PromptDiff` object as a JSON string to stdout. Suitable for programmatic consumption by CI tools, dashboards, and custom formatters.

```
$ prompt-diff v1.md v2.md --format json
```

Outputs the `PromptDiff` object as JSON. All fields are included: `identical`, `changes`, `summary`, `tokenImpact`, `mode`, `changeCounts`, `severityCounts`, `durationMs`, and `timestamp`. The `structureA` and `structureB` fields are omitted from JSON output by default to reduce size; include them with `--include-structures`.

### Markdown

Formatted for embedding in pull request comments, documentation, or changelog entries. Produces a markdown document with a summary table, categorized change list, and optional text diffs in fenced code blocks.

```markdown
## Prompt Diff: v1.md -> v2.md

| Metric | Value |
|---|---|
| Changes | 3 |
| High severity | 1 |
| Medium severity | 1 |
| Low severity | 1 |
| Token impact | +45 tokens (320 -> 365) |

### High Severity

- **constraint-removed** (Rules): Removed constraint "Limit responses to 3 sentences."

### Medium Severity

- **instruction-modified** (Instructions): "Answer questions about our product." -> "Answer questions about our product catalog using only provided context."

### Low Severity

- **section-moved** (Examples): Section "Examples" moved from position 3 to position 5.
```

### Summary

One-line-per-change human-readable output. Designed for quick scanning and for inclusion in commit messages or notification text.

```
$ prompt-diff v1.md v2.md --format summary

[HIGH] constraint-removed: Removed "Limit responses to 3 sentences." from Rules
[MEDIUM] instruction-modified: Changed "Answer questions about our product." in Instructions
[LOW] section-moved: Moved "Examples" from position 3 to position 5
Token impact: +45 tokens (320 -> 365)
```

### Patch

An applicable patch format that can be used with the `apply` function to transform one prompt into another. The patch is a JSON document containing the ordered list of changes with their before/after values and positions.

```json
{
  "version": 1,
  "fromHash": "a1b2c3d4",
  "toHash": "e5f6g7h8",
  "mode": "semantic",
  "changes": [
    {
      "type": "constraint-removed",
      "path": "roles[0].sections[2].constraints[0]",
      "before": "Limit responses to 3 sentences.",
      "after": null,
      "offset": { "start": 245, "end": 278 }
    }
  ]
}
```

---

## 10. CLI Interface

### Installation and Invocation

```bash
# Global install
npm install -g prompt-diff
prompt-diff v1.md v2.md

# npx (no install)
npx prompt-diff v1.md v2.md

# Package script
# package.json: { "scripts": { "diff:prompts": "prompt-diff prompts/v1.md prompts/v2.md" } }
npm run diff:prompts
```

### CLI Binary Name

`prompt-diff`

### Commands and Flags

```
prompt-diff <file-a> <file-b> [options]
prompt-diff --stdin-a <file-b> [options]

Positional arguments:
  file-a                   Path to the first (original/before) prompt file.
  file-b                   Path to the second (modified/after) prompt file.

Input options:
  --stdin-a                Read prompt A from stdin instead of a file.
  --stdin-b                Read prompt B from stdin instead of a file.
  --format-in <format>     Input format hint. Values: auto, text, messages,
                           anthropic. Default: auto.
  --template-syntax <syn>  Template syntax. Values: auto, handlebars, jinja2,
                           fstring, dollar. Default: auto.

Comparison options:
  --mode <mode>            Comparison mode. Values: strict, semantic,
                           structural. Default: semantic.
  --section-threshold <n>  Section matching threshold (0.0-1.0).
                           Default: 0.6.
  --move-threshold <n>     Move detection threshold (0.0-1.0).
                           Default: 0.9.
  --no-token-count         Disable token-count impact analysis.

Output options:
  --format <format>        Output format. Values: terminal, json, markdown,
                           summary, patch. Default: terminal.
  --include-structures     Include parsed PromptStructure objects in JSON
                           output. Default: false.
  --no-color               Disable colored output.
  --severity <level>       Minimum severity to display. Values: high,
                           medium, low, none. Default: none (show all).
  --category <cat>         Filter changes by category (repeatable).
                           Values: role, section, variable, example,
                           instruction, constraint, output-format, formatting.

Ignore options:
  --ignore-whitespace      Equivalent to --mode semantic for whitespace
                           handling.
  --ignore-formatting      Ignore markdown formatting changes (bold,
                           italic, heading levels).
  --ignore-sections <pat>  Ignore sections matching the given regex pattern
                           (repeatable).

General:
  --version                Print version and exit.
  --help                   Print help and exit.
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | No differences found. The two prompts are identical (within the configured comparison mode). |
| `1` | Differences found. One or more changes detected. |
| `2` | Configuration error. Invalid flags, missing input files, file read failure, or invalid format. |

### Piping Examples

```bash
# Compare a prompt from stdin with a file
echo "You are a helpful assistant." | prompt-diff --stdin-a ./current-prompt.md

# Pipe diff output into a PR comment
prompt-diff v1.md v2.md --format markdown | gh pr comment 123 --body-file -

# Use with git show to compare prompt versions
git show HEAD~1:prompts/system.md | prompt-diff --stdin-a <(git show HEAD:prompts/system.md)

# Filter to high-severity changes only
prompt-diff v1.md v2.md --severity high --format summary

# Show only variable and constraint changes
prompt-diff v1.md v2.md --category variable --category constraint
```

---

## 11. Configuration

### Configuration File

`prompt-diff` searches for a configuration file in the current directory and ancestor directories, using the first one found:

1. `.prompt-diff.json`
2. `.prompt-diff.yaml`
3. `prompt-diff` key in `package.json`

The `--config` flag overrides auto-detection.

### Configuration File Format

```json
{
  "mode": "semantic",
  "templateSyntax": "handlebars",
  "sectionMatchThreshold": 0.6,
  "moveThreshold": 0.9,
  "tokenCounting": true,
  "format": "terminal",
  "ignore": {
    "whitespace": true,
    "formatting": true,
    "sections": ["^Internal Notes$", "^Debug$"]
  },
  "customSectionPatterns": [
    {
      "name": "prompt-section",
      "startPattern": "^@section\\s+(.+)$",
      "titleGroup": 1
    }
  ],
  "severity": "none"
}
```

### Configuration Precedence

Configuration is resolved in this order (later sources override earlier):

1. Built-in defaults.
2. Configuration file (`.prompt-diff.json` or equivalent).
3. CLI flags.
4. Programmatic `DiffOptions` in API calls.

### Environment Variables

All CLI flags can be set via environment variables. Environment variables are overridden by explicit flags.

| Environment Variable | Equivalent Flag |
|---------------------|-----------------|
| `PROMPT_DIFF_MODE` | `--mode` |
| `PROMPT_DIFF_FORMAT` | `--format` |
| `PROMPT_DIFF_TEMPLATE_SYNTAX` | `--template-syntax` |
| `NO_COLOR` | `--no-color` |

---

## 12. Token-Aware Diffing

### Overview

Every change in the diff result includes an estimated token impact: how many tokens were added and removed by the change. The total token delta for the entire diff is summarized in the `tokenImpact` field.

### Token Estimation

Token estimation uses a heuristic approximation: `characters / 4`. This is a rough estimate that is reasonably accurate for English text with typical BPE tokenizers (GPT-3.5/GPT-4 use cl100k_base, which averages approximately 4 characters per token for English text). The estimate is not model-specific and will be less accurate for non-English text, code, or unusual character distributions.

The package does not depend on `tiktoken`, `gpt-tokenizer`, or any model-specific tokenizer. Users who need exact token counts should use those libraries on the `before` and `after` fields of each `PromptChange`.

### Token Impact Per Change

Each `PromptChange` includes `tokensAdded` and `tokensRemoved` fields:

- For additions (`*-added`): `tokensAdded` is the estimated token count of the new content; `tokensRemoved` is 0.
- For removals (`*-removed`): `tokensRemoved` is the estimated token count of the removed content; `tokensAdded` is 0.
- For modifications (`*-modified`, `*-changed`): both fields reflect the token count of the removed text and the added text respectively.
- For moves (`section-moved`): both fields are 0 (content is the same, just repositioned).
- For renames (`variable-renamed`, `section-renamed`): both fields reflect the token difference of the name change.

### Token Impact Summary

The `PromptDiff.tokenImpact` object provides aggregate numbers:

```typescript
{
  totalAdded: 45,      // Sum of tokensAdded across all changes
  totalRemoved: 12,    // Sum of tokensRemoved across all changes
  net: 33,             // totalAdded - totalRemoved
  beforeTokens: 320,   // Estimated tokens in prompt A
  afterTokens: 353,    // Estimated tokens in prompt B
}
```

This enables quick assessment of cost impact: a prompt change that adds 200 tokens means each API call costs more.

---

## 13. Integration

### Git Diff Driver

`prompt-diff` can be registered as a custom diff driver for git, enabling `git diff` to display semantic prompt diffs for prompt files.

**Setup:**

```bash
# .gitattributes
*.prompt diff=prompt-diff
*.system-prompt diff=prompt-diff
prompts/*.md diff=prompt-diff

# .gitconfig (local or global)
[diff "prompt-diff"]
  command = npx prompt-diff
```

When configured, `git diff` will invoke `prompt-diff` for files matching the specified patterns. The diff driver receives the old and new file paths as arguments and outputs the diff to stdout.

### CI/CD Prompt Change Detection

`prompt-diff` integrates with CI/CD pipelines to detect and gate on prompt changes.

**GitHub Actions Example:**

```yaml
name: Prompt Diff
on: pull_request

jobs:
  prompt-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install -g prompt-diff

      - name: Check for prompt changes
        run: |
          BASE_SHA=${{ github.event.pull_request.base.sha }}
          for file in $(git diff --name-only $BASE_SHA HEAD -- 'prompts/*.md'); do
            echo "## Diff: $file" >> diff-report.md
            prompt-diff \
              <(git show $BASE_SHA:$file) \
              $file \
              --stdin-a \
              --format markdown >> diff-report.md
          done

      - name: Post PR comment
        if: hashFiles('diff-report.md') != ''
        run: gh pr comment ${{ github.event.pull_request.number }} --body-file diff-report.md
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### PR Review Comment Generation

The markdown output format is designed for direct embedding in pull request comments. The summary table, categorized change list, and token impact analysis provide reviewers with a quick understanding of the prompt change without reading raw text diffs.

### Pre-commit Hook

`prompt-diff` can be used as a pre-commit hook to warn developers about high-severity prompt changes:

```bash
# .husky/pre-commit
for file in $(git diff --cached --name-only -- 'prompts/*.md'); do
  HIGH=$(npx prompt-diff <(git show HEAD:$file) $file --stdin-a --format json | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.log(d.severityCounts.high || 0);
  ")
  if [ "$HIGH" -gt 0 ]; then
    echo "WARNING: $file has $HIGH high-severity prompt changes. Review before committing."
  fi
done
```

---

## 14. Comparison Modes

### Strict Mode

Every character matters. No normalization is applied. This mode reports:

- All whitespace differences (trailing spaces, tab vs space, blank line count).
- All formatting differences (markdown bold/italic, heading levels).
- All structural differences (role/section/variable/example changes).
- All text content differences.

**Use case**: Exact reproduction verification. Confirming that a prompt migration preserved every character exactly.

### Semantic Mode (Default)

Whitespace is normalized and formatting is abstracted. Before comparison:

1. Trailing whitespace is stripped from all lines.
2. Multiple consecutive blank lines are collapsed to a single blank line.
3. Leading/trailing whitespace in section content is trimmed.
4. Variable syntax is normalized for comparison (e.g., `{{var}}` and `{{ var }}` are treated as equivalent).

This mode still reports all meaningful content and structural changes but filters out noise from formatting inconsistencies.

**Use case**: Standard prompt comparison during development and review. This is the right mode for most users.

### Structural Mode

Only structural changes are reported. Text-level modifications within matched structural elements are suppressed. This mode reports:

- Role additions and removals (not content changes within matched roles).
- Section additions, removals, and moves (not content changes within matched sections).
- Variable additions, removals, and renames.
- Example additions and removals (not modifications).
- Output format type changes (not modifications to the format specification text).

**Use case**: High-level change summary. Understanding whether the prompt's architecture changed without reading content-level diffs. Useful for automated change classification in CI pipelines.

---

## 15. Testing Strategy

### Unit Tests

Unit tests verify each component in isolation.

- **Parser tests**: For each supported format (plain text, message array, Anthropic), test that the parser correctly identifies roles, sections, variables, instructions, constraints, examples, and output format specifications. Test edge cases: empty input, very long input, deeply nested sections, mixed template syntaxes, Unicode content, prompts with no structural elements.

- **Alignment tests**: Test that structural elements are correctly matched between two prompt structures. Test title-based matching, content-similarity matching, positional matching, and the interaction between all three. Test unmatched elements (additions and removals).

- **Text diff tests**: Test word-level diffing for accuracy. Verify that the longest common subsequence is computed correctly. Test with identical text (no changes), completely different text (full replacement), minor edits, insertions, deletions, and moves.

- **Change classification tests**: For each change type in the taxonomy, provide a pair of prompts that produces that change type and verify the classification. Test edge cases: a section that was both moved and modified, a variable that was renamed and its context also changed, a constraint that was both relaxed and reworded.

- **Move detection tests**: Test that sections with identical content at different positions are classified as moves. Test that sections with similar but not identical content at different positions are classified as moves when above the threshold and as add+remove when below. Test variable rename detection with shared surrounding context.

- **Constraint classification tests**: Test numeric limit changes (relaxation and tightening). Test restriction language addition and removal. Test ambiguous changes that should be classified as `constraint-modified`.

- **Token estimation tests**: Verify that token counts are computed correctly using the characters/4 heuristic. Verify that per-change token impact sums to the total. Verify that moves have zero token impact.

- **Formatter tests**: For each output format (terminal, JSON, markdown, summary, patch), render a known diff result and verify the output matches expected strings. Verify that terminal output uses correct ANSI color codes. Verify that JSON output is valid JSON. Verify that markdown output is valid markdown.

- **Apply tests**: Test that applying a patch to prompt A produces prompt B. Test with each change type. Test with multiple simultaneous changes. Test edge cases: applying a patch to a modified prompt (conflict detection).

- **CLI parsing tests**: Verify argument parsing, environment variable fallback, flag precedence, exit codes, and error messages for invalid input.

### Integration Tests

Integration tests run the full diff pipeline (parse, align, diff, classify, format) against realistic prompt files.

- **Identical prompts**: Diff two identical prompts. Assert zero changes and `identical: true`.
- **Single change**: Diff prompts with one known change (one instruction added, one variable renamed, one section moved). Assert the correct single change is detected and classified.
- **Complex diff**: Diff two substantially different prompts with multiple change types. Assert all expected changes are detected.
- **Section reorder**: Diff prompts where sections are reordered but content is identical. Assert `section-moved` changes and no spurious add/remove.
- **Variable rename**: Diff prompts where a variable was renamed. Assert `variable-renamed` and verify the old and new names.
- **Constraint relaxation**: Diff prompts where a numeric constraint limit was increased. Assert `constraint-relaxed`.
- **Format comparison**: Diff prompts in different input formats (message array vs plain text with equivalent content). Assert that format differences do not produce false changes in structural content.
- **CLI end-to-end**: Run the CLI binary against test fixture files and verify exit codes, stdout output, and stderr output for each output format.

### Edge Cases to Test

- Empty prompt (empty string, empty file).
- Prompt containing only whitespace.
- Two empty prompts (identical, zero changes).
- Prompt A is empty, prompt B has content (all additions).
- Prompt A has content, prompt B is empty (all removals).
- Prompt with thousands of variables (performance test).
- Prompt exceeding 1 MB (performance test).
- Prompts in different formats (message array A, plain text B).
- Prompt with no structural elements (pure prose, no sections/variables/examples).
- Prompt with deeply nested XML tag sections (10+ levels).
- Binary file accidentally passed as input.
- File that does not exist (error handling).
- Same file passed as both A and B (identical).

### Test Framework

Tests use Vitest, matching the project's existing `package.json` configuration. Test fixtures are stored in `src/__tests__/fixtures/` as static prompt files arranged in `before/` and `after/` directories.

---

## 16. Performance

### Parsing

The parser is a single-pass text processor. It iterates through the input text once, building the `PromptStructure` incrementally. For a 10,000-character prompt (~2,500 tokens), parsing completes in under 1ms. For a 100,000-character prompt (~25,000 tokens), parsing completes in under 5ms.

### Alignment

Section alignment uses pairwise similarity comparison. For two prompts with `n` and `m` sections respectively, the alignment phase is O(n * m). For typical prompts with fewer than 20 sections each, this completes in under 1ms. For pathological cases with 100+ sections, alignment may take up to 10ms.

### Text Diffing

The word-level diff algorithm uses a variation of the Myers diff algorithm with O(n * d) time complexity, where `n` is the number of words and `d` is the edit distance. For typical prompt sections with fewer than 500 words and small edit distances, each per-element diff completes in under 1ms. Total text diffing across all modified elements completes in under 5ms for typical prompts.

### Overall

For two typical prompts (5,000-10,000 characters each, 5-15 sections, 3-10 variables), the full diff pipeline (parse both prompts, align, diff, classify) completes in under 10ms. For two large prompts (100,000 characters each, 50+ sections), the pipeline completes in under 50ms.

### Memory

The two `PromptStructure` objects and the `PromptDiff` result hold the full source text plus parsed structures. For two 100 KB prompts (very large), the memory footprint is approximately 1.5 MB (source texts + parsed structures + diff result + text diffs). This is well within acceptable limits.

### File I/O

When diffing files from disk, each file is read entirely into memory using `node:fs/promises.readFile`. Both files are read before parsing begins. For two files averaging 5 KB each, total I/O time is under 1ms.

---

## 17. Dependencies

### Runtime Dependencies

None. `prompt-diff` has zero runtime dependencies. All functionality is implemented using Node.js built-in modules:

| Node.js Built-in | Purpose |
|---|---|
| `node:fs/promises` | Reading prompt files from disk. |
| `node:path` | File path resolution, extension detection. |
| `node:util` | `parseArgs` for CLI argument parsing (Node.js 18+). |
| `node:process` | Exit codes, stdin reading, environment variables. |
| `node:crypto` | Hash computation for patch file integrity (createHash). |

### Why Zero Dependencies

- **No jsdiff**: The word-level diff algorithm is implemented from scratch using the Myers algorithm approach. The implementation is specialized for prompt text (word tokenization, whitespace handling) and is simpler than jsdiff's general-purpose API. jsdiff is 50KB; the prompt-diff diff engine is under 5KB.
- **No diff-match-patch**: Character-level diffing is not needed. Prompt diffs operate at the word level for readability, and at the structural element level for semantic classification.
- **No CLI framework**: `node:util.parseArgs` (available since Node.js 18) handles all flag parsing. No dependency on `commander`, `yargs`, or `meow`.
- **No chalk/colors**: Terminal coloring uses ANSI escape codes directly. Color detection uses `process.stdout.isTTY` and the `NO_COLOR` environment variable.
- **No tokenizer**: Token estimation uses the characters/4 heuristic. Exact tokenization is a non-goal.

### Dev Dependencies

| Dependency | Purpose |
|---|---|
| `typescript` | TypeScript compiler. |
| `vitest` | Test runner. |
| `eslint` | Linter for source code. |

---

## 18. File Structure

```
prompt-diff/
  package.json
  tsconfig.json
  SPEC.md
  README.md
  .prompt-diff.json                 Example config (also used for self-testing)
  src/
    index.ts                        Public API exports: diff, parse, format,
                                    apply, summarize, and all types.
    cli.ts                          CLI entry point: argument parsing, file I/O,
                                    formatting, exit codes.
    types.ts                        All TypeScript type definitions.
    diff.ts                         Core diff() function: parse + align + diff
                                    + classify.
    parser/
      index.ts                      Parser entry point: format detection, dispatch.
      parse-plain-text.ts           Plain text prompt parser.
      parse-messages.ts             Message array parser (OpenAI, Anthropic).
      role-detector.ts              Role boundary detection heuristics.
      section-detector.ts           Section detection (headers, XML tags, labels).
      variable-extractor.ts         Template variable extraction (all syntaxes).
      instruction-detector.ts       Instruction and directive detection.
      constraint-detector.ts        Constraint and restriction detection.
      example-detector.ts           Few-shot example block detection.
      output-format-detector.ts     Output format specification detection.
    align/
      index.ts                      Alignment entry point: orchestrates all
                                    alignment phases.
      role-aligner.ts               Role block alignment by role identifier.
      section-aligner.ts            Section alignment by title and content
                                    similarity.
      variable-aligner.ts           Variable alignment and rename detection.
      example-aligner.ts            Example block alignment by index and content.
      instruction-aligner.ts        Instruction and constraint alignment by
                                    text similarity.
      similarity.ts                 Text similarity functions (Jaccard, normalized
                                    edit distance, word overlap).
    engine/
      index.ts                      Diff engine entry point.
      text-diff.ts                  Word-level text diff (Myers algorithm).
      change-classifier.ts          Classifies aligned pairs into ChangeType values.
      constraint-classifier.ts      Determines relaxation/tightening for constraint
                                    changes.
      token-counter.ts              Token estimation (chars / 4) and per-change
                                    impact computation.
      move-detector.ts              Move detection for sections and elements.
      rename-detector.ts            Variable rename detection by surrounding context.
    formatters/
      index.ts                      Formatter factory: dispatches to specific
                                    formatters.
      terminal.ts                   Colored terminal output with ANSI codes.
      json.ts                       JSON output.
      markdown.ts                   Markdown output for PR comments.
      summary.ts                    One-line-per-change summary output.
      patch.ts                      Applicable patch format output.
    apply.ts                        Patch application: apply() function.
    summarize.ts                    Summary generation: summarize() function.
    utils/
      text.ts                       Text normalization, whitespace utilities,
                                    word tokenization.
      hash.ts                       Content hashing for patch integrity.
  src/__tests__/
    parser/
      parse-plain-text.test.ts
      parse-messages.test.ts
      variable-extractor.test.ts
      instruction-detector.test.ts
      constraint-detector.test.ts
      section-detector.test.ts
      example-detector.test.ts
    align/
      section-aligner.test.ts
      variable-aligner.test.ts
      similarity.test.ts
    engine/
      text-diff.test.ts
      change-classifier.test.ts
      constraint-classifier.test.ts
      move-detector.test.ts
      rename-detector.test.ts
    formatters/
      terminal.test.ts
      json.test.ts
      markdown.test.ts
      summary.test.ts
      patch.test.ts
    apply.test.ts
    diff.test.ts                    Integration tests for the full diff pipeline.
    cli.test.ts                     CLI end-to-end tests.
    fixtures/
      before/
        simple-prompt.md
        multi-section-prompt.md
        message-array.json
        anthropic-format.json
        template-with-variables.md
        prompt-with-examples.md
        prompt-with-constraints.md
        empty.md
        large-prompt.md
      after/
        simple-prompt-modified.md
        multi-section-reordered.md
        message-array-modified.json
        anthropic-format-modified.json
        template-with-renamed-vars.md
        prompt-with-added-examples.md
        prompt-with-relaxed-constraints.md
        empty.md
        large-prompt-modified.md
  bin/
    prompt-diff.js                  CLI binary entry point.
  dist/                             Compiled output (gitignored).
```

---

## 19. Implementation Roadmap

### Phase 1: Parser and Core Diff (v0.1.0)

Implement the prompt parser and the core diff algorithm with basic change classification.

**Deliverables:**
- Prompt parser with format detection, role detection, section detection, variable extraction, instruction detection, and constraint detection.
- `parse()` function exposed as a public API.
- Structural alignment: role alignment, section alignment (title matching + content similarity), variable alignment.
- Word-level text diff engine (Myers algorithm).
- Basic change classification: `role-added`, `role-removed`, `role-content-changed`, `section-added`, `section-removed`, `section-modified`, `variable-added`, `variable-removed`, `instruction-added`, `instruction-removed`, `instruction-modified`.
- `diff()` function with `strict` and `semantic` modes.
- Token estimation and per-change token impact.
- `format()` function with `terminal` and `json` output.
- `summarize()` function.
- CLI with positional file arguments, `--mode`, `--format`, and exit codes.
- Unit tests for all parser components, alignment, text diff, and classification.
- Integration tests with fixture prompt pairs.

### Phase 2: Advanced Classification and Formatters (v0.2.0)

Add move detection, rename detection, constraint classification, and remaining output formats.

**Deliverables:**
- Section move detection.
- Variable rename detection by surrounding context analysis.
- Constraint relaxation/tightening classification: `constraint-added`, `constraint-removed`, `constraint-relaxed`, `constraint-tightened`, `constraint-modified`.
- Example block detection and alignment: `example-added`, `example-removed`, `example-modified`.
- Output format detection: `output-format-changed`.
- Formatting change classification: `whitespace-only`, `formatting-only`.
- `section-moved`, `section-renamed` change types.
- `structural` comparison mode.
- Change severity heuristic assignment.
- `format()` function with `markdown`, `summary`, and `patch` output.
- `apply()` function for patch application.
- Configuration file support (`.prompt-diff.json`).
- `--severity`, `--category`, and filter flags in CLI.

### Phase 3: Advanced Parsing and Integration (v0.3.0)

Add message array parsing, advanced configuration, and CI/CD integration.

**Deliverables:**
- Message array (OpenAI) and Anthropic format parsing.
- Custom section pattern support via configuration.
- Ignore patterns for sections and content.
- `--stdin-a`, `--stdin-b` CLI flags.
- Git diff driver documentation and setup instructions.
- GitHub Actions integration example.
- Pre-commit hook documentation.
- Environment variable configuration.
- `--ignore-whitespace`, `--ignore-formatting`, `--ignore-sections` flags.
- `--include-structures` flag for JSON output.

### Phase 4: Polish and 1.0 (v1.0.0)

Stabilize the API, optimize performance, and prepare for broad adoption.

**Deliverables:**
- API stability guarantee (semver major version).
- Complete README with usage examples, output samples, and configuration guide.
- Published npm package with TypeScript declarations.
- Performance optimization for large prompt files (lazy parsing, streaming alignment).
- Comprehensive edge case testing.
- `prompt-lint` integration documentation (shared parser potential).
- CHANGELOG.

---

## 20. Example Use Cases

### 20.1 Iterating on a System Prompt

A developer modifies a system prompt to add error handling and tighten output constraints.

**Prompt A (v1):**

```markdown
## Instructions
You are a customer support assistant for ACME Corp.
Answer questions about our products using the provided context.

## Output Format
Respond in JSON with fields: answer, confidence.

## Examples
Example 1:
Input: What is the return policy?
Output: {"answer": "30-day returns on all products.", "confidence": 0.95}
```

**Prompt B (v2):**

```markdown
## Instructions
You are a customer support specialist for ACME Corp.
Answer questions about our products using only the provided context.
If the context does not contain enough information, respond with an error.

## Output Format
Respond in JSON with fields: answer, confidence, sources.

## Rules
- Never make up information not present in the context.
- Limit responses to 3 sentences.

## Examples
Example 1:
Input: What is the return policy?
Output: {"answer": "30-day returns on all products.", "confidence": 0.95, "sources": ["FAQ #12"]}

Example 2:
Input: What is the CEO's favorite color?
Output: {"error": "insufficient_context", "message": "This information is not in the provided context."}
```

**Diff output (summary format):**

```
$ prompt-diff v1.md v2.md --format summary

[MEDIUM] instruction-modified: "customer support assistant" -> "customer support specialist" in Instructions
[MEDIUM] constraint-tightened: "using the provided context" -> "using only the provided context" in Instructions
[MEDIUM] instruction-added: "If the context does not contain enough information, respond with an error." in Instructions
[MEDIUM] output-format-changed: Added field "sources" to JSON output schema
[MEDIUM] section-added: Section "Rules" added with 2 constraints
[MEDIUM] constraint-added: "Never make up information not present in the context." in Rules
[MEDIUM] constraint-added: "Limit responses to 3 sentences." in Rules
[LOW] example-modified: Example 1 output updated to include "sources" field
[MEDIUM] example-added: Example 2 added (error handling case)
Token impact: +180 tokens (85 -> 265)
```

### 20.2 Detecting a Variable Rename

A developer renames a template variable across a prompt.

**Prompt A:**

```
Analyze the following code submitted by {{user_name}}:

<code>
{{code_input}}
</code>

Return your analysis for {{user_name}} in JSON format.
```

**Prompt B:**

```
Analyze the following code submitted by {{developer_name}}:

<code>
{{source_code}}
</code>

Return your analysis for {{developer_name}} in JSON format.
```

**Diff output (summary format):**

```
$ prompt-diff a.md b.md --format summary

[MEDIUM] variable-renamed: {{user_name}} -> {{developer_name}} (2 occurrences)
[MEDIUM] variable-renamed: {{code_input}} -> {{source_code}} (1 occurrence)
Token impact: +2 tokens
```

### 20.3 Section Reorder Detection

A developer reorders prompt sections without changing content.

**Prompt A:**

```
## Examples
Example 1: ...

## Instructions
Analyze the code for bugs.

## Output Format
Return JSON.
```

**Prompt B:**

```
## Instructions
Analyze the code for bugs.

## Output Format
Return JSON.

## Examples
Example 1: ...
```

**Diff output (summary format):**

```
$ prompt-diff a.md b.md --format summary

[LOW] section-moved: "Examples" moved from position 1 to position 3
[LOW] section-moved: "Instructions" moved from position 2 to position 1
[LOW] section-moved: "Output Format" moved from position 3 to position 2
Token impact: 0 tokens
```

A flat-text diff tool would show the entire "Examples" section as deleted from the top and re-added at the bottom, producing a large red/green diff. `prompt-diff` detects the reorder and reports three moves with zero token impact.

### 20.4 CI/CD Constraint Guard

A CI pipeline uses `prompt-diff` to block deployments that remove or relax constraints.

```yaml
- name: Check for constraint changes
  run: |
    RESULT=$(prompt-diff base-prompt.md pr-prompt.md --format json)
    RELAXED=$(echo "$RESULT" | jq '[.changes[] | select(.type == "constraint-relaxed" or .type == "constraint-removed")] | length')
    if [ "$RELAXED" -gt 0 ]; then
      echo "::error::Prompt constraints were relaxed or removed. Manual approval required."
      exit 1
    fi
```

### 20.5 Comparing Message Array Prompts

```typescript
import { diff, format } from 'prompt-diff';

const v1 = [
  { role: 'system', content: 'You are a translator. Translate text from English to Spanish.' },
  { role: 'user', content: '{{input_text}}' },
];

const v2 = [
  { role: 'system', content: 'You are a professional translator. Translate text from English to the target language.' },
  { role: 'user', content: '{{input_text}}' },
  { role: 'assistant', content: 'I will translate the text accurately, preserving tone and idioms.' },
];

const result = diff(v1, v2);
console.log(format(result, 'summary'));
// [MEDIUM] instruction-modified: "a translator" -> "a professional translator" in system role
// [MEDIUM] instruction-modified: "to Spanish" -> "to the target language" in system role
// [HIGH] role-added: assistant role added with prefill content
// Token impact: +18 tokens
```
