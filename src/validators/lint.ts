import type { SlideDSLDocument, Issue, SlideElement } from '../parser/types.ts';

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

    // lint/multiple-h1
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
