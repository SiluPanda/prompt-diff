# prompt-diff — Task Breakdown

This file tracks all implementation tasks derived from SPEC.md. Each task is granular, actionable, and mapped to a specific section of the specification.

---

## Phase 1: Project Scaffolding and Type Definitions

- [ ] **Install dev dependencies** — Add `typescript`, `vitest`, and `eslint` as dev dependencies in `package.json`. Verify `npm install` succeeds. | Status: not_done
- [ ] **Configure ESLint** — Create `.eslintrc` or `eslint.config.*` with TypeScript support. Ensure `npm run lint` works on the existing `src/index.ts`. | Status: not_done
- [ ] **Add CLI bin entry to package.json** — Add `"bin": { "prompt-diff": "./bin/prompt-diff.js" }` to `package.json` so the CLI is available after install. | Status: not_done
- [ ] **Create bin/prompt-diff.js** — Create the CLI binary entry point file that requires the compiled `dist/cli.js` and invokes the CLI main function. Include the `#!/usr/bin/env node` shebang. | Status: not_done
- [ ] **Create src/types.ts with all type definitions** — Define all TypeScript types and interfaces from Spec Section 8: `PromptInput`, `PromptMessage`, `AnthropicPrompt`, `ComparisonMode`, `DiffOptions`, `SectionPattern`, `IgnorePattern`, `PromptStructure`, `RoleBlock`, `Section`, `Variable`, `Instruction`, `Constraint`, `ExampleBlock`, `SingleExample`, `OutputFormatSpec`, `PromptChange`, `ChangeType`, `DiffSegment`, `TokenImpact`, `PromptDiff`, `OutputFormat`. | Status: not_done
- [ ] **Create file structure directories** — Create all directories specified in Spec Section 18: `src/parser/`, `src/align/`, `src/engine/`, `src/formatters/`, `src/utils/`, `src/__tests__/`, `src/__tests__/parser/`, `src/__tests__/align/`, `src/__tests__/engine/`, `src/__tests__/formatters/`, `src/__tests__/fixtures/before/`, `src/__tests__/fixtures/after/`, `bin/`. | Status: not_done
- [ ] **Create src/index.ts public API exports** — Set up the main entry point to re-export `diff`, `parse`, `format`, `apply`, `summarize`, and all public types from their respective modules. | Status: not_done

---

## Phase 2: Utility Modules

- [ ] **Implement src/utils/text.ts — text normalization** — Implement text normalization for semantic mode: strip trailing whitespace from lines, collapse multiple blank lines to single blank line, trim leading/trailing whitespace from section content. | Status: not_done
- [ ] **Implement src/utils/text.ts — word tokenization** — Implement word tokenizer that splits text into word tokens for the word-level diff algorithm. Handle punctuation, whitespace, and special characters. | Status: not_done
- [ ] **Implement src/utils/text.ts — whitespace utilities** — Implement helper functions: `isWhitespaceOnly(text)`, `normalizeWhitespace(text)`, `collapseBlankLines(text)`. | Status: not_done
- [ ] **Implement src/utils/hash.ts — content hashing** — Implement content hashing using `node:crypto.createHash` for patch file integrity verification. Produce short hex hashes of prompt content. | Status: not_done

---

## Phase 3: Prompt Parser

### Format Detection and Dispatch

- [ ] **Implement src/parser/index.ts — parser entry point** — Create the `parse(source, options?)` function that detects the input format and dispatches to the appropriate sub-parser. Return a `PromptStructure`. | Status: not_done
- [ ] **Implement format detection logic** — Auto-detect format per Spec Section 5: (1) JSON with `messages` array of `{role, content}` objects = message-array, (2) JSON with `system` string + `messages` array = Anthropic, (3) YAML with structured sections = structured, (4) otherwise plain-text. Also handle programmatic JS object inputs by shape. | Status: not_done
- [ ] **Handle `{ file: string }` input** — When `PromptInput` is `{ file: string }`, read the file from disk using `node:fs/promises.readFile` and then parse the content. | Status: not_done
- [ ] **Compute metadata fields on PromptStructure** — After parsing, populate `characterCount` (total chars), `estimatedTokens` (chars / 4), `format`, and `templateSyntax` fields on the returned `PromptStructure`. | Status: not_done

### Plain Text Parser

- [ ] **Implement src/parser/parse-plain-text.ts** — Parse plain text prompts into `PromptStructure`. Orchestrate role detection, section detection, variable extraction, instruction detection, constraint detection, example detection, and output format detection on the input text. | Status: not_done

### Role Detection

- [ ] **Implement src/parser/role-detector.ts — markdown header roles** — Detect role boundaries using markdown headers: `# System`, `## System Prompt`, `# User`, `# Assistant` (case-insensitive). | Status: not_done
- [ ] **Implement role-detector.ts — label pattern roles** — Detect role boundaries using label patterns: `System:`, `User:`, `Assistant:`, `Human:`, `AI:` at the start of a line. | Status: not_done
- [ ] **Implement role-detector.ts — XML tag roles** — Detect role boundaries using XML tags: `<system>`, `<user>`, `<assistant>` wrapping content blocks. | Status: not_done
- [ ] **Implement role-detector.ts — Anthropic legacy format** — Detect role boundaries using `\n\nHuman:` and `\n\nAssistant:` markers. | Status: not_done
- [ ] **Implement role-detector.ts — implicit single role** — When no role markers are detected, treat the entire text as a single implicit system role block. | Status: not_done
- [ ] **Populate RoleBlock fields** — For each detected role, create a `RoleBlock` with `role`, `content`, `startOffset`, `endOffset`, and empty `sections` array. | Status: not_done

### Section Detection

- [ ] **Implement src/parser/section-detector.ts — markdown header sections** — Detect section boundaries using `#`, `##`, `###` headers. Extract header text as section title. Set `type: 'header'`. | Status: not_done
- [ ] **Implement section-detector.ts — XML tag sections** — Detect section boundaries using XML tags: `<instructions>`, `<context>`, `<examples>`, `<output>`, `<rules>`, `<constraints>`, etc. Tag name becomes section title. Set `type: 'xml-tag'`. | Status: not_done
- [ ] **Implement section-detector.ts — labeled block sections** — Detect section boundaries using label patterns: `Instructions:`, `Output Format:`, `Examples:`, `Context:`, `Rules:`, `Constraints:` at line start. Set `type: 'label'`. | Status: not_done
- [ ] **Implement section-detector.ts — horizontal rule sections** — Detect section boundaries using `---`, `***`, `___` on their own line. Section title is null. Set `type: 'separator'`. | Status: not_done
- [ ] **Support custom section patterns** — Accept `customSectionPatterns` from `DiffOptions` and apply them alongside built-in section detectors. Custom patterns should use the `SectionPattern` interface with `startPattern`, optional `endPattern`, and `titleGroup`. | Status: not_done
- [ ] **Populate Section fields** — For each detected section, create a `Section` with `title`, `type`, `content`, `startOffset`, `endOffset`, `roleIndex`, and `positionIndex`. Assign sections to their parent `RoleBlock.sections`. | Status: not_done

### Variable Extraction

- [ ] **Implement src/parser/variable-extractor.ts — Handlebars/Mustache syntax** — Extract variables matching `{{variableName}}` pattern. | Status: not_done
- [ ] **Implement variable-extractor.ts — Jinja2 syntax** — Extract variables matching `{{ variableName }}` pattern (with spaces). | Status: not_done
- [ ] **Implement variable-extractor.ts — f-string syntax** — Extract variables matching `{variableName}` pattern. Avoid false positives from JSON/code blocks. | Status: not_done
- [ ] **Implement variable-extractor.ts — Dollar syntax** — Extract variables matching `$variableName` and `${variableName}` patterns. | Status: not_done
- [ ] **Implement variable-extractor.ts — auto-detect template syntax** — When `templateSyntax` is `'auto'`, detect the dominant syntax used in the document. Report `'mixed'` if multiple syntaxes are present. | Status: not_done
- [ ] **Populate Variable fields** — For each extracted variable, create a `Variable` with `name`, `syntax`, and `occurrences` (array of `{ startOffset, endOffset }`). | Status: not_done

### Instruction Detection

- [ ] **Implement src/parser/instruction-detector.ts — imperative verb detection** — Detect sentences starting with imperative verbs: "Write", "Generate", "Analyze", "Return", "Always", "Never", "Do not", "Make sure", "Ensure", "You must", "You should", "You will". | Status: not_done
- [ ] **Implement instruction-detector.ts — modal directive detection** — Detect sentences containing modal directives: "must", "should", "shall", "need to", "have to". | Status: not_done
- [ ] **Implement instruction-detector.ts — bullet point instructions** — Detect bullet points and numbered items within instruction-labeled sections as instructions. | Status: not_done
- [ ] **Populate Instruction fields** — For each detected instruction, create an `Instruction` with `text`, `startOffset`, `endOffset`, and `sectionIndex`. | Status: not_done

### Constraint Detection

- [ ] **Implement src/parser/constraint-detector.ts — restriction language** — Detect sentences containing: "only", "never", "do not", "must not", "cannot", "at most", "no more than", "limit to", "restrict to", "exclusively". | Status: not_done
- [ ] **Implement constraint-detector.ts — quantitative limits** — Detect sentences with quantitative limits: numbers followed by limit language ("maximum 3 sentences", "no more than 500 tokens", "limit your response to 2 paragraphs"). | Status: not_done
- [ ] **Implement constraint-detector.ts — negative imperatives** — Detect negative imperative patterns: "Do not", "Never", "Avoid", "Refrain from". | Status: not_done
- [ ] **Implement constraint-detector.ts — numeric value extraction** — Extract the numeric limit value from constraint text (e.g., "3" from "maximum 3 sentences") and store in `Constraint.numericValue`. | Status: not_done
- [ ] **Populate Constraint fields** — For each detected constraint, create a `Constraint` with `text`, `startOffset`, `endOffset`, `numericValue`, and `sectionIndex`. | Status: not_done

### Example Block Detection

- [ ] **Implement src/parser/example-detector.ts — labeled example sections** — Detect sections explicitly labeled "Examples", "Example", "Few-shot examples". | Status: not_done
- [ ] **Implement example-detector.ts — numbered example patterns** — Detect numbered patterns: `Example 1:`, `1.`, `1)` followed by structured content. | Status: not_done
- [ ] **Implement example-detector.ts — input/output pair detection** — Detect input/output pairs: `Input:` / `Output:`, `Q:` / `A:`, `User:` / `Assistant:` within example sections. | Status: not_done
- [ ] **Implement example-detector.ts — XML-tagged examples** — Detect `<example>` and `<examples>` XML tags. | Status: not_done
- [ ] **Populate ExampleBlock and SingleExample fields** — For each detected example block, create an `ExampleBlock` with `content`, `examples` (array of `SingleExample` with `input`, `output`, `text`, `index`), `startOffset`, `endOffset`, and `sectionIndex`. | Status: not_done

### Output Format Detection

- [ ] **Implement src/parser/output-format-detector.ts — labeled output sections** — Detect sections labeled "Output Format", "Response Format", "Output", "Expected Output". | Status: not_done
- [ ] **Implement output-format-detector.ts — JSON/YAML schema blocks** — Detect fenced code blocks with `json` or `yaml` language markers containing schema-like structures. | Status: not_done
- [ ] **Implement output-format-detector.ts — explicit format instructions** — Detect instructions like "Respond in JSON", "Return a JSON object", "Format your response as", "Use the following schema". | Status: not_done
- [ ] **Implement output-format-detector.ts — format type classification** — Classify the detected format as `'json'`, `'yaml'`, `'markdown'`, `'csv'`, `'xml'`, `'plain-text'`, or `'custom'`. | Status: not_done
- [ ] **Populate OutputFormatSpec fields** — Create an `OutputFormatSpec` with `format`, `content`, `startOffset`, and `endOffset`. Set `PromptStructure.outputFormat` to null if no output format is detected. | Status: not_done

### Message Array Parser

- [ ] **Implement src/parser/parse-messages.ts — OpenAI format** — Parse `PromptMessage[]` (array of `{role, content}` objects) into `PromptStructure`. Each message becomes a `RoleBlock`. Run section detection, variable extraction, instruction detection, constraint detection, example detection, and output format detection on each message's content. | Status: not_done
- [ ] **Implement parse-messages.ts — Anthropic format** — Parse `AnthropicPrompt` (object with `system` string and `messages` array) into `PromptStructure`. The `system` field becomes a system `RoleBlock`. Each message becomes its corresponding `RoleBlock`. | Status: not_done

---

## Phase 4: Structural Alignment

- [ ] **Implement src/align/index.ts — alignment orchestrator** — Create the main alignment function that takes two `PromptStructure` objects and returns alignment mappings for roles, sections, variables, examples, instructions, and constraints. | Status: not_done

### Role Alignment

- [ ] **Implement src/align/role-aligner.ts** — Match roles by role identifier (system-to-system, user-to-user, assistant-to-assistant). Mark roles present in A but not B as removed. Mark roles present in B but not A as added. | Status: not_done

### Section Alignment

- [ ] **Implement src/align/section-aligner.ts — Pass 1: title matching** — For each pair of matched role blocks, match sections with identical titles (case-insensitive) regardless of position. This handles section reordering. | Status: not_done
- [ ] **Implement section-aligner.ts — Pass 2: content similarity matching** — For unmatched sections after Pass 1, compute normalized content similarity (Jaccard similarity on word sets). Match sections with similarity above `sectionMatchThreshold` (default 0.6). This handles renamed sections. | Status: not_done
- [ ] **Implement section-aligner.ts — unmatched handling** — Sections in A with no match are marked as removed. Sections in B with no match are marked as added. | Status: not_done

### Similarity Functions

- [ ] **Implement src/align/similarity.ts — Jaccard similarity** — Implement Jaccard similarity on word sets: `|intersection| / |union|`. Used for section content similarity. | Status: not_done
- [ ] **Implement similarity.ts — normalized text similarity** — Implement normalized text comparison that collapses whitespace, lowercases, and computes word-level overlap. Used for instruction/constraint alignment. | Status: not_done

### Variable Alignment

- [ ] **Implement src/align/variable-aligner.ts — name matching** — Match variables by identical name across both prompts. | Status: not_done
- [ ] **Implement variable-aligner.ts — rename candidate detection** — For unmatched variables (removed from A, added in B), check if they share identical surrounding context (text before and after the variable reference). Flag as rename candidates. | Status: not_done

### Example Alignment

- [ ] **Implement src/align/example-aligner.ts** — Align examples within matched example sections by index (example 1 to example 1, etc.). When the number of examples differs, mark trailing examples as added or removed. When content similarity is below threshold, fall back to positional alignment. | Status: not_done

### Instruction and Constraint Alignment

- [ ] **Implement src/align/instruction-aligner.ts** — Align instructions and constraints within matched sections using normalized text similarity. Exact matches first, then near-matches with similarity above 0.7. Mark unmatched as added/removed. | Status: not_done

---

## Phase 5: Diff Engine

### Text Diff

- [ ] **Implement src/engine/text-diff.ts — Myers diff algorithm** — Implement a word-level diff algorithm based on Myers' algorithm (longest common subsequence). Split text into word tokens, compute LCS, identify inserted/deleted/unchanged words. | Status: not_done
- [ ] **Implement text-diff.ts — hunk grouping** — Group contiguous changes into hunks for readable output. Each hunk contains a sequence of `DiffSegment` objects marked as `'added'`, `'removed'`, or `'unchanged'`. | Status: not_done
- [ ] **Implement text-diff.ts — comparison mode normalization** — For `semantic` mode, normalize text before diffing (collapse whitespace, trim). For `strict` mode, compare as-is. For `structural` mode, suppress text diffs entirely. | Status: not_done

### Change Classification

- [ ] **Implement src/engine/change-classifier.ts — role changes** — Classify role changes: `role-added`, `role-removed`, `role-content-changed`. | Status: not_done
- [ ] **Implement change-classifier.ts — section changes** — Classify section changes: `section-added`, `section-removed`, `section-modified`, `section-moved`, `section-renamed`. | Status: not_done
- [ ] **Implement change-classifier.ts — variable changes** — Classify variable changes: `variable-added`, `variable-removed`, `variable-renamed`. | Status: not_done
- [ ] **Implement change-classifier.ts — example changes** — Classify example changes: `example-added`, `example-removed`, `example-modified`. | Status: not_done
- [ ] **Implement change-classifier.ts — instruction changes** — Classify instruction changes: `instruction-added`, `instruction-removed`, `instruction-modified`. | Status: not_done
- [ ] **Implement change-classifier.ts — constraint changes** — Classify constraint changes: `constraint-added`, `constraint-removed`, `constraint-relaxed`, `constraint-tightened`, `constraint-modified`. | Status: not_done
- [ ] **Implement change-classifier.ts — output format changes** — Classify output format changes: `output-format-changed`. | Status: not_done
- [ ] **Implement change-classifier.ts — formatting changes** — Classify formatting-only changes: `whitespace-only`, `formatting-only`. Detect when only whitespace or markdown formatting (bold/italic, indentation) differs. | Status: not_done
- [ ] **Implement change-classifier.ts — severity assignment** — Assign severity to each change per Spec Section 7: `high` (role-added, role-removed, constraint-removed, constraint-relaxed, output-format-changed, variable-removed), `medium` (most content changes), `low` (section-modified, section-moved, section-renamed), `none` (whitespace-only, formatting-only). | Status: not_done
- [ ] **Generate human-readable description per change** — For each `PromptChange`, generate a `description` string (e.g., "Section 'Examples' moved from position 3 to position 5", "Variable {{name}} renamed to {{full_name}}"). | Status: not_done

### Constraint Classification

- [ ] **Implement src/engine/constraint-classifier.ts — numeric limit changes** — Detect when a numeric value in a constraint increased (relaxed) or decreased (tightened). | Status: not_done
- [ ] **Implement constraint-classifier.ts — restriction language changes** — Detect when restrictive language ("only", "never", "must not") was added (tightened) or removed (relaxed). | Status: not_done
- [ ] **Implement constraint-classifier.ts — ambiguous changes** — When a constraint change cannot be clearly classified as relaxation or tightening, report as `constraint-modified`. | Status: not_done

### Move Detection

- [ ] **Implement src/engine/move-detector.ts** — For matched pairs where element index in A differs from index in B, compute normalized content similarity. If similarity exceeds `moveThreshold` (default 0.9), classify as `section-moved`. Otherwise classify as removal + addition. | Status: not_done

### Rename Detection

- [ ] **Implement src/engine/rename-detector.ts** — For removed variables from A and added variables in B, examine surrounding text context. If a removed and added variable share identical surrounding context, match them as `variable-renamed`. Also detect section renames where title changed but content is similar. | Status: not_done

### Token Counting

- [ ] **Implement src/engine/token-counter.ts — per-change token impact** — For each `PromptChange`, compute `tokensAdded` and `tokensRemoved` using chars/4 heuristic. Additions: tokensAdded = len(after)/4, tokensRemoved = 0. Removals: inverse. Modifications: both. Moves: both = 0. | Status: not_done
- [ ] **Implement token-counter.ts — aggregate TokenImpact** — Compute `totalAdded`, `totalRemoved`, `net`, `beforeTokens`, and `afterTokens` by summing per-change values and estimating prompt-level token counts. | Status: not_done

### Core Diff Function

- [ ] **Implement src/engine/index.ts — diff engine entry point** — Orchestrate the diff engine: receive aligned pairs, compute text diffs, classify changes, detect moves and renames, compute token impact. Return array of `PromptChange` objects. | Status: not_done
- [ ] **Implement src/diff.ts — main diff() function** — Implement the top-level `diff(promptA, promptB, options?)` function that runs all four phases (parse, align, diff, classify), measures execution time, and returns a complete `PromptDiff` object with `identical`, `changes`, `summary`, `tokenImpact`, `mode`, `structureA`, `structureB`, `durationMs`, `timestamp`, `changeCounts`, and `severityCounts`. | Status: not_done
- [ ] **Implement diff.ts — sorting changes** — Sort changes by severity (high first), then by position within the prompt. | Status: not_done
- [ ] **Implement diff.ts — changeCounts and severityCounts** — Compute `changeCounts` (Record<string, number> by category) and `severityCounts` (Record<severity, number>) aggregation fields. | Status: not_done

---

## Phase 6: Output Formatters

- [ ] **Implement src/formatters/index.ts — formatter factory** — Create the `format(diff, outputFormat)` function that dispatches to the appropriate formatter based on `OutputFormat` value. | Status: not_done

### Terminal Formatter

- [ ] **Implement src/formatters/terminal.ts — colored output** — Render a `PromptDiff` as colored terminal output with ANSI escape codes. Include header with version/mode info, summary box with change count and token impact, changes grouped by severity with colored badges (HIGH/MEDIUM/LOW), red/green text diffs for modifications, and footer with totals and timing. | Status: not_done
- [ ] **Implement terminal.ts — NO_COLOR support** — Respect the `NO_COLOR` environment variable and `--no-color` flag. When color is disabled, output plain text without ANSI codes. Use `process.stdout.isTTY` for auto-detection. | Status: not_done

### JSON Formatter

- [ ] **Implement src/formatters/json.ts** — Render a `PromptDiff` as a JSON string. By default omit `structureA` and `structureB` to reduce size. Include them when `--include-structures` flag is set. Output valid, parseable JSON. | Status: not_done

### Markdown Formatter

- [ ] **Implement src/formatters/markdown.ts** — Render a `PromptDiff` as markdown suitable for PR comments. Include summary table (changes, severity counts, token impact), changes grouped by severity level with bold change type and description, and text diffs in fenced code blocks. | Status: not_done

### Summary Formatter

- [ ] **Implement src/formatters/summary.ts** — Render a `PromptDiff` as one-line-per-change summary. Format: `[SEVERITY] change-type: description`. Append token impact line at the end. | Status: not_done

### Patch Formatter

- [ ] **Implement src/formatters/patch.ts** — Render a `PromptDiff` as an applicable patch JSON document containing `version`, `fromHash`, `toHash`, `mode`, and ordered `changes` array with `type`, `path`, `before`, `after`, and `offset` fields. | Status: not_done

---

## Phase 7: Summarize and Apply Functions

- [ ] **Implement src/summarize.ts** — Implement the `summarize(diff)` function that returns a concise human-readable summary string (e.g., "3 changes: 1 instruction modified, 1 example added, variable {{name}} renamed to {{full_name}}. Token impact: +45 tokens."). Group by change type and count. | Status: not_done
- [ ] **Implement src/apply.ts — basic patch application** — Implement the `apply(prompt, diff)` function that applies a `PromptDiff` as a patch to transform prompt A into prompt B. Apply changes in reverse offset order to avoid position shifting. | Status: not_done
- [ ] **Implement apply.ts — conflict detection** — Detect when applying a patch to a prompt that does not match the expected `before` content. Report conflicts rather than silently corrupting the prompt. | Status: not_done

---

## Phase 8: CLI

- [ ] **Implement src/cli.ts — argument parsing** — Parse CLI arguments using `node:util.parseArgs`. Handle positional arguments `file-a` and `file-b`. Parse all flags from Spec Section 10: `--stdin-a`, `--stdin-b`, `--format-in`, `--template-syntax`, `--mode`, `--section-threshold`, `--move-threshold`, `--no-token-count`, `--format`, `--include-structures`, `--no-color`, `--severity`, `--category`, `--ignore-whitespace`, `--ignore-formatting`, `--ignore-sections`, `--version`, `--help`, `--config`. | Status: not_done
- [ ] **Implement cli.ts — file reading** — Read prompt files from disk using `node:fs/promises.readFile`. Handle file-not-found errors with descriptive messages and exit code 2. | Status: not_done
- [ ] **Implement cli.ts — stdin reading** — Support `--stdin-a` and `--stdin-b` flags to read prompt content from stdin. | Status: not_done
- [ ] **Implement cli.ts — exit codes** — Exit with code 0 for no differences, code 1 for differences found, code 2 for configuration/usage errors (invalid flags, missing files, invalid format). | Status: not_done
- [ ] **Implement cli.ts — help output** — Print usage information when `--help` is passed, showing all commands and flags from Spec Section 10. | Status: not_done
- [ ] **Implement cli.ts — version output** — Print the package version (from `package.json`) when `--version` is passed. | Status: not_done
- [ ] **Implement cli.ts — severity filtering** — When `--severity` is specified, filter output to only show changes at or above the specified severity level. | Status: not_done
- [ ] **Implement cli.ts — category filtering** — When `--category` is specified (repeatable), filter output to only show changes matching the specified categories. | Status: not_done
- [ ] **Implement cli.ts — ignore flags** — Implement `--ignore-whitespace` (equivalent to semantic mode for whitespace), `--ignore-formatting` (suppress markdown formatting changes), `--ignore-sections` (regex pattern to exclude matching sections, repeatable). | Status: not_done
- [ ] **Implement cli.ts — environment variable support** — Read `PROMPT_DIFF_MODE`, `PROMPT_DIFF_FORMAT`, `PROMPT_DIFF_TEMPLATE_SYNTAX`, and `NO_COLOR` environment variables. Environment variables are overridden by explicit CLI flags. | Status: not_done

---

## Phase 9: Configuration File Support

- [ ] **Implement configuration file discovery** — Search for `.prompt-diff.json`, `.prompt-diff.yaml`, or `prompt-diff` key in `package.json` in the current directory and ancestor directories. Use the first found. Support `--config` flag to override. | Status: not_done
- [ ] **Implement configuration file parsing** — Parse the configuration file (JSON or YAML) and map its fields to `DiffOptions`. Support all fields from Spec Section 11: `mode`, `templateSyntax`, `sectionMatchThreshold`, `moveThreshold`, `tokenCounting`, `format`, `ignore` (whitespace, formatting, sections), `customSectionPatterns`, `severity`. | Status: not_done
- [ ] **Implement configuration precedence** — Resolve configuration in order: (1) built-in defaults, (2) configuration file, (3) environment variables, (4) CLI flags / programmatic options. Later sources override earlier. | Status: not_done
- [ ] **Create .prompt-diff.json example config** — Create a `.prompt-diff.json` in the project root as an example configuration file (also used for self-testing). | Status: not_done

---

## Phase 10: Comparison Modes

- [ ] **Implement strict mode** — In strict mode, compare text as-is with no normalization. Report all whitespace differences, formatting differences, and structural/content changes. | Status: not_done
- [ ] **Implement semantic mode (default)** — In semantic mode, normalize text before comparison: strip trailing whitespace, collapse multiple blank lines, trim section content, normalize variable syntax for comparison (e.g., `{{var}}` and `{{ var }}` treated as equivalent). Still report all meaningful content and structural changes. | Status: not_done
- [ ] **Implement structural mode** — In structural mode, only report structural changes: role/section/variable/example additions, removals, moves, renames. Suppress text-level modifications within matched elements. Suppress example modifications. Suppress output format text changes (only type changes). | Status: not_done

---

## Phase 11: Test Fixtures

- [ ] **Create src/__tests__/fixtures/before/simple-prompt.md** — A simple plain-text prompt with basic instructions and no structural elements. | Status: not_done
- [ ] **Create src/__tests__/fixtures/after/simple-prompt-modified.md** — Modified version of simple-prompt with instruction changes. | Status: not_done
- [ ] **Create src/__tests__/fixtures/before/multi-section-prompt.md** — A prompt with multiple markdown-header sections (Instructions, Output Format, Examples, Rules). | Status: not_done
- [ ] **Create src/__tests__/fixtures/after/multi-section-reordered.md** — Same sections as multi-section-prompt but in a different order (to test section move detection). | Status: not_done
- [ ] **Create src/__tests__/fixtures/before/message-array.json** — An OpenAI-style message array prompt (JSON). | Status: not_done
- [ ] **Create src/__tests__/fixtures/after/message-array-modified.json** — Modified message array with role content changes and added role. | Status: not_done
- [ ] **Create src/__tests__/fixtures/before/anthropic-format.json** — An Anthropic-style prompt object (JSON with `system` and `messages`). | Status: not_done
- [ ] **Create src/__tests__/fixtures/after/anthropic-format-modified.json** — Modified Anthropic format prompt. | Status: not_done
- [ ] **Create src/__tests__/fixtures/before/template-with-variables.md** — A prompt using multiple template variables (handlebars syntax). | Status: not_done
- [ ] **Create src/__tests__/fixtures/after/template-with-renamed-vars.md** — Same prompt with variables renamed (to test variable rename detection). | Status: not_done
- [ ] **Create src/__tests__/fixtures/before/prompt-with-examples.md** — A prompt with multiple few-shot examples with input/output pairs. | Status: not_done
- [ ] **Create src/__tests__/fixtures/after/prompt-with-added-examples.md** — Same prompt with additional examples added. | Status: not_done
- [ ] **Create src/__tests__/fixtures/before/prompt-with-constraints.md** — A prompt with numeric constraints and restriction language. | Status: not_done
- [ ] **Create src/__tests__/fixtures/after/prompt-with-relaxed-constraints.md** — Same prompt with constraints relaxed (limits increased, restrictions removed). | Status: not_done
- [ ] **Create src/__tests__/fixtures/before/empty.md** — An empty file. | Status: not_done
- [ ] **Create src/__tests__/fixtures/after/empty.md** — An empty file (for identical empty prompt test). | Status: not_done
- [ ] **Create src/__tests__/fixtures/before/large-prompt.md** — A large prompt (10,000+ characters) for performance testing. | Status: not_done
- [ ] **Create src/__tests__/fixtures/after/large-prompt-modified.md** — Modified version of large prompt for performance testing. | Status: not_done

---

## Phase 12: Unit Tests — Parser

- [ ] **Test src/__tests__/parser/parse-plain-text.test.ts — basic parsing** — Test that a simple plain-text prompt is parsed into a PromptStructure with correct format, roles, and metadata. | Status: not_done
- [ ] **Test parse-plain-text.test.ts — empty input** — Test parsing of empty string. Should return a valid PromptStructure with no roles/sections/variables. | Status: not_done
- [ ] **Test parse-plain-text.test.ts — whitespace-only input** — Test parsing of a string with only whitespace. | Status: not_done
- [ ] **Test parse-plain-text.test.ts — role detection all patterns** — Test that all role detection patterns are identified: markdown headers, label patterns, XML tags, Anthropic legacy format, and implicit single role. | Status: not_done
- [ ] **Test parse-plain-text.test.ts — Unicode content** — Test parsing of prompts with Unicode characters, emoji, and multi-byte characters. | Status: not_done
- [ ] **Test parse-plain-text.test.ts — no structural elements** — Test parsing of pure prose with no sections, variables, or examples. Should produce a single implicit role block. | Status: not_done

- [ ] **Test src/__tests__/parser/parse-messages.test.ts — OpenAI format** — Test parsing of OpenAI-style message arrays with system, user, and assistant roles. | Status: not_done
- [ ] **Test parse-messages.test.ts — Anthropic format** — Test parsing of Anthropic-style prompt objects with separate system field. | Status: not_done
- [ ] **Test parse-messages.test.ts — developer role** — Test parsing of messages with the `developer` role. | Status: not_done

- [ ] **Test src/__tests__/parser/section-detector.test.ts — markdown headers** — Test detection of `#`, `##`, `###` header sections with correct titles and offsets. | Status: not_done
- [ ] **Test section-detector.test.ts — XML tag sections** — Test detection of XML tag sections with correct tag name extraction. | Status: not_done
- [ ] **Test section-detector.test.ts — labeled blocks** — Test detection of labeled block sections (Instructions:, Output Format:, etc.). | Status: not_done
- [ ] **Test section-detector.test.ts — horizontal rules** — Test detection of `---`, `***`, `___` separator sections with null titles. | Status: not_done
- [ ] **Test section-detector.test.ts — deeply nested XML** — Test detection of deeply nested XML tag sections (10+ levels). | Status: not_done
- [ ] **Test section-detector.test.ts — mixed delimiters** — Test a prompt using a mix of markdown headers, XML tags, and labeled blocks. | Status: not_done

- [ ] **Test src/__tests__/parser/variable-extractor.test.ts — all syntaxes** — Test extraction of variables in all four syntaxes: Handlebars, Jinja2, f-string, Dollar. Verify name, syntax, and occurrence offsets. | Status: not_done
- [ ] **Test variable-extractor.test.ts — auto-detection** — Test that the auto-detect logic correctly identifies the dominant template syntax. | Status: not_done
- [ ] **Test variable-extractor.test.ts — mixed syntaxes** — Test prompts using multiple template syntaxes. Verify `templateSyntax` is reported as `'mixed'`. | Status: not_done
- [ ] **Test variable-extractor.test.ts — f-string false positives** — Test that JSON blocks and code blocks do not produce false positive f-string variable detections. | Status: not_done
- [ ] **Test variable-extractor.test.ts — multiple occurrences** — Test that a variable appearing multiple times has all occurrences recorded. | Status: not_done

- [ ] **Test src/__tests__/parser/instruction-detector.test.ts — imperative verbs** — Test detection of sentences starting with imperative verbs. | Status: not_done
- [ ] **Test instruction-detector.test.ts — modal directives** — Test detection of sentences with modal directives (must, should, etc.). | Status: not_done
- [ ] **Test instruction-detector.test.ts — bullet points in instruction sections** — Test that bullet points within instruction-labeled sections are detected as instructions. | Status: not_done
- [ ] **Test instruction-detector.test.ts — non-instructions** — Test that descriptive/informational sentences are not falsely identified as instructions. | Status: not_done

- [ ] **Test src/__tests__/parser/constraint-detector.test.ts — restriction language** — Test detection of all restriction language patterns. | Status: not_done
- [ ] **Test constraint-detector.test.ts — quantitative limits** — Test extraction of numeric limits from constraint text. Verify `numericValue` field. | Status: not_done
- [ ] **Test constraint-detector.test.ts — negative imperatives** — Test detection of "Do not", "Never", "Avoid", "Refrain from" patterns. | Status: not_done
- [ ] **Test constraint-detector.test.ts — constraint vs instruction disambiguation** — Test that a sentence with restriction language is classified as a constraint, not just an instruction. | Status: not_done

- [ ] **Test src/__tests__/parser/example-detector.test.ts — labeled examples** — Test detection of sections labeled "Examples". | Status: not_done
- [ ] **Test example-detector.test.ts — numbered examples** — Test detection of numbered example patterns. | Status: not_done
- [ ] **Test example-detector.test.ts — input/output pairs** — Test detection of Input:/Output: and Q:/A: pairs within examples. | Status: not_done
- [ ] **Test example-detector.test.ts — XML-tagged examples** — Test detection of `<example>` tags. | Status: not_done
- [ ] **Test example-detector.test.ts — multiple examples in one block** — Test that multiple examples within a single block are individually parsed as `SingleExample` objects. | Status: not_done

---

## Phase 13: Unit Tests — Alignment

- [ ] **Test src/__tests__/align/section-aligner.test.ts — title matching** — Test that sections with identical titles are matched regardless of position. | Status: not_done
- [ ] **Test section-aligner.test.ts — content similarity matching** — Test that sections with similar content but different titles are matched when similarity exceeds threshold. | Status: not_done
- [ ] **Test section-aligner.test.ts — threshold behavior** — Test that sections below the similarity threshold are not matched (treated as add + remove). | Status: not_done
- [ ] **Test section-aligner.test.ts — unmatched sections** — Test that sections present only in A are marked as removed and only in B as added. | Status: not_done

- [ ] **Test src/__tests__/align/variable-aligner.test.ts — name matching** — Test that variables with identical names are matched. | Status: not_done
- [ ] **Test variable-aligner.test.ts — rename detection** — Test that variables with different names but identical surrounding context are detected as renames. | Status: not_done
- [ ] **Test variable-aligner.test.ts — no false renames** — Test that variables with different names and different surrounding context are NOT matched as renames. | Status: not_done

- [ ] **Test src/__tests__/align/similarity.test.ts — Jaccard similarity** — Test Jaccard similarity with identical word sets (1.0), completely different sets (0.0), partially overlapping sets, and empty sets. | Status: not_done
- [ ] **Test similarity.test.ts — normalized text similarity** — Test normalized text comparison with whitespace variations, case differences, and punctuation. | Status: not_done

---

## Phase 14: Unit Tests — Engine

- [ ] **Test src/__tests__/engine/text-diff.test.ts — identical text** — Test diffing two identical strings produces no changes (all unchanged segments). | Status: not_done
- [ ] **Test text-diff.test.ts — completely different text** — Test diffing two completely different strings produces full removal + full addition. | Status: not_done
- [ ] **Test text-diff.test.ts — minor edits** — Test diffing strings with small word changes. Verify correct added/removed/unchanged segments. | Status: not_done
- [ ] **Test text-diff.test.ts — insertions and deletions** — Test word insertions and deletions in the middle and at boundaries. | Status: not_done
- [ ] **Test text-diff.test.ts — empty inputs** — Test diffing empty strings, and one empty vs one non-empty. | Status: not_done

- [ ] **Test src/__tests__/engine/change-classifier.test.ts — all change types** — For each of the 23 change types in the taxonomy, provide a pair of aligned elements that produces that change type and verify classification. | Status: not_done
- [ ] **Test change-classifier.test.ts — severity assignment** — Verify that each change type is assigned the correct severity per Spec Section 7. | Status: not_done
- [ ] **Test change-classifier.test.ts — edge case: moved + modified** — Test a section that was both moved and modified. Verify correct classification. | Status: not_done

- [ ] **Test src/__tests__/engine/constraint-classifier.test.ts — numeric relaxation** — Test that increasing a numeric limit (e.g., "max 3" to "max 5") is classified as `constraint-relaxed`. | Status: not_done
- [ ] **Test constraint-classifier.test.ts — numeric tightening** — Test that decreasing a numeric limit is classified as `constraint-tightened`. | Status: not_done
- [ ] **Test constraint-classifier.test.ts — restriction language removal** — Test that removing "only"/"never"/"must not" is classified as relaxation. | Status: not_done
- [ ] **Test constraint-classifier.test.ts — restriction language addition** — Test that adding restriction language is classified as tightening. | Status: not_done
- [ ] **Test constraint-classifier.test.ts — ambiguous changes** — Test that ambiguous constraint changes are classified as `constraint-modified`. | Status: not_done

- [ ] **Test src/__tests__/engine/move-detector.test.ts — section move** — Test that sections with identical content at different positions are classified as `section-moved`. | Status: not_done
- [ ] **Test move-detector.test.ts — below threshold** — Test that sections with content below the move threshold are classified as add + remove, not move. | Status: not_done
- [ ] **Test move-detector.test.ts — zero token impact for moves** — Verify that moves have `tokensAdded: 0` and `tokensRemoved: 0`. | Status: not_done

- [ ] **Test src/__tests__/engine/rename-detector.test.ts — variable rename** — Test that a variable with changed name but identical surrounding context is detected as renamed. | Status: not_done
- [ ] **Test rename-detector.test.ts — no rename when context differs** — Test that a variable name change with different surrounding text is NOT detected as a rename. | Status: not_done
- [ ] **Test rename-detector.test.ts — section rename** — Test that a section with changed title but similar content is detected as `section-renamed`. | Status: not_done

---

## Phase 15: Unit Tests — Formatters

- [ ] **Test src/__tests__/formatters/terminal.test.ts — basic output** — Test that terminal output contains header, summary box, grouped changes, and footer. | Status: not_done
- [ ] **Test terminal.test.ts — ANSI color codes** — Verify that severity badges and diff text use correct ANSI color codes (red for removals, green for additions). | Status: not_done
- [ ] **Test terminal.test.ts — no-color mode** — Verify that NO_COLOR / --no-color produces output without ANSI codes. | Status: not_done

- [ ] **Test src/__tests__/formatters/json.test.ts — valid JSON** — Verify that JSON output is valid, parseable JSON. | Status: not_done
- [ ] **Test json.test.ts — excludes structures by default** — Verify `structureA` and `structureB` are omitted by default. | Status: not_done
- [ ] **Test json.test.ts — includes structures with flag** — Verify structures are included when `--include-structures` is set. | Status: not_done

- [ ] **Test src/__tests__/formatters/markdown.test.ts — valid markdown** — Verify that markdown output contains summary table, severity-grouped changes, and code blocks for diffs. | Status: not_done
- [ ] **Test markdown.test.ts — PR comment format** — Verify the output is suitable for embedding in a PR comment (proper heading levels, table formatting). | Status: not_done

- [ ] **Test src/__tests__/formatters/summary.test.ts — one-line-per-change** — Verify each change produces one line in `[SEVERITY] type: description` format. | Status: not_done
- [ ] **Test summary.test.ts — token impact line** — Verify the token impact summary line is appended. | Status: not_done

- [ ] **Test src/__tests__/formatters/patch.test.ts — patch structure** — Verify patch output is valid JSON with `version`, `fromHash`, `toHash`, `mode`, and `changes` array. | Status: not_done
- [ ] **Test patch.test.ts — change fields** — Verify each change in the patch has `type`, `path`, `before`, `after`, and `offset`. | Status: not_done

---

## Phase 16: Unit Tests — Apply and Summarize

- [ ] **Test src/__tests__/apply.test.ts — basic round-trip** — Test that `apply(promptA, diff(promptA, promptB))` produces content equivalent to promptB. | Status: not_done
- [ ] **Test apply.test.ts — multiple simultaneous changes** — Test applying a patch with multiple changes of different types. | Status: not_done
- [ ] **Test apply.test.ts — each change type** — Test applying a patch containing each individual change type (addition, removal, modification, move, rename). | Status: not_done
- [ ] **Test apply.test.ts — conflict detection** — Test that applying a patch to a prompt that does not match the expected `before` content raises an error or reports a conflict. | Status: not_done
- [ ] **Test summarize function** — Test that `summarize(diff)` produces a correctly formatted summary string with change counts grouped by type and token impact. | Status: not_done

---

## Phase 17: Integration Tests

- [ ] **Test src/__tests__/diff.test.ts — identical prompts** — Diff two identical prompts. Assert `identical: true`, zero changes, token impact net = 0. | Status: not_done
- [ ] **Test diff.test.ts — single instruction added** — Diff prompts with one instruction added. Assert single `instruction-added` change. | Status: not_done
- [ ] **Test diff.test.ts — single variable renamed** — Diff prompts with one variable renamed. Assert single `variable-renamed` change. | Status: not_done
- [ ] **Test diff.test.ts — section reorder** — Diff prompts with sections reordered but content identical. Assert `section-moved` changes and no add/remove. | Status: not_done
- [ ] **Test diff.test.ts — complex multi-change diff** — Diff two substantially different prompts with instructions modified, sections added, variables renamed, examples added, and constraints tightened. Assert all expected changes are detected with correct types. | Status: not_done
- [ ] **Test diff.test.ts — constraint relaxation** — Diff prompts where a numeric constraint limit was increased. Assert `constraint-relaxed`. | Status: not_done
- [ ] **Test diff.test.ts — output format change** — Diff prompts where the output format changed (e.g., JSON to YAML). Assert `output-format-changed`. | Status: not_done
- [ ] **Test diff.test.ts — message array input** — Diff two OpenAI-style message arrays. Assert correct role, instruction, and variable changes. | Status: not_done
- [ ] **Test diff.test.ts — Anthropic format input** — Diff two Anthropic-style prompt objects. Assert correct changes. | Status: not_done
- [ ] **Test diff.test.ts — cross-format comparison** — Diff a message array prompt against a plain text prompt with equivalent content. Verify format differences do not produce false structural changes. | Status: not_done
- [ ] **Test diff.test.ts — empty prompt A, non-empty B** — Assert all elements in B are additions. | Status: not_done
- [ ] **Test diff.test.ts — non-empty A, empty B** — Assert all elements in A are removals. | Status: not_done
- [ ] **Test diff.test.ts — two empty prompts** — Assert identical, zero changes. | Status: not_done
- [ ] **Test diff.test.ts — strict mode** — Verify that whitespace-only differences are reported in strict mode. | Status: not_done
- [ ] **Test diff.test.ts — semantic mode** — Verify that whitespace-only differences are suppressed in semantic mode. | Status: not_done
- [ ] **Test diff.test.ts — structural mode** — Verify that text modifications within matched elements are suppressed in structural mode. | Status: not_done
- [ ] **Test diff.test.ts — file input** — Diff two prompts via `{ file: string }` input. Assert correct results from fixture files. | Status: not_done
- [ ] **Test diff.test.ts — performance: large prompts** — Diff two large prompts (10,000+ characters). Assert completion in under 50ms. | Status: not_done
- [ ] **Test diff.test.ts — performance: many variables** — Diff prompts with thousands of variables. Assert reasonable completion time. | Status: not_done
- [ ] **Test diff.test.ts — same file as both A and B** — Assert identical result. | Status: not_done
- [ ] **Test diff.test.ts — prompt with no structural elements** — Diff two pure prose prompts. Assert text-level changes without structural classification errors. | Status: not_done
- [ ] **Test diff.test.ts — durationMs and timestamp fields** — Verify that `durationMs` is a positive number and `timestamp` is a valid ISO 8601 string. | Status: not_done

---

## Phase 18: CLI Tests

- [ ] **Test src/__tests__/cli.test.ts — positional file arguments** — Run CLI with two file paths. Verify output and exit code 1 (differences found). | Status: not_done
- [ ] **Test cli.test.ts — identical files exit code 0** — Run CLI with two identical files. Verify exit code 0. | Status: not_done
- [ ] **Test cli.test.ts — missing file exit code 2** — Run CLI with a non-existent file. Verify exit code 2 and descriptive error message. | Status: not_done
- [ ] **Test cli.test.ts — invalid flags exit code 2** — Run CLI with invalid flag. Verify exit code 2. | Status: not_done
- [ ] **Test cli.test.ts — --format json** — Run CLI with `--format json`. Verify stdout is valid JSON. | Status: not_done
- [ ] **Test cli.test.ts — --format markdown** — Run CLI with `--format markdown`. Verify markdown output. | Status: not_done
- [ ] **Test cli.test.ts — --format summary** — Run CLI with `--format summary`. Verify one-line-per-change output. | Status: not_done
- [ ] **Test cli.test.ts — --format patch** — Run CLI with `--format patch`. Verify patch JSON output. | Status: not_done
- [ ] **Test cli.test.ts — --mode strict** — Run CLI with `--mode strict`. Verify whitespace differences are reported. | Status: not_done
- [ ] **Test cli.test.ts — --mode structural** — Run CLI with `--mode structural`. Verify only structural changes shown. | Status: not_done
- [ ] **Test cli.test.ts — --severity filtering** — Run CLI with `--severity high`. Verify only high-severity changes shown. | Status: not_done
- [ ] **Test cli.test.ts — --category filtering** — Run CLI with `--category variable`. Verify only variable changes shown. | Status: not_done
- [ ] **Test cli.test.ts — --help output** — Verify help text includes all flags and usage examples. | Status: not_done
- [ ] **Test cli.test.ts — --version output** — Verify version matches package.json version. | Status: not_done
- [ ] **Test cli.test.ts — --no-color** — Verify output contains no ANSI escape codes. | Status: not_done
- [ ] **Test cli.test.ts — environment variable PROMPT_DIFF_MODE** — Set `PROMPT_DIFF_MODE=strict` and verify behavior. | Status: not_done
- [ ] **Test cli.test.ts — flag overrides environment variable** — Set `PROMPT_DIFF_MODE=strict` and pass `--mode semantic`. Verify semantic mode is used. | Status: not_done
- [ ] **Test cli.test.ts — binary file input** — Pass a binary file as input. Verify graceful error handling with exit code 2. | Status: not_done

---

## Phase 19: Token Estimation Tests

- [ ] **Test token estimation accuracy** — Verify that `estimatedTokens` equals `Math.ceil(characterCount / 4)` for various input lengths. | Status: not_done
- [ ] **Test per-change token impact sums to total** — For a given diff, verify that summing `tokensAdded` and `tokensRemoved` across all changes equals `tokenImpact.totalAdded` and `tokenImpact.totalRemoved`. | Status: not_done
- [ ] **Test moves have zero token impact** — Verify that `section-moved` changes have `tokensAdded: 0` and `tokensRemoved: 0`. | Status: not_done
- [ ] **Test --no-token-count flag** — Verify that when `tokenCounting` is false, token impact fields are zeroed or omitted. | Status: not_done

---

## Phase 20: Edge Case Tests

- [ ] **Test very long input (1 MB+ prompt)** — Parse and diff a prompt exceeding 1 MB. Verify no crashes, reasonable memory use, and completion within performance bounds. | Status: not_done
- [ ] **Test prompt with deeply nested XML (10+ levels)** — Parse a prompt with deeply nested XML tag sections. Verify no stack overflow or incorrect parsing. | Status: not_done
- [ ] **Test prompts in different formats (message array A, plain text B)** — Diff a message array against a plain text prompt. Verify that the diff correctly handles the format mismatch. | Status: not_done
- [ ] **Test prompt with mixed template syntaxes** — Parse a prompt using both `{{var}}` and `{var}` syntaxes. Verify `templateSyntax` reports `'mixed'` and both types of variables are extracted. | Status: not_done

---

## Phase 21: Git Integration Documentation

- [ ] **Document git diff driver setup** — In README, document how to configure `.gitattributes` and `.gitconfig` to use `prompt-diff` as a custom diff driver per Spec Section 13. | Status: not_done
- [ ] **Document GitHub Actions integration** — In README, include the GitHub Actions YAML example from Spec Section 13 for CI/CD prompt change detection. | Status: not_done
- [ ] **Document pre-commit hook usage** — In README, include the pre-commit hook example from Spec Section 13. | Status: not_done

---

## Phase 22: Documentation and Publishing Prep

- [ ] **Create README.md** — Write a comprehensive README with: overview, installation, quick start examples, API documentation (diff, parse, format, apply, summarize), CLI usage, configuration file format, comparison modes, output format examples, git integration, CI/CD integration, and contributing guidelines. | Status: not_done
- [ ] **Add JSDoc comments to all public API functions** — Ensure `diff()`, `parse()`, `format()`, `apply()`, and `summarize()` have complete JSDoc with param descriptions, return types, and usage examples. | Status: not_done
- [ ] **Add JSDoc comments to all public types** — Ensure all exported interfaces and types have JSDoc descriptions. | Status: not_done
- [ ] **Verify package.json fields for publishing** — Ensure `name`, `version`, `description`, `main`, `types`, `files`, `bin`, `keywords`, `author`, `license`, `engines`, `publishConfig` are all correct. Add relevant keywords (e.g., "prompt", "diff", "semantic", "llm", "ai"). | Status: not_done
- [ ] **Add .gitignore entries** — Ensure `dist/`, `node_modules/`, and any build artifacts are gitignored. | Status: not_done
- [ ] **Verify npm run build succeeds** — Run `tsc` and verify clean compilation with no errors. | Status: not_done
- [ ] **Verify npm run test succeeds** — Run `vitest run` and verify all tests pass. | Status: not_done
- [ ] **Verify npm run lint succeeds** — Run `eslint src/` and verify no lint errors. | Status: not_done
- [ ] **Version bump to 0.1.0** — Verify `package.json` version is `0.1.0` for the initial release (already set). | Status: not_done
