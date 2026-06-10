# SlideDSL v2.0 Parser & Validator — Design Spec

**Date:** 2026-06-10
**Status:** Draft
**Depends on:** `docs/superpowers/specs/2026-06-10-slidedsl-v2-design.md`

---

## Overview

A TypeScript CLI tool that parses SlideDSL v2.0 `.md` files into a typed document model and runs three validation passes (structural, semantic, lint). Outputs results as colored terminal text or JSON. Greenfield implementation — no existing source code.

```bash
npx ts-node src/cli.ts <file.md> [--format human|json] [--strict]
```

| Flag | Default | Behavior |
|------|---------|----------|
| `<file>` | required | Input SlideDSL v2.0 document |
| `--format` | `human` | `human` (colored terminal) or `json` |
| `--strict` | off | Treat warnings as errors (exit code 1) |

**Exit codes:** `0` = no errors, `1` = errors found (or warnings with `--strict`), `2` = invalid invocation or runtime error.

---

## Part 1: Project Structure

```
src/
  cli.ts                        # Entrypoint: args → parser → validators → reporter → exit
  parser/
    slideParser.ts              # Line scanner state machine → SlideDSLDocument
    attrParser.ts               # { key="value" } attribute block parser
    directiveParser.ts          # @icon() @include() @use() directive parser
    types.ts                    # All TypeScript interfaces
  validators/
    structural.ts               # Syntax errors (malformed blocks, missing required fields)
    semantic.ts                 # Cross-element errors (undefined refs, broken triggers)
    lint.ts                     # Best-practice warnings
    index.ts                    # Run all validators, return aggregated Issue[]
  reporters/
    human.ts                    # Colored terminal output
    json.ts                     # JSON array output

tests/
  parser/
    slideParser.test.ts
    attrParser.test.ts
    directiveParser.test.ts
  validators/
    structural.test.ts
    semantic.test.ts
    lint.test.ts
  helpers.ts                    # buildDoc(), buildSlide() test fixture helpers
  fixtures/
    valid/
      minimal.slidedsl.md       # title only + one slide
      full-v2.slidedsl.md       # exercises all 11 v2.0 categories
    invalid/                    # one fixture per error rule code
      structural-missing-title.slidedsl.md
      structural-unclosed-container.slidedsl.md
      structural-animation-missing-field.slidedsl.md
      structural-animation-invalid-phase.slidedsl.md
      structural-invalid-transition-type.slidedsl.md
      structural-invalid-export-format.slidedsl.md
      structural-chart-missing-datasets.slidedsl.md
      structural-keyframe-invalid-stop.slidedsl.md
      structural-grid-missing-columns.slidedsl.md
      structural-template-missing-id.slidedsl.md
      structural-malformed-attr.slidedsl.md
      semantic-undefined-trigger.slidedsl.md
      semantic-marker-undefined.slidedsl.md
      semantic-unreferenced-marker.slidedsl.md
      semantic-keyframe-ref-undefined.slidedsl.md
      semantic-path-ref-undefined.slidedsl.md
      semantic-morph-target-undefined.slidedsl.md
      semantic-hotspot-target-undefined.slidedsl.md
      semantic-toc-anchor-missing.slidedsl.md
      semantic-template-use-missing.slidedsl.md

package.json
tsconfig.json
```

---

## Part 2: Document Model (`parser/types.ts`)

### Top-Level Document

```typescript
interface SlideDSLDocument {
  frontMatter: FrontMatter;
  sections: Section[];   // structural groupings (=== delimiters)
  slides: Slide[];       // flat list across all sections (convenience accessor)
}
```

### FrontMatter

```typescript
interface FrontMatter {
  title: string;                    // REQUIRED
  author?: string;
  version?: string;
  language?: string;
  aspect_ratio?: string;
  default_voice?: string;
  global_theme?: string;
  transitions?: TransitionsConfig;
  footer?: FooterConfig;
  header?: HeaderConfig;
  progress_bar?: boolean;
  slide_numbers?: boolean;
  background_music?: string;
  background_music_volume?: number;
  export?: ExportConfig;
  toc?: TocConfig;
  variables?: Record<string, string>;
  lineNumber: number;
}

interface TransitionsConfig {
  default?: string;
  duration?: string;
  easing?: string;
}

interface FooterConfig {
  left?: string;
  center?: string;
  right?: string;
  show?: boolean;
}

interface HeaderConfig {
  left?: string;
  center?: string;
  right?: string;
  show?: boolean;
}

interface ExportConfig {
  format?: 'mp4' | 'pdf' | 'pptx' | 'html' | 'png';
  quality?: '720p' | '1080p' | '4k';
  fps?: number;
  audio?: boolean;
  subtitles?: boolean;
  'subtitles-language'?: string;
  'print-layout'?: boolean;
}

interface TocConfig {
  enabled?: boolean;
  'insert-after'?: string;
  depth?: 'sections' | 'slides';
}
```

### Section

```typescript
interface Section {
  id?: string;
  title?: string;
  theme?: string;
  'progress-color'?: string;
  'music-file'?: string;
  'music-volume'?: number;
  'music-fade-in'?: string;
  slides: Slide[];
  lineNumber: number;
}
```

### Slide

```typescript
interface Slide {
  index: number;
  startLine: number;
  endLine: number;
  id?: string;
  label?: string;
  layout?: string;
  transition?: string;
  'transition-duration'?: string;
  'transition-easing'?: string;
  'duration-hint'?: string;
  hidden?: boolean;
  voice?: string;
  'voice-rate'?: number;
  'voice-pitch'?: string;
  language?: string;
  background?: SlideBackground;
  'print-only'?: boolean;
  'screen-only'?: boolean;
  sectionId?: string;
  elements: SlideElement[];
  notes?: NotesBlock;
}

interface SlideBackground {
  type: 'color' | 'image' | 'gradient' | 'video';
  value: string;
  // image
  size?: string;
  position?: string;
  opacity?: number;
  // gradient
  from?: string;
  to?: string;
  angle?: string;
  // video
  muted?: boolean;
  loop?: boolean;
}
```

### SlideElement

```typescript
type ElementType =
  | 'heading' | 'paragraph' | 'blockquote' | 'list' | 'table' | 'code' | 'math'
  | 'image' | 'video' | 'audio' | 'icon'
  | 'chart' | 'diagram' | 'shape' | 'hotspot'
  | 'container' | 'column' | 'grid' | 'cell'
  | 'keyframes' | 'path' | 'template';

interface SlideElement {
  type: ElementType;
  level?: number;                      // heading level 1–6
  content?: string;                    // text content
  id?: string;
  animate?: AnimationAttr;
  attributes?: Record<string, string>; // all parsed { key="value" } pairs
  children?: SlideElement[];
  lineNumber: number;
  // type-specific
  src?: string;                        // image / video / audio path
  alt?: string;                        // image alt text
  chartData?: ChartData;
  diagramSource?: string;
  keyframeStops?: KeyframeStop[];
  pathD?: string;                      // SVG path d= value
}
```

### AnimationAttr

```typescript
interface AnimationAttr {
  phase: 'in' | 'out' | 'emphasis' | 'move';
  effect: string;
  trigger: string;
  duration: string;
  delay?: string;
  easing?: string;
  loop?: number | 'infinite';
  sfx?: string;
  'sfx-volume'?: number;
  ref?: string;          // keyframe or path ref
  target?: string;       // morph target id
  from?: string;         // color-shift from
  to?: string;           // color-shift to
  'char-delay'?: string; // typewriter
}
```

### Supporting Types

```typescript
interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'donut' | 'scatter' | 'area';
  labels?: string[];
  datasets: Array<{ label: string; data: number[]; color?: string }>;
}

interface KeyframeStop {
  percent: number;                 // 0–100
  props: Record<string, string>;   // opacity, scale, translate-x, translate-y, rotate
}

interface NotesBlock {
  raw: string;
  markers: string[];
  voice?: string;
  'voice-rate'?: number;
  lineNumber: number;
}

interface Issue {
  code: string;
  severity: 'error' | 'warning';
  line: number;
  message: string;
  file: string;
}
```

---

## Part 3: Parser (`parser/slideParser.ts`)

### State

```typescript
type BlockType =
  | 'container' | 'column' | 'grid' | 'cell'
  | 'notes' | 'chart' | 'diagram' | 'shape'
  | 'hotspot' | 'keyframes' | 'path' | 'template';

interface ParserState {
  phase: 'front_matter' | 'document';
  frontMatterLines: string[];
  sections: Section[];
  currentSection: Section;
  currentSlide: Slide | null;
  blockStack: Array<{ type: BlockType; element: SlideElement; startLine: number }>;
  inCodeFence: boolean;
  codeFenceLang: string;
  inMathBlock: boolean;
  pendingElement: SlideElement | null;  // element awaiting a { } attribute block
  lineNumber: number;
}
```

### Line Dispatch (checked in order)

| Line pattern | Action |
|---|---|
| First `---` (no prior slides) | Begin front matter accumulation |
| `---` closing front matter | Parse accumulated YAML → `FrontMatter` |
| `===` or `=== {attrs}` | Close current section, open new `Section` |
| `---` or `--- {attrs}` | Close current slide, open new `Slide` |
| ` ``` ` or ` ```lang ` | Toggle `inCodeFence`; accumulate until closing fence |
| `$$` | Toggle `inMathBlock`; accumulate until closing `$$` |
| `::: blockname {attrs}` | Push block onto `blockStack` |
| `:::` alone | Pop `blockStack`; attach popped element to parent |
| `@include(path)` | Emit include directive element |
| `@use(id key=val …)` | Emit template-use directive element |
| `@icon(name)` | Emit icon element; set as `pendingElement` |
| `{ key="value" … }` | Call `attrParser`, merge into `pendingElement`; clear pending |
| `# text` through `###### text` | Emit heading; set as `pendingElement` |
| `![alt](src)` | Emit image/video/audio (type from next `{ }` block); set as `pendingElement` |
| `\| col \|` | Accumulate table rows until non-table line; emit table |
| `> text` | Emit blockquote; set as `pendingElement` |
| `* item` / `1. item` | Accumulate list items; emit list |
| anything else non-empty | Emit paragraph; set as `pendingElement` |

### Pending Element Attachment Rule

After emitting any element, it becomes `pendingElement`. On the next line:
- If the line matches `{ … }` → parse attributes and merge into `pendingElement`, clear pending
- Otherwise → finalize `pendingElement` as-is, process the current line normally

### `attrParser.ts`

```typescript
// Parses { id="foo" animate="in: fade trigger=onload duration=0.5s" easing="ease-out" }
// Returns Record<string, string>
// Throws ParseError on unmatched quotes or invalid key=value syntax
function parseAttributes(raw: string): Record<string, string>

// Parses the animate string value into a structured AnimationAttr
// Throws ParseError if phase/effect/trigger/duration are missing
function parseAnimationAttr(value: string): AnimationAttr
```

### `directiveParser.ts`

```typescript
// Parses @icon(name), @include(path), @use(ref key="val" …)
// Returns { name: string, args: Record<string, string> }
// Throws ParseError on malformed directive syntax
function parseDirective(line: string): { name: string; args: Record<string, string> }
```

---

## Part 4: Validators

All validators accept `(doc: SlideDSLDocument, filePath: string): Issue[]`.
`validators/index.ts` runs all three and returns the merged array.

### Structural (`validators/structural.ts`) — severity: `error`

| Rule Code | Condition |
|-----------|-----------|
| `structural/missing-title` | `frontMatter.title` is absent or empty |
| `structural/unclosed-container` | Any `:::` block has no matching closing `:::` |
| `structural/malformed-attr` | `{ }` block has unmatched quotes or invalid `key=value` syntax |
| `structural/animation-missing-field` | `animate` missing `phase`, `effect`, `trigger`, or `duration` |
| `structural/animation-invalid-phase` | `phase` not one of `in` \| `out` \| `emphasis` \| `move` |
| `structural/invalid-transition-type` | Slide `transition` not in the 12 allowed vocabulary values |
| `structural/invalid-export-format` | `export.format` not one of `mp4` \| `pdf` \| `pptx` \| `html` \| `png` |
| `structural/chart-missing-datasets` | `::: chart` body contains no `datasets:` entry |
| `structural/keyframe-invalid-stop` | A `::: keyframes` stop percentage is outside 0–100 |
| `structural/grid-missing-columns` | `::: grid` block missing `columns` attribute |
| `structural/template-missing-id` | `::: template` block missing `id` attribute |

### Semantic (`validators/semantic.ts`) — severity: `error`

| Rule Code | Condition |
|-----------|-----------|
| `semantic/undefined-trigger` | `trigger=after-[id]` or `with-[id]` references an `id` not on the same slide |
| `semantic/marker-undefined` | `trigger=narrate-[marker]` references a marker not in `notes.markers[]` |
| `semantic/unreferenced-marker` | `<marker: name>` in notes has no matching `trigger=narrate-[name]` on the slide |
| `semantic/keyframe-ref-undefined` | `ref=kf-id` in animate matches no `::: keyframes {id="kf-id"}` |
| `semantic/path-ref-undefined` | `ref=path-id` in animate matches no `::: path {id="path-id"}` |
| `semantic/morph-target-undefined` | `target=elem-id` in morph animate references an `id` not on the slide |
| `semantic/hotspot-target-undefined` | `target-slide="#slide-id"` references a slide `id` not in the document |
| `semantic/toc-anchor-missing` | `toc.insert-after` value matches no slide `id` in the document |
| `semantic/template-use-missing` | `@use(tpl-id …)` references a `::: template` `id` not defined in the document |

### Lint (`validators/lint.ts`) — severity: `warning`

| Rule Code | Condition |
|-----------|-----------|
| `lint/no-notes-block` | Slide has no `::: notes` block |
| `lint/multiple-h1` | Slide has more than one `#` heading |
| `lint/delay-exceeds-duration` | Animation `delay` ≥ `duration` |
| `lint/container-single-column` | `::: container` has fewer than 2 `column` children |
| `lint/missing-recommended-frontmatter` | Front matter missing any of: `author`, `default_voice`, `language`, `global_theme` |
| `lint/hidden-slide-has-notes` | A `hidden="true"` slide contains a `::: notes` block |
| `lint/loop-infinite-no-exit` | Element has `loop=infinite` emphasis animation but no `out` animation |
| `lint/chart-no-aria-label` | `::: chart` block missing `aria-label` attribute |
| `lint/shape-no-aria-label` | `::: shape` block with content missing `aria-label` |
| `lint/slide-no-id` | Slide has no explicit `id` attribute |
| `lint/variable-undefined` | `{{token}}` used in content but not defined in `variables` or system tokens |
| `lint/include-file-not-found` | `@include(path)` does not resolve to an existing file |

---

## Part 5: Testing

**Test runner:** Node built-in (`node:test` + `node:assert`). Zero test dependencies.

**Run:**
```bash
node --experimental-strip-types --test 'tests/**/*.test.ts'
```

**package.json:**
```json
{
  "scripts": {
    "test": "node --experimental-strip-types --test 'tests/**/*.test.ts'",
    "validate": "node --experimental-strip-types src/cli.ts"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0"
  }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist"
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

### Unit Tests

`tests/parser/attrParser.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAttributes } from '../../src/parser/attrParser.ts';

test('parses single key-value pair', () => {
  assert.deepEqual(parseAttributes('{ id="hero" }'), { id: 'hero' });
});

test('parses animate value with spaces', () => {
  const r = parseAttributes('{ animate="in: fade trigger=onload duration=0.5s" }');
  assert.equal(r.animate, 'in: fade trigger=onload duration=0.5s');
});

test('throws on unmatched quote', () => {
  assert.throws(() => parseAttributes('{ id="unclosed }'), /malformed/i);
});
```

`tests/parser/directiveParser.test.ts`:
```typescript
test('parses @icon directive', () => {
  assert.deepEqual(parseDirective('@icon(check-circle)'), {
    name: 'icon', args: { icon: 'check-circle' }
  });
});

test('parses @use directive with arguments', () => {
  assert.deepEqual(parseDirective('@use(tpl-hero title="Intro")'), {
    name: 'use', args: { ref: 'tpl-hero', title: 'Intro' }
  });
});

test('parses @include directive', () => {
  assert.deepEqual(parseDirective('@include(slides/intro.slidedsl)'), {
    name: 'include', args: { path: 'slides/intro.slidedsl' }
  });
});
```

`tests/parser/slideParser.test.ts` (inline fixture strings, no file I/O):
```typescript
test('parses minimal valid document', () => {
  const src = `---\ntitle: "Test"\n---\n\n# Hello\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.frontMatter.title, 'Test');
  assert.equal(doc.slides.length, 1);
  assert.equal(doc.slides[0].elements[0].type, 'heading');
});

test('parses === section delimiter', () => { … });
test('parses ::: chart block with datasets', () => { … });
test('parses nested ::: grid with ::: cell children', () => { … });
test('attaches { } attributes to preceding element', () => { … });
test('parses ::: keyframes block with percentage stops', () => { … });
test('parses @icon inline directive', () => { … });
```

### Validator Unit Tests

`tests/helpers.ts` exports `buildDoc()` and `buildSlide()` to construct minimal valid `SlideDSLDocument` objects:

```typescript
// One test per rule code
test('structural/missing-title fires when title is empty', () => {
  const doc = buildDoc({ frontMatter: { title: '' } });
  const issues = runStructural(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'structural/missing-title'));
});

test('semantic/keyframe-ref-undefined fires for missing ref', () => {
  const doc = buildDoc({
    slides: [buildSlide({
      elements: [{ type: 'image', src: 'x.png', lineNumber: 5,
        animate: { phase: 'in', effect: 'keyframe', trigger: 'onload',
                   duration: '1s', ref: 'kf-missing' } }]
    })]
  });
  const issues = runSemantic(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'semantic/keyframe-ref-undefined'));
});
```

### Integration Tests

```bash
# Valid: assert exit 0 and empty issues array
node --experimental-strip-types src/cli.ts tests/fixtures/valid/full-v2.slidedsl.md --format json
# Expected output: []

# Invalid: assert exit 1 and correct rule code present
node --experimental-strip-types src/cli.ts tests/fixtures/invalid/structural-missing-title.slidedsl.md --format json
# Expected: [{ "code": "structural/missing-title", ... }]
```

One fixture file per error rule code under `tests/fixtures/invalid/`. Each triggers exactly one rule.

---

## Part 6: Output Formats

### Human Reporter (`reporters/human.ts`)

```
SlideDSL Validator Report: slides/pitch.md
─────────────────────────────────────────

[ERROR] Line 7: structural/missing-title
  Front matter must have a 'title' field.

[ERROR] Line 23: semantic/keyframe-ref-undefined
  Animation references ref=kf-flow, but no ::: keyframes block with id='kf-flow' exists.

[WARNING] Line 45: lint/chart-no-aria-label
  ::: chart block has no aria-label attribute. Add one for accessibility.

─────────────────────────────────────────
✓ 3 issues (2 errors, 1 warning)
```

### JSON Reporter (`reporters/json.ts`)

```json
[
  {
    "code": "structural/missing-title",
    "severity": "error",
    "line": 7,
    "message": "Front matter must have a 'title' field.",
    "file": "slides/pitch.md"
  }
]
```
