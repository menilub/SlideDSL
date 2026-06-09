# SlideDSL CLI Validator — Design Spec

**Date:** 2026-06-09
**Status:** Approved

---

## Overview

A local TypeScript CLI script that validates a single SlideDSL `.md` file against the v1.0 language specification. It runs three validation passes (structural, semantic, best-practice lint) and reports issues in either human-readable terminal output or machine-readable JSON.

---

## Invocation

```
npx ts-node src/cli.ts <file> [--format human|json] [--strict]
```

| Flag | Default | Description |
|---|---|---|
| `--format` | `human` | Output format: `human` (colored terminal) or `json` |
| `--strict` | off | Treat warnings as errors — exit code 1 if any warnings exist |

### Exit Codes

| Code | Meaning |
|---|---|
| `0` | No errors (warnings allowed unless `--strict`) |
| `1` | Errors found, or warnings present with `--strict` |
| `2` | File not found or unreadable |

---

## Project Structure

```
src/
├── cli.ts              # Entry point, arg parsing, exit codes
├── parser/
│   ├── frontMatter.ts  # Extract + validate YAML front matter (js-yaml)
│   ├── slides.ts       # Split document into slide segments on --- / ***
│   ├── slideParser.ts  # Parse each slide into typed SlideElement tree
│   └── types.ts        # All TypeScript interfaces for the document model
├── validators/
│   ├── structural.ts   # Well-formedness rules
│   ├── semantic.ts     # Cross-reference checks
│   └── lint.ts         # Best-practice warnings
└── reporters/
    ├── human.ts        # Colored terminal output grouped by slide
    └── json.ts         # JSON output
```

### Pipeline

`cli.ts` runs these phases in order, passing the typed document model through each:

```
read file → parse front matter → split slides → parse slide elements
  → structural validate → semantic validate → lint → report → exit
```

Only `frontMatter.ts` and `slideParser.ts` read raw text. All validators operate on the typed model.

---

## Document Model (`parser/types.ts`)

```typescript
interface SlideDSLDocument {
  frontMatter: FrontMatter;
  slides: Slide[];
}

interface FrontMatter {
  title: string;
  author?: string;
  aspect_ratio?: string;
  default_voice?: string;
  global_theme?: string;
}

interface Slide {
  index: number;       // 1-based
  startLine: number;
  elements: SlideElement[];
  notes?: NotesBlock;
}

interface SlideElement {
  type: 'heading' | 'paragraph' | 'list' | 'image' | 'container' | 'column';
  level?: number;      // heading level 1–6
  id?: string;
  animate?: AnimationAttr;
  children?: SlideElement[];  // container/column children
  lineNumber: number;
}

interface AnimationAttr {
  phase: 'in' | 'out' | 'emphasis';
  effect: string;
  trigger: string;
  delay?: string;      // e.g. "0.5s"
  duration?: string;   // e.g. "1.0s"
  raw: string;         // original string, used in error messages
}

interface NotesBlock {
  content: string;
  markers: string[];   // names extracted from <marker: name> tags
  lineNumber: number;
}
```

Every element carries `lineNumber` so all issues reference exact source locations.

---

## Validation Rules

### Structural (`validators/structural.ts`) — severity: `error`

| Code | Rule |
|---|---|
| `structural/missing-title` | Front matter missing required `title` field |
| `structural/unclosed-container` | `:::` block opened but never closed |
| `structural/malformed-attr` | `{ }` attribute block contains non `key="value"` token |
| `structural/animation-missing-field` | Animation string missing one of: `phase`, `effect`, `trigger`, `duration` |
| `structural/animation-invalid-phase` | Animation `phase` is not `in`, `out`, or `emphasis` |
| `structural/animation-invalid-effect` | Animation `effect` is not one of the known values: `fade`, `slide-left`, `slide-right`, `slide-up`, `slide-down`, `zoom`, `wipe`, `spin` |

### Semantic (`validators/semantic.ts`) — severity: `error`

| Code | Rule |
|---|---|
| `semantic/unknown-trigger-id` | `trigger=after-[id]` or `trigger=with-[id]` references an `id` that does not exist on any element in the same slide |
| `semantic/unknown-trigger-marker` | `trigger=narrate-[marker]` references a marker name that does not appear in the slide's notes block |
| `semantic/unreferenced-marker` | A `<marker: name>` in a notes block has no corresponding `trigger=narrate-[marker]` on any element in the slide |

### Lint (`validators/lint.ts`) — severity: `warning`

| Code | Rule |
|---|---|
| `lint/no-notes-block` | Slide has no `::: notes` block |
| `lint/multiple-h1` | Slide has more than one `#` (h1) heading |
| `lint/delay-exceeds-duration` | Animation `delay` value ≥ `duration` value |
| `lint/container-single-column` | A `container` block has fewer than 2 `column` children |
| `lint/missing-recommended-frontmatter` | Front matter missing recommended optional fields: `author`, `default_voice`, or `global_theme` |

---

## Output Formats

### Human (`reporters/human.ts`)

Colored output grouped by slide. Uses `chalk` for colors.

```
✓ Front matter valid

✗ slide 3, line 47: [error] trigger 'after-missing-id' references unknown id 'missing-id'
⚠ slide 3, line 52: [warn] slide has no notes block

✗ slide 5, line 89: [error] animation missing required field 'duration'

2 errors, 1 warning
```

On success:
```
✓ presentation.md — valid (0 errors, 0 warnings)
```

### JSON (`reporters/json.ts`)

```json
{
  "file": "presentation.md",
  "valid": false,
  "summary": { "errors": 2, "warnings": 1 },
  "issues": [
    {
      "severity": "error",
      "slide": 3,
      "line": 47,
      "code": "semantic/unknown-trigger-id",
      "message": "trigger 'after-missing-id' references unknown id 'missing-id'"
    },
    {
      "severity": "warning",
      "slide": 3,
      "line": 52,
      "code": "lint/no-notes-block",
      "message": "slide has no notes block"
    },
    {
      "severity": "error",
      "slide": 5,
      "line": 89,
      "code": "structural/animation-missing-field",
      "message": "animation missing required field 'duration'"
    }
  ]
}
```

---

## Dependencies

| Package | Purpose |
|---|---|
| `js-yaml` | Parse YAML front matter |
| `chalk` | Terminal colors for human reporter |
| `typescript` | Type checking and compilation |
| `ts-node` | Run TypeScript directly without a build step |
| `@types/node` | Node.js type definitions |

---

## Verification

1. **Unit tests** — each parser and validator module tested with minimal document model fixtures (valid and invalid)
2. **Integration test** — run the CLI against a known-good SlideDSL file from `docs/` and assert exit code 0
3. **Integration test** — run against a fixture file with planted errors covering each rule code; assert the correct issue codes appear in JSON output
4. **Manual smoke test** — `npx ts-node src/cli.ts docs/example.slidedsl.md` and visually verify human output
