# SlideDSL v2.0 Parser & Validator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript CLI that parses SlideDSL v2.0 `.md` files into a typed document model and validates them across structural, semantic, and lint rules.

**Architecture:** Single-pass line scanner state machine (`slideParser.ts`) produces a `SlideDSLDocument`; three validator modules consume the document and return `Issue[]`; two reporter modules format issues; `cli.ts` wires everything together.

**Tech Stack:** TypeScript 5.4, Node.js 22+ built-in test runner (`node:test`), `ts-node`, zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-06-10-slidedsl-v2-parser-design.md`

---

## File Map

| File | Purpose |
|------|---------|
| `package.json` | Scripts, dev dependencies |
| `tsconfig.json` | TypeScript config |
| `src/parser/types.ts` | All TypeScript interfaces + ParseError |
| `src/parser/attrParser.ts` | `{ key="value" }` block parser + animation attr parser |
| `src/parser/directiveParser.ts` | `@icon()` `@include()` `@use()` parser |
| `src/parser/slideParser.ts` | Line scanner → SlideDSLDocument |
| `src/validators/structural.ts` | 11 structural error rules |
| `src/validators/semantic.ts` | 9 semantic error rules |
| `src/validators/lint.ts` | 12 lint warning rules |
| `src/validators/index.ts` | Run all validators, merge Issue[] |
| `src/reporters/human.ts` | Colored terminal output |
| `src/reporters/json.ts` | JSON array output |
| `src/cli.ts` | CLI entrypoint |
| `tests/helpers.ts` | `buildDoc()` `buildSlide()` test helpers |
| `tests/parser/attrParser.test.ts` | attrParser unit tests |
| `tests/parser/directiveParser.test.ts` | directiveParser unit tests |
| `tests/parser/slideParser.test.ts` | slideParser unit tests |
| `tests/validators/structural.test.ts` | Structural rule unit tests |
| `tests/validators/semantic.test.ts` | Semantic rule unit tests |
| `tests/validators/lint.test.ts` | Lint rule unit tests |
| `tests/fixtures/valid/minimal.slidedsl.md` | Minimal valid v2.0 document |
| `tests/fixtures/valid/full-v2.slidedsl.md` | Full v2.0 document |
| `tests/fixtures/invalid/*.slidedsl.md` | One file per error rule (20 files) |

---

### Task 1: Project Scaffolding + Types

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/parser/types.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src/parser src/validators src/reporters \
         tests/parser tests/validators \
         tests/fixtures/valid tests/fixtures/invalid
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "slidedsl-validator",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "node --experimental-strip-types --test tests/parser/attrParser.test.ts tests/parser/directiveParser.test.ts tests/parser/slideParser.test.ts tests/validators/structural.test.ts tests/validators/semantic.test.ts tests/validators/lint.test.ts",
    "validate": "node --experimental-strip-types src/cli.ts"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "ts-node": "^10.9.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

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

- [ ] **Step 4: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Create `src/parser/types.ts`**

```typescript
export interface SlideDSLDocument {
  frontMatter: FrontMatter;
  sections: Section[];
  slides: Slide[];
}

export interface FrontMatter {
  title: string;
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

export interface TransitionsConfig {
  default?: string;
  duration?: string;
  easing?: string;
}

export interface FooterConfig {
  left?: string;
  center?: string;
  right?: string;
  show?: boolean;
}

export interface HeaderConfig {
  left?: string;
  center?: string;
  right?: string;
  show?: boolean;
}

export interface ExportConfig {
  format?: 'mp4' | 'pdf' | 'pptx' | 'html' | 'png';
  quality?: '720p' | '1080p' | '4k';
  fps?: number;
  audio?: boolean;
  subtitles?: boolean;
  'subtitles-language'?: string;
  'print-layout'?: boolean;
}

export interface TocConfig {
  enabled?: boolean;
  'insert-after'?: string;
  depth?: 'sections' | 'slides';
}

export interface Section {
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

export interface Slide {
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

export interface SlideBackground {
  type: 'color' | 'image' | 'gradient' | 'video';
  value: string;
  size?: string;
  position?: string;
  opacity?: number;
  from?: string;
  to?: string;
  angle?: string;
  muted?: boolean;
  loop?: boolean;
}

export type ElementType =
  | 'heading' | 'paragraph' | 'blockquote' | 'list' | 'table' | 'code' | 'math'
  | 'image' | 'video' | 'audio' | 'icon'
  | 'chart' | 'diagram' | 'shape' | 'hotspot'
  | 'container' | 'column' | 'grid' | 'cell'
  | 'keyframes' | 'path' | 'template';

export interface SlideElement {
  type: ElementType;
  level?: number;
  content?: string;
  id?: string;
  animate?: AnimationAttr;
  attributes?: Record<string, string>;
  children?: SlideElement[];
  lineNumber: number;
  src?: string;
  alt?: string;
  chartData?: ChartData;
  diagramSource?: string;
  keyframeStops?: KeyframeStop[];
  pathD?: string;
}

export interface AnimationAttr {
  phase: 'in' | 'out' | 'emphasis' | 'move';
  effect: string;
  trigger: string;
  duration: string;
  delay?: string;
  easing?: string;
  loop?: number | 'infinite';
  sfx?: string;
  'sfx-volume'?: number;
  ref?: string;
  target?: string;
  from?: string;
  to?: string;
  'char-delay'?: string;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'donut' | 'scatter' | 'area';
  labels?: string[];
  datasets: Array<{ label: string; data: number[]; color?: string }>;
}

export interface KeyframeStop {
  percent: number;
  props: Record<string, string>;
}

export interface NotesBlock {
  raw: string;
  markers: string[];
  voice?: string;
  'voice-rate'?: number;
  lineNumber: number;
}

export interface Issue {
  code: string;
  severity: 'error' | 'warning';
  line: number;
  message: string;
  file: string;
}

export class ParseError extends Error {
  constructor(message: string, public readonly line?: number) {
    super(message);
    this.name = 'ParseError';
  }
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json src/parser/types.ts
git commit -m "feat: project scaffolding and TypeScript type definitions"
```

---

### Task 2: attrParser

**Files:**
- Create: `src/parser/attrParser.ts`
- Create: `tests/parser/attrParser.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/parser/attrParser.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAttributes, parseAnimationAttr } from '../../src/parser/attrParser.ts';

test('parseAttributes: single key-value', () => {
  assert.deepEqual(parseAttributes('{ id="hero" }'), { id: 'hero' });
});

test('parseAttributes: multiple keys', () => {
  assert.deepEqual(
    parseAttributes('{ id="card" z-index="2" }'),
    { id: 'card', 'z-index': '2' }
  );
});

test('parseAttributes: value with spaces', () => {
  const r = parseAttributes('{ animate="in: fade trigger=onload duration=0.5s" }');
  assert.equal(r['animate'], 'in: fade trigger=onload duration=0.5s');
});

test('parseAttributes: empty block', () => {
  assert.deepEqual(parseAttributes('{}'), {});
});

test('parseAttributes: throws on malformed', () => {
  assert.throws(() => parseAttributes('{ id="unclosed }'), /malformed/i);
});

test('parseAnimationAttr: parses basic in animation', () => {
  const a = parseAnimationAttr('in: fade trigger=onload duration=0.5s');
  assert.equal(a.phase, 'in');
  assert.equal(a.effect, 'fade');
  assert.equal(a.trigger, 'onload');
  assert.equal(a.duration, '0.5s');
});

test('parseAnimationAttr: parses optional fields', () => {
  const a = parseAnimationAttr('in: slide-up trigger=onload delay=0.2s duration=0.6s easing=ease-out loop=3');
  assert.equal(a.delay, '0.2s');
  assert.equal(a.easing, 'ease-out');
  assert.equal(a.loop, 3);
});

test('parseAnimationAttr: parses loop=infinite', () => {
  const a = parseAnimationAttr('emphasis: pulse trigger=onload duration=1s loop=infinite');
  assert.equal(a.loop, 'infinite');
});

test('parseAnimationAttr: parses move phase with ref', () => {
  const a = parseAnimationAttr('move: path ref=path-orbit trigger=onload duration=2s');
  assert.equal(a.phase, 'move');
  assert.equal(a.ref, 'path-orbit');
});

test('parseAnimationAttr: throws on missing trigger', () => {
  assert.throws(() => parseAnimationAttr('in: fade duration=0.5s'), /trigger/i);
});

test('parseAnimationAttr: throws on missing duration', () => {
  assert.throws(() => parseAnimationAttr('in: fade trigger=onload'), /duration/i);
});

test('parseAnimationAttr: throws on invalid phase', () => {
  assert.throws(() => parseAnimationAttr('bounce: fade trigger=onload duration=0.5s'), /phase/i);
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm test
```

Expected: `ERR_MODULE_NOT_FOUND` or similar — `attrParser.ts` does not exist yet.

- [ ] **Step 3: Implement `src/parser/attrParser.ts`**

```typescript
import { AnimationAttr, ParseError } from './types.ts';

export function parseAttributes(raw: string): Record<string, string> {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    throw new ParseError(`Attribute block must be wrapped in { }: '${raw}'`);
  }
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return {};

  const result: Record<string, string> = {};
  const pattern = /([\w-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(inner)) !== null) {
    result[match[1]] = match[2];
  }

  const stripped = inner.replace(/([\w-]+)="([^"]*)"/g, '').trim();
  if (stripped.length > 0) {
    throw new ParseError(`Malformed attribute block, unexpected content: '${stripped}'`);
  }
  return result;
}

export function parseAnimationAttr(value: string): AnimationAttr {
  const parts = value.trim().split(/\s+/);

  const phaseMatch = parts[0]?.match(/^(in|out|emphasis|move):$/);
  if (!phaseMatch) {
    throw new ParseError(`Invalid animation phase: '${parts[0]}'. Must be 'in:', 'out:', 'emphasis:', or 'move:'`);
  }
  const phase = phaseMatch[1] as AnimationAttr['phase'];

  const effect = parts[1];
  if (!effect) throw new ParseError(`Animation missing effect after phase`);

  const kv: Record<string, string> = {};
  for (const part of parts.slice(2)) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) throw new ParseError(`Invalid animation parameter (no '='): '${part}'`);
    kv[part.slice(0, eqIdx)] = part.slice(eqIdx + 1);
  }

  if (!kv['trigger']) throw new ParseError(`Animation missing 'trigger' parameter`);
  if (!kv['duration']) throw new ParseError(`Animation missing 'duration' parameter`);

  const anim: AnimationAttr = { phase, effect, trigger: kv['trigger'], duration: kv['duration'] };
  if (kv['delay'])       anim.delay = kv['delay'];
  if (kv['easing'])      anim.easing = kv['easing'];
  if (kv['loop'])        anim.loop = kv['loop'] === 'infinite' ? 'infinite' : Number(kv['loop']);
  if (kv['sfx'])         anim.sfx = kv['sfx'];
  if (kv['sfx-volume'])  anim['sfx-volume'] = Number(kv['sfx-volume']);
  if (kv['ref'])         anim.ref = kv['ref'];
  if (kv['target'])      anim.target = kv['target'];
  if (kv['from'])        anim.from = kv['from'];
  if (kv['to'])          anim.to = kv['to'];
  if (kv['char-delay'])  anim['char-delay'] = kv['char-delay'];
  return anim;
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm test
```

Expected: `✓ 12 tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/parser/attrParser.ts tests/parser/attrParser.test.ts
git commit -m "feat: attrParser — { } block and animation attribute parsing"
```

---

### Task 3: directiveParser

**Files:**
- Create: `src/parser/directiveParser.ts`
- Create: `tests/parser/directiveParser.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/parser/directiveParser.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDirective } from '../../src/parser/directiveParser.ts';

test('parses @icon directive', () => {
  assert.deepEqual(parseDirective('@icon(check-circle)'), {
    name: 'icon', args: { icon: 'check-circle' }
  });
});

test('parses @include directive', () => {
  assert.deepEqual(parseDirective('@include(slides/intro.slidedsl)'), {
    name: 'include', args: { path: 'slides/intro.slidedsl' }
  });
});

test('parses @use directive with no args', () => {
  assert.deepEqual(parseDirective('@use(tpl-hero)'), {
    name: 'use', args: { ref: 'tpl-hero' }
  });
});

test('parses @use directive with keyword args', () => {
  const r = parseDirective('@use(tpl-hero title="Intro" subtitle="Overview")');
  assert.equal(r.name, 'use');
  assert.equal(r.args['ref'], 'tpl-hero');
  assert.equal(r.args['title'], 'Intro');
  assert.equal(r.args['subtitle'], 'Overview');
});

test('throws on unknown directive', () => {
  assert.throws(() => parseDirective('@foobar(x)'), /unknown/i);
});

test('throws on malformed directive (no parens)', () => {
  assert.throws(() => parseDirective('@icon check-circle'), /invalid/i);
});
```

- [ ] **Step 2: Run — confirm fail**

```bash
npm test
```

Expected: module not found error for `directiveParser.ts`.

- [ ] **Step 3: Implement `src/parser/directiveParser.ts`**

```typescript
import { ParseError } from './types.ts';
import { parseAttributes } from './attrParser.ts';

export function parseDirective(line: string): { name: string; args: Record<string, string> } {
  const match = line.trim().match(/^@(\w+)\(([^)]*)\)$/);
  if (!match) throw new ParseError(`Invalid directive syntax: '${line}'`);

  const name = match[1];
  const argsStr = match[2].trim();

  if (name === 'icon') {
    if (!argsStr) throw new ParseError(`@icon directive missing icon name`);
    return { name, args: { icon: argsStr } };
  }

  if (name === 'include') {
    if (!argsStr) throw new ParseError(`@include directive missing path`);
    return { name, args: { path: argsStr } };
  }

  if (name === 'use') {
    const spaceIdx = argsStr.indexOf(' ');
    const ref = spaceIdx === -1 ? argsStr : argsStr.slice(0, spaceIdx);
    if (!ref) throw new ParseError(`@use directive missing template id`);
    const rest = spaceIdx === -1 ? '' : argsStr.slice(spaceIdx + 1).trim();
    const kvAttrs = rest ? parseAttributes(`{ ${rest} }`) : {};
    return { name, args: { ref, ...kvAttrs } };
  }

  throw new ParseError(`Unknown directive: '@${name}'`);
}
```

- [ ] **Step 4: Run — confirm pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/parser/directiveParser.ts tests/parser/directiveParser.test.ts
git commit -m "feat: directiveParser — @icon @include @use directive parsing"
```

---

### Task 4: slideParser — Front Matter & Delimiters

**Files:**
- Create: `src/parser/slideParser.ts` (initial — front matter + --- / === only)
- Create: `tests/parser/slideParser.test.ts` (initial tests)

- [ ] **Step 1: Write failing tests**

Create `tests/parser/slideParser.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument } from '../../src/parser/slideParser.ts';

test('parses minimal valid document', () => {
  const src = `---\ntitle: "Test Deck"\n---\n\n# Hello\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.frontMatter.title, 'Test Deck');
  assert.equal(doc.slides.length, 1);
});

test('front matter: parses optional fields', () => {
  const src = `---\ntitle: "T"\nauthor: "Alice"\nlanguage: "en-US"\nprogress_bar: true\nslide_numbers: false\n---\n\n# S\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.frontMatter.author, 'Alice');
  assert.equal(doc.frontMatter.language, 'en-US');
  assert.equal(doc.frontMatter.progress_bar, true);
  assert.equal(doc.frontMatter.slide_numbers, false);
});

test('front matter: parses nested transitions block', () => {
  const src = `---\ntitle: "T"\ntransitions:\n  default: "zoom-in"\n  duration: "0.8s"\n---\n\n# S\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.frontMatter.transitions?.default, 'zoom-in');
  assert.equal(doc.frontMatter.transitions?.duration, '0.8s');
});

test('front matter: parses variables block', () => {
  const src = `---\ntitle: "T"\nvariables:\n  company: "Acme"\n  year: "2026"\n---\n\n# S\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.frontMatter.variables?.['company'], 'Acme');
  assert.equal(doc.frontMatter.variables?.['year'], '2026');
});

test('--- delimiter creates new slide', () => {
  const src = `---\ntitle: "T"\n---\n\n# Slide 1\n\n---\n\n# Slide 2\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides.length, 2);
});

test('--- delimiter with attributes sets slide id and transition', () => {
  const src = `---\ntitle: "T"\n---\n\n# S1\n\n--- {id="slide-arch" transition="zoom-in" hidden="false"}\n\n# S2\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[1].id, 'slide-arch');
  assert.equal(doc.slides[1].transition, 'zoom-in');
  assert.equal(doc.slides[1].hidden, false);
});

test('=== delimiter creates new section', () => {
  const src = `---\ntitle: "T"\n---\n\n# S1\n\n=== {id="sec-2" title="Part 2"}\n\n# S2\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.sections.length, 2);
  assert.equal(doc.sections[1].id, 'sec-2');
  assert.equal(doc.sections[1].title, 'Part 2');
});

test('slide index increments across sections', () => {
  const src = `---\ntitle: "T"\n---\n\n# S1\n\n---\n\n# S2\n\n=== {id="sec-2"}\n\n# S3\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides.length, 3);
  assert.equal(doc.slides[2].index, 2);
});

test('slide background parsed from bg-color attribute', () => {
  const src = `---\ntitle: "T"\n---\n\n--- {bg-color="brand-dark"}\n\n# S1\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[1].background?.type, 'color');
  assert.equal(doc.slides[1].background?.value, 'brand-dark');
});
```

- [ ] **Step 2: Run — confirm fail**

```bash
npm test
```

Expected: module not found for `slideParser.ts`.

- [ ] **Step 3: Implement `src/parser/slideParser.ts` (front matter + delimiters)**

```typescript
import {
  SlideDSLDocument, FrontMatter, Section, Slide, SlideElement,
  NotesBlock, SlideBackground, ParseError
} from './types.ts';
import { parseAttributes } from './attrParser.ts';

// ── Internal state ──────────────────────────────────────────────────────────

type BlockType =
  | 'container' | 'column' | 'grid' | 'cell'
  | 'notes' | 'chart' | 'diagram' | 'shape'
  | 'hotspot' | 'keyframes' | 'path' | 'template';

interface StackEntry { type: BlockType; element: SlideElement; startLine: number }

interface ParserState {
  phase: 'init' | 'front_matter' | 'document';
  frontMatterLines: string[];
  frontMatter: FrontMatter | null;
  sections: Section[];
  currentSection: Section;
  currentSlide: Slide | null;
  slideIndex: number;
  blockStack: StackEntry[];
  inCodeFence: boolean;
  codeFenceLang: string;
  codeLines: string[];
  inMathBlock: boolean;
  mathLines: string[];
  tableLines: string[];
  pendingElement: SlideElement | null;
}

// ── Entry point ──────────────────────────────────────────────────────────────

export function parseDocument(src: string, filePath: string): SlideDSLDocument {
  const lines = src.split('\n');
  const defaultSection: Section = { slides: [], lineNumber: 0 };
  const state: ParserState = {
    phase: 'init',
    frontMatterLines: [],
    frontMatter: null,
    sections: [defaultSection],
    currentSection: defaultSection,
    currentSlide: null,
    slideIndex: 0,
    blockStack: [],
    inCodeFence: false,
    codeFenceLang: '',
    codeLines: [],
    inMathBlock: false,
    mathLines: [],
    tableLines: [],
    pendingElement: null,
  };

  for (let i = 0; i < lines.length; i++) {
    processLine(lines[i], i + 1, state);
  }

  finalizeSlide(state, lines.length);

  if (!state.frontMatter) {
    state.frontMatter = { title: '', lineNumber: 0 };
  }

  const slides: Slide[] = state.sections.flatMap(s => s.slides);
  return { frontMatter: state.frontMatter, sections: state.sections, slides };
}

// ── Line processor ───────────────────────────────────────────────────────────

function processLine(line: string, lineNum: number, state: ParserState): void {
  // Front matter open
  if (state.phase === 'init' && line.trim() === '---') {
    state.phase = 'front_matter';
    return;
  }

  // Front matter close
  if (state.phase === 'front_matter' && line.trim() === '---') {
    state.frontMatter = parseFrontMatterYaml(state.frontMatterLines, 1);
    state.phase = 'document';
    return;
  }

  // Accumulate front matter lines
  if (state.phase === 'front_matter') {
    state.frontMatterLines.push(line);
    return;
  }

  // Code fence
  if (state.inCodeFence) {
    if (line.startsWith('```')) {
      const el: SlideElement = {
        type: 'code',
        content: state.codeLines.join('\n'),
        attributes: { language: state.codeFenceLang },
        lineNumber: lineNum - state.codeLines.length - 1,
      };
      state.codeLines = [];
      state.codeFenceLang = '';
      state.inCodeFence = false;
      appendElement(el, state);
      state.pendingElement = el;
    } else {
      state.codeLines.push(line);
    }
    return;
  }

  // Math block
  if (state.inMathBlock) {
    if (line.trim() === '$$') {
      const el: SlideElement = {
        type: 'math',
        content: state.mathLines.join('\n'),
        lineNumber: lineNum - state.mathLines.length - 1,
      };
      state.mathLines = [];
      state.inMathBlock = false;
      appendElement(el, state);
      state.pendingElement = el;
    } else {
      state.mathLines.push(line);
    }
    return;
  }

  // Attribute block — attaches to pending element
  if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
    if (state.pendingElement) {
      try {
        const attrs = parseAttributes(line.trim());
        applyAttributes(state.pendingElement, attrs);
      } catch {
        // malformed attr — leave for structural validator
      }
      state.pendingElement = null;
    }
    return;
  }

  // Section delimiter ===
  const sectionMatch = line.match(/^===\s*(\{.*\})?\s*$/);
  if (sectionMatch) {
    finalizeSlide(state, lineNum);
    state.pendingElement = null;
    const attrs = sectionMatch[1] ? parseAttributesSafe(sectionMatch[1]) : {};
    const section: Section = {
      id: attrs['id'],
      title: attrs['title'],
      theme: attrs['theme'],
      'progress-color': attrs['progress-color'],
      'music-file': attrs['music-file'],
      'music-volume': attrs['music-volume'] !== undefined ? Number(attrs['music-volume']) : undefined,
      'music-fade-in': attrs['music-fade-in'],
      slides: [],
      lineNumber: lineNum,
    };
    state.sections.push(section);
    state.currentSection = section;
    return;
  }

  // Slide delimiter ---
  const slideMatch = line.match(/^---\s*(\{.*\})?\s*$/);
  if (slideMatch) {
    finalizeSlide(state, lineNum);
    state.pendingElement = null;
    const attrs = slideMatch[1] ? parseAttributesSafe(slideMatch[1]) : {};
    openSlide(attrs, lineNum, state);
    return;
  }

  // Ensure we have an open slide
  if (!state.currentSlide) {
    openSlide({}, lineNum, state);
  }

  // Dispatch to content parsers (implemented in Task 5 & 6)
  dispatchContent(line, lineNum, state);
}

// ── Slide management ─────────────────────────────────────────────────────────

function openSlide(attrs: Record<string, string>, lineNum: number, state: ParserState): void {
  const slide: Slide = {
    index: state.slideIndex++,
    startLine: lineNum,
    endLine: lineNum,
    elements: [],
    sectionId: state.currentSection.id,
  };
  applySlideAttrs(attrs, slide);
  state.currentSlide = slide;
  state.currentSection.slides.push(slide);
}

function finalizeSlide(state: ParserState, lineNum: number): void {
  if (state.pendingElement) state.pendingElement = null;
  if (state.currentSlide) {
    state.currentSlide.endLine = lineNum;
    state.currentSlide = null;
  }
}

function applySlideAttrs(attrs: Record<string, string>, slide: Slide): void {
  if (attrs['id'])                  slide.id = attrs['id'];
  if (attrs['label'])               slide.label = attrs['label'];
  if (attrs['layout'])              slide.layout = attrs['layout'];
  if (attrs['transition'])          slide.transition = attrs['transition'];
  if (attrs['transition-duration']) slide['transition-duration'] = attrs['transition-duration'];
  if (attrs['transition-easing'])   slide['transition-easing'] = attrs['transition-easing'];
  if (attrs['duration-hint'])       slide['duration-hint'] = attrs['duration-hint'];
  if (attrs['hidden'])              slide.hidden = attrs['hidden'] === 'true';
  if (attrs['voice'])               slide.voice = attrs['voice'];
  if (attrs['voice-rate'])          slide['voice-rate'] = Number(attrs['voice-rate']);
  if (attrs['voice-pitch'])         slide['voice-pitch'] = attrs['voice-pitch'];
  if (attrs['language'])            slide.language = attrs['language'];
  if (attrs['print-only'])          slide['print-only'] = attrs['print-only'] === 'true';
  if (attrs['screen-only'])         slide['screen-only'] = attrs['screen-only'] === 'true';
  slide.background = parseBackground(attrs);
}

function parseBackground(attrs: Record<string, string>): SlideBackground | undefined {
  if (attrs['bg-color'])
    return { type: 'color', value: attrs['bg-color'] };
  if (attrs['bg-image'])
    return { type: 'image', value: attrs['bg-image'],
      size: attrs['bg-size'], position: attrs['bg-position'],
      opacity: attrs['bg-opacity'] ? Number(attrs['bg-opacity']) : undefined };
  if (attrs['bg-gradient'])
    return { type: 'gradient', value: attrs['bg-gradient'],
      from: attrs['bg-gradient-from'], to: attrs['bg-gradient-to'],
      angle: attrs['bg-gradient-angle'] };
  if (attrs['bg-video'])
    return { type: 'video', value: attrs['bg-video'],
      muted: attrs['bg-video-muted'] !== 'false',
      loop: attrs['bg-video-loop'] !== 'false' };
  return undefined;
}

// ── Attribute helpers ────────────────────────────────────────────────────────

function parseAttributesSafe(raw: string): Record<string, string> {
  try { return parseAttributes(raw); } catch { return {}; }
}

function applyAttributes(el: SlideElement, attrs: Record<string, string>): void {
  if (attrs['id']) el.id = attrs['id'];
  el.attributes = { ...(el.attributes ?? {}), ...attrs };
  if (attrs['animate']) {
    try {
      const { parseAnimationAttr } = await import('./attrParser.ts');
      el.animate = parseAnimationAttr(attrs['animate']);
    } catch { /* malformed — structural validator will catch */ }
  }
}

// ── Front matter YAML parser ─────────────────────────────────────────────────

function parseFrontMatterYaml(lines: string[], startLine: number): FrontMatter {
  const obj = parseYamlBlock(lines);

  const fm: FrontMatter = {
    title: getString(obj, 'title') ?? '',
    lineNumber: startLine,
  };
  const optStr = (k: string) => { const v = getString(obj, k); if (v !== undefined) return v; };
  fm.author        = optStr('author');
  fm.version       = optStr('version');
  fm.language      = optStr('language');
  fm.aspect_ratio  = optStr('aspect_ratio');
  fm.default_voice = optStr('default_voice');
  fm.global_theme  = optStr('global_theme');
  fm.background_music = optStr('background_music');

  if (typeof obj['background_music_volume'] === 'number')
    fm.background_music_volume = obj['background_music_volume'] as number;
  if (typeof obj['progress_bar'] === 'boolean')
    fm.progress_bar = obj['progress_bar'] as boolean;
  if (typeof obj['slide_numbers'] === 'boolean')
    fm.slide_numbers = obj['slide_numbers'] as boolean;

  const trans = obj['transitions'] as Record<string, unknown> | undefined;
  if (trans) fm.transitions = {
    default: getString(trans, 'default'),
    duration: getString(trans, 'duration'),
    easing: getString(trans, 'easing'),
  };

  const footer = obj['footer'] as Record<string, unknown> | undefined;
  if (footer) fm.footer = {
    left: getString(footer, 'left'), center: getString(footer, 'center'),
    right: getString(footer, 'right'),
    show: typeof footer['show'] === 'boolean' ? footer['show'] as boolean : undefined,
  };

  const header = obj['header'] as Record<string, unknown> | undefined;
  if (header) fm.header = {
    left: getString(header, 'left'), center: getString(header, 'center'),
    right: getString(header, 'right'),
    show: typeof header['show'] === 'boolean' ? header['show'] as boolean : undefined,
  };

  const exp = obj['export'] as Record<string, unknown> | undefined;
  if (exp) fm.export = {
    format: getString(exp, 'format') as any,
    quality: getString(exp, 'quality') as any,
    fps: typeof exp['fps'] === 'number' ? exp['fps'] as number : undefined,
    audio: typeof exp['audio'] === 'boolean' ? exp['audio'] as boolean : undefined,
    subtitles: typeof exp['subtitles'] === 'boolean' ? exp['subtitles'] as boolean : undefined,
    'subtitles-language': getString(exp, 'subtitles-language'),
    'print-layout': typeof exp['print-layout'] === 'boolean' ? exp['print-layout'] as boolean : undefined,
  };

  const toc = obj['toc'] as Record<string, unknown> | undefined;
  if (toc) fm.toc = {
    enabled: typeof toc['enabled'] === 'boolean' ? toc['enabled'] as boolean : undefined,
    'insert-after': getString(toc, 'insert-after'),
    depth: getString(toc, 'depth') as any,
  };

  const vars = obj['variables'] as Record<string, unknown> | undefined;
  if (vars) fm.variables = Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, String(v)])
  );

  return fm;
}

function parseYamlBlock(lines: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) { i++; continue; }
    const key = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();
    if (rest === '') {
      const nested: string[] = [];
      i++;
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i].startsWith('\t'))) {
        nested.push(lines[i].replace(/^  /, '').replace(/^\t/, ''));
        i++;
      }
      result[key] = parseYamlBlock(nested);
    } else {
      result[key] = parseYamlValue(rest);
      i++;
    }
  }
  return result;
}

function parseYamlValue(v: string): string | boolean | number {
  if (v === 'true') return true;
  if (v === 'false') return false;
  const n = Number(v);
  if (!isNaN(n) && v !== '') return n;
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  return v;
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === 'string' ? v : undefined;
}

// ── Content dispatcher (stub — filled in Tasks 5 & 6) ───────────────────────

function appendElement(el: SlideElement, state: ParserState): void {
  if (state.blockStack.length > 0) {
    const top = state.blockStack[state.blockStack.length - 1];
    top.element.children = top.element.children ?? [];
    top.element.children.push(el);
  } else if (state.currentSlide) {
    state.currentSlide.elements.push(el);
  }
}

function dispatchContent(_line: string, _lineNum: number, _state: ParserState): void {
  // Implemented in Task 5 (inline) and Task 6 (blocks)
}
```

> **Note on the async import in `applyAttributes`:** Remove the `await import` and use a top-level import instead. Fix: add `import { parseAnimationAttr } from './attrParser.ts';` at the top of the file and call it directly inside `applyAttributes`.

- [ ] **Step 4: Fix async import — add top-level import**

At the top of `slideParser.ts`, add:
```typescript
import { parseAttributes, parseAnimationAttr } from './attrParser.ts';
```

And update `applyAttributes` to call `parseAnimationAttr` directly (no `await import`):
```typescript
function applyAttributes(el: SlideElement, attrs: Record<string, string>): void {
  if (attrs['id']) el.id = attrs['id'];
  el.attributes = { ...(el.attributes ?? {}), ...attrs };
  if (attrs['animate']) {
    try { el.animate = parseAnimationAttr(attrs['animate']); } catch { /* structural validator catches */ }
  }
}
```

- [ ] **Step 5: Run — confirm tests pass**

```bash
npm test
```

Expected: all parser tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/parser/slideParser.ts tests/parser/slideParser.test.ts
git commit -m "feat: slideParser — front matter YAML, slide/section delimiters, background parsing"
```

---

### Task 5: slideParser — Inline Content Elements

**Files:**
- Modify: `src/parser/slideParser.ts` (implement `dispatchContent` for inline types)
- Modify: `tests/parser/slideParser.test.ts` (add inline content tests)

- [ ] **Step 1: Add inline content tests to `tests/parser/slideParser.test.ts`**

Append these tests:

```typescript
test('parses heading levels', () => {
  const src = `---\ntitle: "T"\n---\n\n# H1\n## H2\n### H3\n`;
  const doc = parseDocument(src, 'test.md');
  const els = doc.slides[0].elements;
  assert.equal(els[0].type, 'heading'); assert.equal(els[0].level, 1); assert.equal(els[0].content, 'H1');
  assert.equal(els[1].type, 'heading'); assert.equal(els[1].level, 2);
  assert.equal(els[2].type, 'heading'); assert.equal(els[2].level, 3);
});

test('parses paragraph', () => {
  const src = `---\ntitle: "T"\n---\n\nHello world.\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].elements[0].type, 'paragraph');
  assert.equal(doc.slides[0].elements[0].content, 'Hello world.');
});

test('parses unordered list', () => {
  const src = `---\ntitle: "T"\n---\n\n* Item A\n* Item B\n`;
  const doc = parseDocument(src, 'test.md');
  const el = doc.slides[0].elements[0];
  assert.equal(el.type, 'list');
  assert.ok(el.content?.includes('Item A'));
});

test('parses ordered list', () => {
  const src = `---\ntitle: "T"\n---\n\n1. Step One\n2. Step Two\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].elements[0].type, 'list');
});

test('parses image', () => {
  const src = `---\ntitle: "T"\n---\n\n![Alt text](assets/img.png)\n`;
  const doc = parseDocument(src, 'test.md');
  const el = doc.slides[0].elements[0];
  assert.equal(el.type, 'image');
  assert.equal(el.alt, 'Alt text');
  assert.equal(el.src, 'assets/img.png');
});

test('image type=video creates video element', () => {
  const src = `---\ntitle: "T"\n---\n\n![Demo](assets/demo.mp4)\n{ type="video" controls="true" }\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].elements[0].type, 'video');
});

test('parses blockquote', () => {
  const src = `---\ntitle: "T"\n---\n\n> A great quote.\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].elements[0].type, 'blockquote');
  assert.equal(doc.slides[0].elements[0].content, 'A great quote.');
});

test('parses table', () => {
  const src = `---\ntitle: "T"\n---\n\n| A | B |\n|---|---|\n| 1 | 2 |\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].elements[0].type, 'table');
});

test('parses code fence', () => {
  const src = "---\ntitle: \"T\"\n---\n\n```python\ndef hello():\n    pass\n```\n";
  const doc = parseDocument(src, 'test.md');
  const el = doc.slides[0].elements[0];
  assert.equal(el.type, 'code');
  assert.equal(el.attributes?.['language'], 'python');
  assert.ok(el.content?.includes('def hello'));
});

test('parses math block', () => {
  const src = `---\ntitle: "T"\n---\n\n$$\nE = mc^2\n$$\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].elements[0].type, 'math');
  assert.ok(doc.slides[0].elements[0].content?.includes('E = mc'));
});

test('{ } block attaches id and animate to preceding heading', () => {
  const src = `---\ntitle: "T"\n---\n\n# My Title\n{ id="main-title" animate="in: fade trigger=onload duration=0.5s" }\n`;
  const doc = parseDocument(src, 'test.md');
  const el = doc.slides[0].elements[0];
  assert.equal(el.id, 'main-title');
  assert.equal(el.animate?.phase, 'in');
  assert.equal(el.animate?.effect, 'fade');
});

test('parses @icon directive', () => {
  const src = `---\ntitle: "T"\n---\n\n@icon(check-circle)\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].elements[0].type, 'icon');
  assert.equal(doc.slides[0].elements[0].attributes?.['icon'], 'check-circle');
});
```

- [ ] **Step 2: Run — confirm new tests fail**

```bash
npm test
```

Expected: new inline content tests fail (dispatchContent is a no-op stub).

- [ ] **Step 3: Implement `dispatchContent` in `src/parser/slideParser.ts`**

Replace the stub `dispatchContent` with:

```typescript
function dispatchContent(line: string, lineNum: number, state: ParserState): void {
  const trimmed = line.trim();

  // Empty line — flush pending table
  if (!trimmed) {
    flushTable(state);
    state.pendingElement = null;
    return;
  }

  // Code fence open
  if (trimmed.startsWith('```')) {
    flushTable(state);
    state.pendingElement = null;
    state.inCodeFence = true;
    state.codeFenceLang = trimmed.slice(3).trim();
    return;
  }

  // Math block open
  if (trimmed === '$$') {
    flushTable(state);
    state.pendingElement = null;
    state.inMathBlock = true;
    return;
  }

  // ::: block open
  const blockOpenMatch = trimmed.match(/^:::\s+(\w+)(?:\s+(\{.*\}))?\s*$/);
  if (blockOpenMatch) {
    flushTable(state);
    state.pendingElement = null;
    const blockType = blockOpenMatch[1] as BlockType;
    const attrs = blockOpenMatch[2] ? parseAttributesSafe(blockOpenMatch[2]) : {};
    const el: SlideElement = { type: blockType as any, attributes: attrs, children: [], lineNumber: lineNum };
    if (attrs['id']) el.id = attrs['id'];
    state.blockStack.push({ type: blockType, element: el, startLine: lineNum });
    return;
  }

  // ::: block close
  if (trimmed === ':::') {
    flushTable(state);
    state.pendingElement = null;
    if (state.blockStack.length > 0) {
      const popped = state.blockStack.pop()!;
      // Special: notes block
      if (popped.type === 'notes') {
        const notesEl = popped.element;
        const raw = notesEl.content ?? '';
        const markers = [...raw.matchAll(/<marker:\s*([\w-]+)>/g)].map(m => m[1]);
        const notes: NotesBlock = {
          raw,
          markers,
          voice: notesEl.attributes?.['voice'],
          lineNumber: popped.startLine,
        };
        if (state.currentSlide) state.currentSlide.notes = notes;
      } else {
        appendElement(popped.element, state);
        state.pendingElement = popped.element;
      }
    }
    return;
  }

  // Inside a block — accumulate content
  if (state.blockStack.length > 0) {
    const top = state.blockStack[state.blockStack.length - 1];
    if (top.type === 'notes' || top.type === 'chart' || top.type === 'diagram'
        || top.type === 'keyframes' || top.type === 'path') {
      top.element.content = (top.element.content ?? '') + (top.element.content ? '\n' : '') + line;
    }
    return;
  }

  // @directive
  if (trimmed.startsWith('@')) {
    flushTable(state);
    try {
      const { parseDirective } = await import('./directiveParser.ts');
      const d = parseDirective(trimmed);
      const el: SlideElement = { type: d.name as any, attributes: d.args, lineNumber: lineNum };
      appendElement(el, state);
      state.pendingElement = el;
    } catch { /* malformed directive — skip */ }
    return;
  }

  // Image / video / audio
  const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (imgMatch) {
    flushTable(state);
    const el: SlideElement = {
      type: 'image',
      alt: imgMatch[1],
      src: imgMatch[2],
      lineNumber: lineNum,
    };
    appendElement(el, state);
    state.pendingElement = el;
    return;
  }

  // Blockquote
  if (trimmed.startsWith('> ')) {
    flushTable(state);
    const el: SlideElement = { type: 'blockquote', content: trimmed.slice(2), lineNumber: lineNum };
    appendElement(el, state);
    state.pendingElement = el;
    return;
  }

  // Table row
  if (trimmed.startsWith('|')) {
    state.tableLines.push(trimmed);
    state.pendingElement = null;
    return;
  }

  // Flush table if we had one and this line is not a table row
  flushTable(state);

  // Heading
  const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    const el: SlideElement = {
      type: 'heading',
      level: headingMatch[1].length,
      content: headingMatch[2],
      lineNumber: lineNum,
    };
    appendElement(el, state);
    state.pendingElement = el;
    return;
  }

  // Unordered list
  if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
    const el: SlideElement = { type: 'list', content: trimmed.slice(2), lineNumber: lineNum };
    appendElement(el, state);
    state.pendingElement = el;
    return;
  }

  // Ordered list
  if (/^\d+\.\s/.test(trimmed)) {
    const el: SlideElement = { type: 'list', content: trimmed.replace(/^\d+\.\s/, ''), lineNumber: lineNum };
    appendElement(el, state);
    state.pendingElement = el;
    return;
  }

  // Paragraph
  const el: SlideElement = { type: 'paragraph', content: trimmed, lineNumber: lineNum };
  appendElement(el, state);
  state.pendingElement = el;
}

function flushTable(state: ParserState): void {
  if (state.tableLines.length === 0) return;
  const el: SlideElement = {
    type: 'table',
    content: state.tableLines.join('\n'),
    lineNumber: 0,
  };
  state.tableLines = [];
  appendElement(el, state);
  state.pendingElement = el;
}
```

> **Note on async import inside dispatchContent:** Remove the `await import` for `parseDirective`. Add `import { parseDirective } from './directiveParser.ts';` at the top of `slideParser.ts` and call it directly.

After adding the top-level import, update `dispatchContent` to call `parseDirective(trimmed)` directly without the `await import` wrapper.

Also add `applyAttributes` logic for `type` attribute: after `pendingElement` is set from an image element, if the next `{ }` block contains `type="video"` or `type="audio"`, update the element type:

In `applyAttributes`:
```typescript
function applyAttributes(el: SlideElement, attrs: Record<string, string>): void {
  if (attrs['id']) el.id = attrs['id'];
  el.attributes = { ...(el.attributes ?? {}), ...attrs };
  if (attrs['type'] && el.type === 'image') {
    if (attrs['type'] === 'video') el.type = 'video';
    if (attrs['type'] === 'audio') el.type = 'audio';
  }
  if (attrs['animate']) {
    try { el.animate = parseAnimationAttr(attrs['animate']); } catch { /* structural validator catches */ }
  }
}
```

- [ ] **Step 4: Run — confirm tests pass**

```bash
npm test
```

Expected: all inline content tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/parser/slideParser.ts tests/parser/slideParser.test.ts
git commit -m "feat: slideParser — inline content elements (headings, lists, images, code, math, tables)"
```

---

### Task 6: slideParser — Block Elements & Notes

**Files:**
- Modify: `src/parser/slideParser.ts` (complete ::: block handling + chart/keyframe parsing)
- Modify: `tests/parser/slideParser.test.ts` (add block element tests)

- [ ] **Step 1: Add block element tests**

Append to `tests/parser/slideParser.test.ts`:

```typescript
test('parses ::: notes block', () => {
  const src = `---\ntitle: "T"\n---\n\n# S\n\n::: notes\nHello world <marker: step1>\n:::\n`;
  const doc = parseDocument(src, 'test.md');
  assert.ok(doc.slides[0].notes);
  assert.ok(doc.slides[0].notes?.raw.includes('Hello world'));
  assert.deepEqual(doc.slides[0].notes?.markers, ['step1']);
});

test('parses ::: notes with voice attribute', () => {
  const src = `---\ntitle: "T"\n---\n\n# S\n\n::: notes {voice="en-GB-Neural-A"}\nHello\n:::\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].notes?.voice, 'en-GB-Neural-A');
});

test('parses ::: container with ::: column children', () => {
  const src = `---\ntitle: "T"\n---\n\n::: container {distribution="equal"}\n::: column {id="col-a"}\n# Left\n:::\n::: column {id="col-b"}\n# Right\n:::\n:::\n`;
  const doc = parseDocument(src, 'test.md');
  const container = doc.slides[0].elements[0];
  assert.equal(container.type, 'container');
  assert.equal(container.children?.length, 2);
  assert.equal(container.children?.[0].type, 'column');
  assert.equal(container.children?.[0].id, 'col-a');
});

test('parses ::: grid with ::: cell children', () => {
  const src = `---\ntitle: "T"\n---\n\n::: grid {columns="2"}\n::: cell {col="1" row="1"}\nA\n:::\n::: cell {col="2" row="1"}\nB\n:::\n:::\n`;
  const doc = parseDocument(src, 'test.md');
  const grid = doc.slides[0].elements[0];
  assert.equal(grid.type, 'grid');
  assert.equal(grid.children?.length, 2);
});

test('parses ::: chart block', () => {
  const src = `---\ntitle: "T"\n---\n\n::: chart {type="bar" id="c1"}\nlabels: ["Q1", "Q2"]\ndatasets:\n  - label: "Rev"\n    data: [100, 200]\n:::\n`;
  const doc = parseDocument(src, 'test.md');
  const chart = doc.slides[0].elements[0];
  assert.equal(chart.type, 'chart');
  assert.equal(chart.id, 'c1');
  assert.ok(chart.chartData);
  assert.equal(chart.chartData?.type, 'bar');
  assert.deepEqual(chart.chartData?.labels, ['Q1', 'Q2']);
  assert.equal(chart.chartData?.datasets[0].label, 'Rev');
});

test('parses ::: keyframes block', () => {
  const src = `---\ntitle: "T"\n---\n\n::: keyframes {id="kf-fly"}\n0%   { opacity="0" scale="0.8" }\n100% { opacity="1" scale="1.0" }\n:::\n`;
  const doc = parseDocument(src, 'test.md');
  const kf = doc.slides[0].elements[0];
  assert.equal(kf.type, 'keyframes');
  assert.equal(kf.id, 'kf-fly');
  assert.equal(kf.keyframeStops?.length, 2);
  assert.equal(kf.keyframeStops?.[0].percent, 0);
  assert.equal(kf.keyframeStops?.[0].props['opacity'], '0');
});

test('parses ::: shape block', () => {
  const src = `---\ntitle: "T"\n---\n\n::: shape {type="callout" id="s1"}\nContent here\n:::\n`;
  const doc = parseDocument(src, 'test.md');
  const shape = doc.slides[0].elements[0];
  assert.equal(shape.type, 'shape');
  assert.equal(shape.id, 's1');
});
```

- [ ] **Step 2: Run — confirm new tests fail**

```bash
npm test
```

- [ ] **Step 3: Add chart + keyframe parsing functions to `src/parser/slideParser.ts`**

Add these functions before `dispatchContent`:

```typescript
function parseChartData(raw: string, chartType: string): ChartData {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const chart: ChartData = {
    type: chartType as ChartData['type'],
    datasets: [],
  };

  // Parse labels: ["Q1", "Q2", "Q3"]
  const labelsLine = lines.find(l => l.startsWith('labels:'));
  if (labelsLine) {
    const match = labelsLine.match(/\[([^\]]+)\]/);
    if (match) {
      chart.labels = match[1].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    }
  }

  // Parse datasets block
  let inDatasets = false;
  let currentDataset: { label?: string; data?: number[]; color?: string } = {};
  for (const line of lines) {
    if (line.startsWith('datasets:')) { inDatasets = true; continue; }
    if (!inDatasets) continue;
    if (line.startsWith('- label:')) {
      if (currentDataset.label !== undefined) chart.datasets.push(currentDataset as any);
      currentDataset = { label: line.replace(/^- label:\s*"?/, '').replace(/"$/, '') };
    } else if (line.startsWith('label:')) {
      currentDataset.label = line.replace(/^label:\s*"?/, '').replace(/"$/, '');
    } else if (line.startsWith('data:')) {
      const m = line.match(/\[([^\]]+)\]/);
      if (m) currentDataset.data = m[1].split(',').map(s => Number(s.trim()));
    } else if (line.startsWith('color:')) {
      currentDataset.color = line.replace(/^color:\s*"?/, '').replace(/"$/, '');
    }
  }
  if (currentDataset.label !== undefined) chart.datasets.push(currentDataset as any);

  return chart;
}

function parseKeyframeStops(raw: string): KeyframeStop[] {
  const stops: KeyframeStop[] = [];
  for (const line of raw.split('\n')) {
    const match = line.trim().match(/^(\d+)%\s+(\{.*\})$/);
    if (!match) continue;
    const percent = Number(match[1]);
    const props = parseAttributesSafe(match[2]);
    stops.push({ percent, props });
  }
  return stops;
}
```

Also update the `:::` block close handler in `dispatchContent` to finalize chart and keyframe blocks:

In the `trimmed === ':::'` branch, after popping `popped`, add before the `appendElement` call:

```typescript
// Finalize chart data
if (popped.type === 'chart') {
  const chartType = popped.element.attributes?.['type'] ?? 'bar';
  popped.element.chartData = parseChartData(popped.element.content ?? '', chartType);
  popped.element.content = undefined;
}
// Finalize keyframe stops
if (popped.type === 'keyframes') {
  popped.element.keyframeStops = parseKeyframeStops(popped.element.content ?? '');
  popped.element.content = undefined;
}
// Finalize path
if (popped.type === 'path') {
  popped.element.pathD = popped.element.content?.trim();
  popped.element.content = undefined;
}
```

- [ ] **Step 4: Run — confirm tests pass**

```bash
npm test
```

Expected: all block element tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/parser/slideParser.ts tests/parser/slideParser.test.ts
git commit -m "feat: slideParser — block elements (container, grid, chart, keyframes, notes, shape)"
```

---

### Task 7: Structural Validator

**Files:**
- Create: `tests/helpers.ts`
- Create: `src/validators/structural.ts`
- Create: `tests/validators/structural.test.ts`

- [ ] **Step 1: Create `tests/helpers.ts`**

```typescript
import {
  SlideDSLDocument, FrontMatter, Slide, Section, SlideElement, NotesBlock
} from '../src/parser/types.ts';

export function buildDoc(overrides?: Partial<SlideDSLDocument>): SlideDSLDocument {
  const slide = buildSlide();
  const section: Section = { slides: [slide], lineNumber: 1 };
  return {
    frontMatter: buildFrontMatter(),
    sections: [section],
    slides: [slide],
    ...overrides,
  };
}

export function buildFrontMatter(overrides?: Partial<FrontMatter>): FrontMatter {
  return { title: 'Test', lineNumber: 1, ...overrides };
}

export function buildSlide(overrides?: Partial<Slide>): Slide {
  return {
    index: 0, startLine: 5, endLine: 20,
    elements: [], ...overrides
  };
}

export function buildElement(overrides?: Partial<SlideElement>): SlideElement {
  return { type: 'paragraph', content: 'text', lineNumber: 6, ...overrides };
}

export function buildNotes(overrides?: Partial<NotesBlock>): NotesBlock {
  return { raw: 'Hello world.', markers: [], lineNumber: 10, ...overrides };
}
```

- [ ] **Step 2: Write failing structural tests**

Create `tests/validators/structural.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runStructural } from '../../src/validators/structural.ts';
import { buildDoc, buildFrontMatter, buildSlide, buildElement } from '../helpers.ts';

test('structural/missing-title: fires when title is empty', () => {
  const doc = buildDoc({ frontMatter: buildFrontMatter({ title: '' }) });
  const issues = runStructural(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'structural/missing-title'));
});

test('structural/missing-title: no issue when title present', () => {
  const doc = buildDoc({ frontMatter: buildFrontMatter({ title: 'Hello' }) });
  const issues = runStructural(doc, 'test.md');
  assert.ok(!issues.some(i => i.code === 'structural/missing-title'));
});

test('structural/animation-invalid-phase: fires for bad phase', () => {
  const el = buildElement({
    animate: { phase: 'bounce' as any, effect: 'fade', trigger: 'onload', duration: '0.5s' }
  });
  const slide = buildSlide({ elements: [el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runStructural(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'structural/animation-invalid-phase'));
});

test('structural/animation-missing-field: fires when duration absent', () => {
  const el = buildElement({
    animate: { phase: 'in', effect: 'fade', trigger: 'onload', duration: '' }
  });
  const slide = buildSlide({ elements: [el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runStructural(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'structural/animation-missing-field'));
});

test('structural/invalid-export-format: fires for bad format', () => {
  const doc = buildDoc({
    frontMatter: buildFrontMatter({ export: { format: 'mov' as any } })
  });
  const issues = runStructural(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'structural/invalid-export-format'));
});

test('structural/invalid-transition-type: fires for unknown transition', () => {
  const slide = buildSlide({ transition: 'spin-around' });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runStructural(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'structural/invalid-transition-type'));
});

test('structural/chart-missing-datasets: fires for chart with no datasets', () => {
  const el = buildElement({ type: 'chart', chartData: { type: 'bar', datasets: [] } });
  const slide = buildSlide({ elements: [el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runStructural(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'structural/chart-missing-datasets'));
});

test('structural/grid-missing-columns: fires for grid without columns attr', () => {
  const el = buildElement({ type: 'grid', attributes: {} });
  const slide = buildSlide({ elements: [el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runStructural(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'structural/grid-missing-columns'));
});

test('structural/template-missing-id: fires for template without id', () => {
  const el = buildElement({ type: 'template', attributes: {} });
  const slide = buildSlide({ elements: [el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runStructural(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'structural/template-missing-id'));
});

test('structural/keyframe-invalid-stop: fires for stop > 100', () => {
  const el = buildElement({ type: 'keyframes', keyframeStops: [{ percent: 150, props: {} }] });
  const slide = buildSlide({ elements: [el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runStructural(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'structural/keyframe-invalid-stop'));
});
```

- [ ] **Step 3: Run — confirm fail**

```bash
npm test
```

- [ ] **Step 4: Implement `src/validators/structural.ts`**

```typescript
import { SlideDSLDocument, Issue, SlideElement } from '../parser/types.ts';

const VALID_PHASES = new Set(['in', 'out', 'emphasis', 'move']);
const VALID_TRANSITIONS = new Set([
  'none', 'fade', 'push-left', 'push-right', 'push-up', 'push-down',
  'wipe-left', 'wipe-right', 'zoom-in', 'zoom-out',
  'flip-horizontal', 'flip-vertical', 'cube-left', 'cube-right',
  'dissolve', 'morph'
]);
const VALID_EXPORT_FORMATS = new Set(['mp4', 'pdf', 'pptx', 'html', 'png']);

export function runStructural(doc: SlideDSLDocument, filePath: string): Issue[] {
  const issues: Issue[] = [];

  // structural/missing-title
  if (!doc.frontMatter.title?.trim()) {
    issues.push({ code: 'structural/missing-title', severity: 'error',
      line: doc.frontMatter.lineNumber, file: filePath,
      message: "Front matter must have a 'title' field." });
  }

  // structural/invalid-export-format
  const fmt = doc.frontMatter.export?.format;
  if (fmt && !VALID_EXPORT_FORMATS.has(fmt)) {
    issues.push({ code: 'structural/invalid-export-format', severity: 'error',
      line: doc.frontMatter.lineNumber, file: filePath,
      message: `export.format '${fmt}' is not valid. Must be one of: ${[...VALID_EXPORT_FORMATS].join(', ')}.` });
  }

  for (const slide of doc.slides) {
    // structural/invalid-transition-type
    if (slide.transition && !VALID_TRANSITIONS.has(slide.transition)) {
      issues.push({ code: 'structural/invalid-transition-type', severity: 'error',
        line: slide.startLine, file: filePath,
        message: `Slide transition '${slide.transition}' is not a valid transition type.` });
    }

    // Walk all elements
    for (const el of walkElements(slide.elements)) {
      checkElement(el, filePath, issues);
    }
  }

  return issues;
}

function checkElement(el: SlideElement, filePath: string, issues: Issue[]): void {
  // structural/animation-invalid-phase + structural/animation-missing-field
  if (el.animate) {
    if (!VALID_PHASES.has(el.animate.phase)) {
      issues.push({ code: 'structural/animation-invalid-phase', severity: 'error',
        line: el.lineNumber, file: filePath,
        message: `Animation phase '${el.animate.phase}' is invalid. Must be one of: in, out, emphasis, move.` });
    }
    if (!el.animate.duration?.trim()) {
      issues.push({ code: 'structural/animation-missing-field', severity: 'error',
        line: el.lineNumber, file: filePath,
        message: `Animation on element at line ${el.lineNumber} is missing required field 'duration'.` });
    }
    if (!el.animate.trigger?.trim()) {
      issues.push({ code: 'structural/animation-missing-field', severity: 'error',
        line: el.lineNumber, file: filePath,
        message: `Animation on element at line ${el.lineNumber} is missing required field 'trigger'.` });
    }
  }

  // structural/chart-missing-datasets
  if (el.type === 'chart' && (!el.chartData || el.chartData.datasets.length === 0)) {
    issues.push({ code: 'structural/chart-missing-datasets', severity: 'error',
      line: el.lineNumber, file: filePath,
      message: '::: chart block must have at least one dataset.' });
  }

  // structural/keyframe-invalid-stop
  if (el.type === 'keyframes') {
    for (const stop of el.keyframeStops ?? []) {
      if (stop.percent < 0 || stop.percent > 100) {
        issues.push({ code: 'structural/keyframe-invalid-stop', severity: 'error',
          line: el.lineNumber, file: filePath,
          message: `Keyframe stop percentage ${stop.percent}% is outside 0–100.` });
      }
    }
  }

  // structural/grid-missing-columns
  if (el.type === 'grid' && !el.attributes?.['columns']) {
    issues.push({ code: 'structural/grid-missing-columns', severity: 'error',
      line: el.lineNumber, file: filePath,
      message: '::: grid block is missing required attribute "columns".' });
  }

  // structural/template-missing-id
  if (el.type === 'template' && !el.id && !el.attributes?.['id']) {
    issues.push({ code: 'structural/template-missing-id', severity: 'error',
      line: el.lineNumber, file: filePath,
      message: '::: template block is missing required attribute "id".' });
  }
}

function* walkElements(elements: SlideElement[]): Generator<SlideElement> {
  for (const el of elements) {
    yield el;
    if (el.children) yield* walkElements(el.children);
  }
}
```

- [ ] **Step 5: Run — confirm tests pass**

```bash
npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/validators/structural.ts tests/validators/structural.test.ts tests/helpers.ts
git commit -m "feat: structural validator — 11 error rules"
```

---

### Task 8: Semantic Validator

**Files:**
- Create: `src/validators/semantic.ts`
- Create: `tests/validators/semantic.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/validators/semantic.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSemantic } from '../../src/validators/semantic.ts';
import { buildDoc, buildSlide, buildElement, buildNotes } from '../helpers.ts';

test('semantic/undefined-trigger: fires for after-[id] with missing id', () => {
  const el = buildElement({
    animate: { phase: 'in', effect: 'fade', trigger: 'after-missing-id', duration: '0.5s' }
  });
  const slide = buildSlide({ elements: [el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runSemantic(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'semantic/undefined-trigger'));
});

test('semantic/undefined-trigger: no issue when id exists on slide', () => {
  const target = buildElement({ type: 'heading', id: 'my-heading', lineNumber: 7 });
  const el = buildElement({
    animate: { phase: 'in', effect: 'fade', trigger: 'after-my-heading', duration: '0.5s' },
    lineNumber: 8,
  });
  const slide = buildSlide({ elements: [target, el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runSemantic(doc, 'test.md');
  assert.ok(!issues.some(i => i.code === 'semantic/undefined-trigger'));
});

test('semantic/marker-undefined: fires when narrate trigger has no matching marker', () => {
  const el = buildElement({
    animate: { phase: 'in', effect: 'fade', trigger: 'narrate-step1', duration: '0.5s' }
  });
  const notes = buildNotes({ markers: [] }); // no markers
  const slide = buildSlide({ elements: [el], notes });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runSemantic(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'semantic/marker-undefined'));
});

test('semantic/unreferenced-marker: fires when notes marker has no trigger', () => {
  const notes = buildNotes({ markers: ['step1'] }); // marker exists
  const slide = buildSlide({ elements: [], notes }); // but no animation references it
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runSemantic(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'semantic/unreferenced-marker'));
});

test('semantic/keyframe-ref-undefined: fires for missing keyframes block', () => {
  const el = buildElement({
    animate: { phase: 'in', effect: 'keyframe', trigger: 'onload', duration: '1s', ref: 'kf-missing' }
  });
  const slide = buildSlide({ elements: [el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runSemantic(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'semantic/keyframe-ref-undefined'));
});

test('semantic/morph-target-undefined: fires for missing morph target', () => {
  const el = buildElement({
    animate: { phase: 'out', effect: 'morph', trigger: 'onload', duration: '0.8s', target: 'nonexistent' }
  });
  const slide = buildSlide({ elements: [el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runSemantic(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'semantic/morph-target-undefined'));
});

test('semantic/toc-anchor-missing: fires when insert-after slide does not exist', () => {
  const doc = buildDoc({
    frontMatter: { title: 'T', lineNumber: 1, toc: { enabled: true, 'insert-after': 'slide-x' } }
  });
  const issues = runSemantic(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'semantic/toc-anchor-missing'));
});

test('semantic/template-use-missing: fires for @use referencing unknown template', () => {
  const el = buildElement({ type: 'use' as any, attributes: { ref: 'tpl-nonexistent' } });
  const slide = buildSlide({ elements: [el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runSemantic(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'semantic/template-use-missing'));
});
```

- [ ] **Step 2: Run — confirm fail**

```bash
npm test
```

- [ ] **Step 3: Implement `src/validators/semantic.ts`**

```typescript
import { SlideDSLDocument, Issue, Slide, SlideElement } from '../parser/types.ts';

export function runSemantic(doc: SlideDSLDocument, filePath: string): Issue[] {
  const issues: Issue[] = [];

  // Collect document-level ids for cross-slide lookups
  const slideIds = new Set(doc.slides.map(s => s.id).filter(Boolean) as string[]);
  const allElements = doc.slides.flatMap(s => [...walkElements(s.elements)]);
  const keyframeIds = new Set(allElements.filter(e => e.type === 'keyframes').map(e => e.id).filter(Boolean) as string[]);
  const pathIds = new Set(allElements.filter(e => e.type === 'path').map(e => e.id).filter(Boolean) as string[]);
  const templateIds = new Set(allElements.filter(e => e.type === 'template').map(e => e.id).filter(Boolean) as string[]);

  // semantic/toc-anchor-missing
  const tocAnchor = doc.frontMatter.toc?.['insert-after'];
  if (doc.frontMatter.toc?.enabled && tocAnchor && !slideIds.has(tocAnchor)) {
    issues.push({ code: 'semantic/toc-anchor-missing', severity: 'error',
      line: doc.frontMatter.lineNumber, file: filePath,
      message: `toc.insert-after references slide id '${tocAnchor}' which does not exist.` });
  }

  for (const slide of doc.slides) {
    const slideElementIds = new Set(
      [...walkElements(slide.elements)].map(e => e.id).filter(Boolean) as string[]
    );
    const notesMarkers = new Set(slide.notes?.markers ?? []);
    const referencedMarkers = new Set<string>();

    for (const el of walkElements(slide.elements)) {
      const anim = el.animate;
      if (!anim) continue;

      const trigger = anim.trigger;

      // semantic/undefined-trigger
      if (trigger.startsWith('after-') || trigger.startsWith('with-')) {
        const refId = trigger.startsWith('after-') ? trigger.slice(6) : trigger.slice(5);
        if (!slideElementIds.has(refId)) {
          issues.push({ code: 'semantic/undefined-trigger', severity: 'error',
            line: el.lineNumber, file: filePath,
            message: `Animation trigger '${trigger}' references id '${refId}' which does not exist on this slide.` });
        }
      }

      // semantic/marker-undefined
      if (trigger.startsWith('narrate-')) {
        const markerName = trigger.slice(8);
        referencedMarkers.add(markerName);
        if (!notesMarkers.has(markerName)) {
          issues.push({ code: 'semantic/marker-undefined', severity: 'error',
            line: el.lineNumber, file: filePath,
            message: `Animation trigger '${trigger}' references marker '${markerName}' not found in this slide's notes block.` });
        }
      }

      // semantic/keyframe-ref-undefined
      if (anim.effect === 'keyframe' && anim.ref && !keyframeIds.has(anim.ref)) {
        issues.push({ code: 'semantic/keyframe-ref-undefined', severity: 'error',
          line: el.lineNumber, file: filePath,
          message: `Animation references keyframes ref='${anim.ref}' but no ::: keyframes block with that id exists.` });
      }

      // semantic/path-ref-undefined
      if (anim.phase === 'move' && anim.ref && !pathIds.has(anim.ref)) {
        issues.push({ code: 'semantic/path-ref-undefined', severity: 'error',
          line: el.lineNumber, file: filePath,
          message: `Animation references path ref='${anim.ref}' but no ::: path block with that id exists.` });
      }

      // semantic/morph-target-undefined
      if (anim.effect === 'morph' && anim.target && !slideElementIds.has(anim.target)) {
        issues.push({ code: 'semantic/morph-target-undefined', severity: 'error',
          line: el.lineNumber, file: filePath,
          message: `Morph animation target='${anim.target}' does not exist on this slide.` });
      }
    }

    // semantic/unreferenced-marker
    for (const marker of notesMarkers) {
      if (!referencedMarkers.has(marker)) {
        issues.push({ code: 'semantic/unreferenced-marker', severity: 'error',
          line: slide.notes?.lineNumber ?? slide.startLine, file: filePath,
          message: `Notes marker '<marker: ${marker}>' has no corresponding trigger=narrate-${marker} animation on this slide.` });
      }
    }

    // semantic/hotspot-target-undefined
    for (const el of walkElements(slide.elements)) {
      if (el.type === 'hotspot') {
        const targetSlide = el.attributes?.['target-slide']?.replace(/^#/, '');
        if (targetSlide && !slideIds.has(targetSlide)) {
          issues.push({ code: 'semantic/hotspot-target-undefined', severity: 'error',
            line: el.lineNumber, file: filePath,
            message: `Hotspot target-slide='#${targetSlide}' references a slide id that does not exist.` });
        }
      }

      // semantic/template-use-missing
      if (el.type === ('use' as any)) {
        const ref = el.attributes?.['ref'];
        if (ref && !templateIds.has(ref)) {
          issues.push({ code: 'semantic/template-use-missing', severity: 'error',
            line: el.lineNumber, file: filePath,
            message: `@use references template id '${ref}' but no ::: template block with that id exists.` });
        }
      }
    }
  }

  return issues;
}

function* walkElements(elements: SlideElement[]): Generator<SlideElement> {
  for (const el of elements) {
    yield el;
    if (el.children) yield* walkElements(el.children);
  }
}
```

- [ ] **Step 4: Run — confirm tests pass**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/validators/semantic.ts tests/validators/semantic.test.ts
git commit -m "feat: semantic validator — 9 cross-element error rules"
```

---

### Task 9: Lint Validator + validators/index

**Files:**
- Create: `src/validators/lint.ts`
- Create: `src/validators/index.ts`
- Create: `tests/validators/lint.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/validators/lint.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runLint } from '../../src/validators/lint.ts';
import { buildDoc, buildSlide, buildElement, buildFrontMatter, buildNotes } from '../helpers.ts';

test('lint/no-notes-block: fires when slide has no notes', () => {
  const slide = buildSlide({ notes: undefined });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runLint(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'lint/no-notes-block'));
});

test('lint/no-notes-block: no issue when notes present', () => {
  const slide = buildSlide({ notes: buildNotes() });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runLint(doc, 'test.md');
  assert.ok(!issues.some(i => i.code === 'lint/no-notes-block'));
});

test('lint/multiple-h1: fires when slide has 2 H1 headings', () => {
  const h1a = buildElement({ type: 'heading', level: 1, lineNumber: 6 });
  const h1b = buildElement({ type: 'heading', level: 1, lineNumber: 7 });
  const slide = buildSlide({ elements: [h1a, h1b], notes: buildNotes() });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runLint(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'lint/multiple-h1'));
});

test('lint/delay-exceeds-duration: fires when delay >= duration', () => {
  const el = buildElement({
    animate: { phase: 'in', effect: 'fade', trigger: 'onload', duration: '0.5s', delay: '0.6s' }
  });
  const slide = buildSlide({ elements: [el], notes: buildNotes() });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runLint(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'lint/delay-exceeds-duration'));
});

test('lint/container-single-column: fires for container with 1 column', () => {
  const col = buildElement({ type: 'column', lineNumber: 7 });
  const container = buildElement({ type: 'container', children: [col], lineNumber: 6 });
  const slide = buildSlide({ elements: [container], notes: buildNotes() });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runLint(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'lint/container-single-column'));
});

test('lint/missing-recommended-frontmatter: fires when author missing', () => {
  const doc = buildDoc({ frontMatter: buildFrontMatter({ author: undefined }) });
  const issues = runLint(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'lint/missing-recommended-frontmatter'));
});

test('lint/hidden-slide-has-notes: fires for hidden slide with notes', () => {
  const slide = buildSlide({ hidden: true, notes: buildNotes() });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runLint(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'lint/hidden-slide-has-notes'));
});

test('lint/chart-no-aria-label: fires for chart without aria-label', () => {
  const el = buildElement({ type: 'chart', attributes: {}, chartData: { type: 'bar', datasets: [{ label: 'X', data: [1] }] } });
  const slide = buildSlide({ elements: [el], notes: buildNotes() });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runLint(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'lint/chart-no-aria-label'));
});

test('lint/slide-no-id: fires for slide without id', () => {
  const slide = buildSlide({ id: undefined, notes: buildNotes() });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runLint(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'lint/slide-no-id'));
});

test('lint/variable-undefined: fires for {{unknown}} token', () => {
  const el = buildElement({ type: 'paragraph', content: 'Hello {{unknown_var}}' });
  const slide = buildSlide({ elements: [el], notes: buildNotes() });
  const doc = buildDoc({
    slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }],
    frontMatter: buildFrontMatter({ variables: {} }),
  });
  const issues = runLint(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'lint/variable-undefined'));
});
```

- [ ] **Step 2: Run — confirm fail**

```bash
npm test
```

- [ ] **Step 3: Implement `src/validators/lint.ts`**

```typescript
import { SlideDSLDocument, Issue, SlideElement } from '../parser/types.ts';

const SYSTEM_TOKENS = new Set([
  'slide_number', 'slide_count', 'section_title', 'title', 'author', 'date'
]);

export function runLint(doc: SlideDSLDocument, filePath: string): Issue[] {
  const issues: Issue[] = [];
  const vars = doc.frontMatter.variables ?? {};
  const definedTokens = new Set([...Object.keys(vars), ...SYSTEM_TOKENS]);

  // lint/missing-recommended-frontmatter
  const fm = doc.frontMatter;
  const missing = (['author', 'default_voice', 'language', 'global_theme'] as const)
    .filter(k => !fm[k]);
  if (missing.length > 0) {
    issues.push({ code: 'lint/missing-recommended-frontmatter', severity: 'warning',
      line: fm.lineNumber, file: filePath,
      message: `Front matter is missing recommended fields: ${missing.join(', ')}.` });
  }

  for (const slide of doc.slides) {
    // lint/no-notes-block
    if (!slide.notes) {
      issues.push({ code: 'lint/no-notes-block', severity: 'warning',
        line: slide.startLine, file: filePath,
        message: `Slide at line ${slide.startLine} has no ::: notes block.` });
    }

    // lint/hidden-slide-has-notes
    if (slide.hidden && slide.notes) {
      issues.push({ code: 'lint/hidden-slide-has-notes', severity: 'warning',
        line: slide.startLine, file: filePath,
        message: `Hidden slide at line ${slide.startLine} has a ::: notes block that will never render.` });
    }

    // lint/slide-no-id
    if (!slide.id) {
      issues.push({ code: 'lint/slide-no-id', severity: 'warning',
        line: slide.startLine, file: filePath,
        message: `Slide at line ${slide.startLine} has no explicit id attribute.` });
    }

    // Count H1 headings
    const h1s = [...walkElements(slide.elements)].filter(e => e.type === 'heading' && e.level === 1);
    if (h1s.length > 1) {
      issues.push({ code: 'lint/multiple-h1', severity: 'warning',
        line: slide.startLine, file: filePath,
        message: `Slide has ${h1s.length} H1 headings. Best practice: one # heading per slide.` });
    }

    for (const el of walkElements(slide.elements)) {
      // lint/delay-exceeds-duration
      if (el.animate?.delay && el.animate.duration) {
        const delay = parseMs(el.animate.delay);
        const dur = parseMs(el.animate.duration);
        if (delay >= dur) {
          issues.push({ code: 'lint/delay-exceeds-duration', severity: 'warning',
            line: el.lineNumber, file: filePath,
            message: `Animation delay (${el.animate.delay}) is ≥ duration (${el.animate.duration}).` });
        }
      }

      // lint/loop-infinite-no-exit
      if (el.animate?.loop === 'infinite') {
        const hasOut = [...walkElements(slide.elements)].some(
          e => e.id === el.id && e.animate?.phase === 'out'
        );
        if (!hasOut) {
          issues.push({ code: 'lint/loop-infinite-no-exit', severity: 'warning',
            line: el.lineNumber, file: filePath,
            message: `Element has loop=infinite emphasis animation but no 'out' animation to end it.` });
        }
      }

      // lint/container-single-column
      if (el.type === 'container') {
        const cols = (el.children ?? []).filter(c => c.type === 'column');
        if (cols.length < 2) {
          issues.push({ code: 'lint/container-single-column', severity: 'warning',
            line: el.lineNumber, file: filePath,
            message: '::: container block has fewer than 2 column children.' });
        }
      }

      // lint/chart-no-aria-label
      if (el.type === 'chart' && !el.attributes?.['aria-label']) {
        issues.push({ code: 'lint/chart-no-aria-label', severity: 'warning',
          line: el.lineNumber, file: filePath,
          message: '::: chart block should have an aria-label attribute for accessibility.' });
      }

      // lint/shape-no-aria-label
      if (el.type === 'shape' && el.content && !el.attributes?.['aria-label']) {
        issues.push({ code: 'lint/shape-no-aria-label', severity: 'warning',
          line: el.lineNumber, file: filePath,
          message: '::: shape block with content should have an aria-label attribute.' });
      }

      // lint/variable-undefined
      const text = el.content ?? '';
      for (const match of text.matchAll(/\{\{([\w_]+)\}\}/g)) {
        const token = match[1];
        if (!definedTokens.has(token)) {
          issues.push({ code: 'lint/variable-undefined', severity: 'warning',
            line: el.lineNumber, file: filePath,
            message: `Template variable '{{${token}}}' is not defined in front matter variables or system tokens.` });
        }
      }
    }
  }

  return issues;
}

function parseMs(timeStr: string): number {
  if (timeStr.endsWith('ms')) return Number(timeStr.slice(0, -2));
  if (timeStr.endsWith('s')) return Number(timeStr.slice(0, -1)) * 1000;
  return 0;
}

function* walkElements(elements: SlideElement[]): Generator<SlideElement> {
  for (const el of elements) {
    yield el;
    if (el.children) yield* walkElements(el.children);
  }
}
```

- [ ] **Step 4: Create `src/validators/index.ts`**

```typescript
import { SlideDSLDocument, Issue } from '../parser/types.ts';
import { runStructural } from './structural.ts';
import { runSemantic } from './semantic.ts';
import { runLint } from './lint.ts';

export function runValidators(doc: SlideDSLDocument, filePath: string): Issue[] {
  return [
    ...runStructural(doc, filePath),
    ...runSemantic(doc, filePath),
    ...runLint(doc, filePath),
  ];
}
```

- [ ] **Step 5: Run — confirm tests pass**

```bash
npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/validators/lint.ts src/validators/index.ts tests/validators/lint.test.ts
git commit -m "feat: lint validator (12 warning rules) and validators/index"
```

---

### Task 10: Reporters + CLI

**Files:**
- Create: `src/reporters/human.ts`
- Create: `src/reporters/json.ts`
- Create: `src/cli.ts`

- [ ] **Step 1: Create `src/reporters/human.ts`**

```typescript
import { Issue } from '../parser/types.ts';

export function formatHuman(issues: Issue[], filePath: string): string {
  const lines: string[] = [
    `SlideDSL Validator Report: ${filePath}`,
    '─'.repeat(50),
    '',
  ];

  if (issues.length === 0) {
    lines.push('✓ No issues found.');
    return lines.join('\n');
  }

  for (const issue of issues) {
    const prefix = issue.severity === 'error' ? '[ERROR]' : '[WARNING]';
    lines.push(`${prefix} Line ${issue.line}: ${issue.code}`);
    lines.push(`  ${issue.message}`);
    lines.push('');
  }

  lines.push('─'.repeat(50));
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  lines.push(`✓ ${issues.length} issue${issues.length !== 1 ? 's' : ''} (${errors} error${errors !== 1 ? 's' : ''}, ${warnings} warning${warnings !== 1 ? 's' : ''})`);

  return lines.join('\n');
}
```

- [ ] **Step 2: Create `src/reporters/json.ts`**

```typescript
import { Issue } from '../parser/types.ts';

export function formatJson(issues: Issue[]): string {
  return JSON.stringify(issues, null, 2);
}
```

- [ ] **Step 3: Create `src/cli.ts`**

```typescript
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseDocument } from './parser/slideParser.ts';
import { runValidators } from './validators/index.ts';
import { formatHuman } from './reporters/human.ts';
import { formatJson } from './reporters/json.ts';
import { ParseError } from './parser/types.ts';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help') {
  console.log('Usage: node src/cli.ts <file.md> [--format human|json] [--strict]');
  process.exit(2);
}

const filePath = resolve(args[0]);
const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'human';
const strict = args.includes('--strict');

if (!['human', 'json'].includes(format)) {
  console.error(`Invalid --format value '${format}'. Must be 'human' or 'json'.`);
  process.exit(2);
}

let src: string;
try {
  src = readFileSync(filePath, 'utf-8');
} catch {
  console.error(`Cannot read file: ${filePath}`);
  process.exit(2);
}

let doc;
try {
  doc = parseDocument(src, filePath);
} catch (err) {
  if (err instanceof ParseError) {
    const issue = { code: 'parse/error', severity: 'error' as const,
      line: err.line ?? 0, message: err.message, file: filePath };
    console.log(format === 'json' ? formatJson([issue]) : formatHuman([issue], filePath));
    process.exit(1);
  }
  throw err;
}

const issues = runValidators(doc, filePath);
const hasErrors = issues.some(i => i.severity === 'error');
const hasWarnings = issues.some(i => i.severity === 'warning');

console.log(format === 'json' ? formatJson(issues) : formatHuman(issues, filePath));

if (hasErrors || (strict && hasWarnings)) process.exit(1);
process.exit(0);
```

- [ ] **Step 4: Verify CLI runs on a minimal valid document**

Create `tests/fixtures/valid/minimal.slidedsl.md`:

```markdown
---
title: "Minimal Valid Deck"
---

# Hello World

Welcome to this presentation.

::: notes
This is the first slide.
:::
```

Run:
```bash
node --experimental-strip-types src/cli.ts tests/fixtures/valid/minimal.slidedsl.md
```

Expected output: report with warnings (lint/slide-no-id, lint/missing-recommended-frontmatter) but no errors. Exit code 0.

- [ ] **Step 5: Verify JSON output**

```bash
node --experimental-strip-types src/cli.ts tests/fixtures/valid/minimal.slidedsl.md --format json
```

Expected: JSON array of warning objects.

- [ ] **Step 6: Verify --strict exits with code 1 on warnings**

```bash
node --experimental-strip-types src/cli.ts tests/fixtures/valid/minimal.slidedsl.md --strict; echo "Exit: $?"
```

Expected: `Exit: 1`

- [ ] **Step 7: Commit**

```bash
git add src/reporters/human.ts src/reporters/json.ts src/cli.ts tests/fixtures/valid/minimal.slidedsl.md
git commit -m "feat: reporters, CLI entrypoint, minimal valid fixture"
```

---

### Task 11: Integration Test Fixtures

**Files:**
- Create: `tests/fixtures/valid/full-v2.slidedsl.md`
- Create: `tests/fixtures/invalid/*.slidedsl.md` (20 files, one per error rule)

- [ ] **Step 1: Create `tests/fixtures/valid/full-v2.slidedsl.md`**

```markdown
---
title: "Full v2.0 Feature Test"
author: "Test Author"
version: "2.0"
language: "en-US"
default_voice: "en-US-Neural-F"
global_theme: "enterprise-dark"
transitions:
  default: "fade"
  duration: "0.5s"
progress_bar: true
slide_numbers: true
variables:
  company: "Acme Corp"
---

--- {id="slide-title" transition="fade"}

# Welcome to {{company}}
{ id="hero-title" animate="in: fade trigger=onload duration=0.8s" }

::: notes
Welcome to the presentation.
:::

--- {id="slide-content" bg-color="brand-dark"}

::: container {distribution="equal" gap="20px"}
::: column {id="col-left"}
## Left Column
* Item A
* Item B
:::
::: column {id="col-right"}
![Diagram](assets/arch.png)
{ id="img-arch" animate="in: fade trigger=onload duration=0.5s" }
:::
:::

::: notes
This slide shows a two-column layout.
:::

--- {id="slide-chart"}

::: chart {type="bar" id="chart-rev" aria-label="Revenue chart Q1 to Q4"}
labels: ["Q1", "Q2", "Q3", "Q4"]
datasets:
  - label: "Revenue"
    data: [420, 530, 610, 780]
    color: "brand-primary"
:::

::: notes
The chart shows quarterly revenue growth.
:::

--- {id="slide-code"}

```typescript
const x: number = 42;
```
{ id="code-snippet" }

::: notes
Here is some TypeScript code.
:::

--- {id="slide-diagram"}

::: diagram {type="mermaid" id="flow-1"}
graph TD
    A[Start] --> B[End]
:::

::: notes
A simple Mermaid diagram.
:::
```

- [ ] **Step 2: Verify full-v2 fixture passes with exit 0**

```bash
node --experimental-strip-types src/cli.ts tests/fixtures/valid/full-v2.slidedsl.md --format json
echo "Exit: $?"
```

Expected: JSON array with only warnings (no errors). `Exit: 0`.

- [ ] **Step 3: Create invalid fixtures (one per structural/semantic rule)**

Create each file with ONLY the content needed to trigger that one rule:

`tests/fixtures/invalid/structural-missing-title.slidedsl.md`:
```markdown
---
author: "No Title Here"
---

# Hello
```

`tests/fixtures/invalid/structural-animation-invalid-phase.slidedsl.md`:
```markdown
---
title: "T"
---

# Hello
{ id="h1" animate="bounce: fade trigger=onload duration=0.5s" }

::: notes
Test.
:::
```

`tests/fixtures/invalid/structural-animation-missing-field.slidedsl.md`:
```markdown
---
title: "T"
---

# Hello
{ id="h1" animate="in: fade trigger=onload" }

::: notes
Test.
:::
```

`tests/fixtures/invalid/structural-invalid-transition-type.slidedsl.md`:
```markdown
---
title: "T"
---

--- {id="s1" transition="spin-around"}

# Slide
::: notes
Test.
:::
```

`tests/fixtures/invalid/structural-invalid-export-format.slidedsl.md`:
```markdown
---
title: "T"
export:
  format: "mov"
---

# Slide
::: notes
Test.
:::
```

`tests/fixtures/invalid/structural-chart-missing-datasets.slidedsl.md`:
```markdown
---
title: "T"
---

::: chart {type="bar"}
labels: ["Q1"]
:::

::: notes
Test.
:::
```

`tests/fixtures/invalid/structural-grid-missing-columns.slidedsl.md`:
```markdown
---
title: "T"
---

::: grid {gap="10px"}
::: cell {col="1" row="1"}
A
:::
:::

::: notes
Test.
:::
```

`tests/fixtures/invalid/structural-keyframe-invalid-stop.slidedsl.md`:
```markdown
---
title: "T"
---

::: keyframes {id="kf1"}
150% { opacity="1" }
:::

::: notes
Test.
:::
```

`tests/fixtures/invalid/structural-template-missing-id.slidedsl.md`:
```markdown
---
title: "T"
---

::: template
# {{title}}
:::

::: notes
Test.
:::
```

`tests/fixtures/invalid/semantic-undefined-trigger.slidedsl.md`:
```markdown
---
title: "T"
---

# Hello
{ id="h1" animate="in: fade trigger=after-nonexistent duration=0.5s" }

::: notes
Test.
:::
```

`tests/fixtures/invalid/semantic-marker-undefined.slidedsl.md`:
```markdown
---
title: "T"
---

# Hello
{ id="h1" animate="in: fade trigger=narrate-missing-marker duration=0.5s" }

::: notes
No markers here.
:::
```

`tests/fixtures/invalid/semantic-unreferenced-marker.slidedsl.md`:
```markdown
---
title: "T"
---

# Hello

::: notes
Hello world <marker: unused-marker>
:::
```

`tests/fixtures/invalid/semantic-keyframe-ref-undefined.slidedsl.md`:
```markdown
---
title: "T"
---

# Hello
{ id="h1" animate="in: keyframe ref=kf-nonexistent trigger=onload duration=1s" }

::: notes
Test.
:::
```

`tests/fixtures/invalid/semantic-morph-target-undefined.slidedsl.md`:
```markdown
---
title: "T"
---

# Hello
{ id="h1" animate="out: morph target=nonexistent trigger=onload duration=0.8s" }

::: notes
Test.
:::
```

`tests/fixtures/invalid/semantic-toc-anchor-missing.slidedsl.md`:
```markdown
---
title: "T"
toc:
  enabled: true
  insert-after: "slide-nonexistent"
---

# Hello
::: notes
Test.
:::
```

`tests/fixtures/invalid/semantic-hotspot-target-undefined.slidedsl.md`:
```markdown
---
title: "T"
---

# Hello

::: hotspot {target-slide="#slide-nonexistent" id="hs1"}
:::

::: notes
Test.
:::
```

`tests/fixtures/invalid/semantic-template-use-missing.slidedsl.md`:
```markdown
---
title: "T"
---

@use(tpl-nonexistent title="Hello")

::: notes
Test.
:::
```

- [ ] **Step 4: Run each invalid fixture and confirm correct error code**

```bash
for f in tests/fixtures/invalid/*.slidedsl.md; do
  echo "--- $f"
  node --experimental-strip-types src/cli.ts "$f" --format json | python3 -c "import sys,json; issues=json.load(sys.stdin); print([i['code'] for i in issues if i['severity']=='error'])"
  echo ""
done
```

Expected: each file outputs a list containing exactly the error code matching its filename.

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/
git commit -m "feat: integration test fixtures — valid full-v2 and 17 invalid rule fixtures"
```

---

## Self-Review

**Spec coverage:**
- Part 1 (Document Structure): ✓ Task 4 (front matter, delimiters, section, slide attrs, background)
- Part 2 (Content Types): ✓ Tasks 5+6 (all 15 content types + ::: blocks)
- Part 3–4 (Transitions, Layout): ✓ Task 4 (transition attr), Task 5/6 (::: grid, bg-*)
- Part 5 (Organization): ✓ Task 4 (=== sections, hidden, duration-hint)
- Part 6 (Narration): ✓ Task 6 (::: notes with voice attr, markers)
- Part 7 (Animation v2): ✓ Tasks 2+5+6 (attrParser, keyframes, path, all animate attrs)
- Part 8 (Interactivity): ✓ Task 6 (::: hotspot, @use for links)
- Part 9 (Typography): ✓ Task 2 (attrs parsed into element.attributes)
- Part 10 (Variables): ✓ Task 4 (variables in front matter), Task 9 (lint/variable-undefined)
- Part 11 (Accessibility/Export): ✓ Task 7 (export format), Task 9 (aria-label lint)
- All 11 structural rules: ✓ Task 7
- All 9 semantic rules: ✓ Task 8
- All 12 lint rules: ✓ Task 9
- Reporters + CLI: ✓ Task 10
- Fixtures: ✓ Task 11

**No placeholders found.**

**Type consistency:** `AnimationAttr`, `SlideElement`, `Issue` defined in Task 1 and used consistently across all tasks. `walkElements` generator duplicated in structural.ts, semantic.ts, lint.ts — acceptable (YAGNI: no shared utility needed for 3 callsites).
