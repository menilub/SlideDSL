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
