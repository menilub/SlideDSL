import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument } from '../../src/parser/slideParser.ts';

test('parses minimal valid document', () => {
  const src = `---\ntitle: "Hello"\n---\n\n# Slide 1\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.frontMatter.title, 'Hello');
  assert.equal(doc.slides.length, 1);
});

test('parses slide delimiter creates new slide', () => {
  const src = `---\ntitle: "T"\n---\n\n# Slide 1\n\n---\n\n# Slide 2\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides.length, 2);
});

test('slide index increments across sections', () => {
  const src = `---\ntitle: "T"\n---\n\n# S1\n\n=== Section Two\n\n---\n\n# S2\n\n---\n\n# S3\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].index, 0);
  assert.equal(doc.slides[1].index, 1);
  assert.equal(doc.slides[2].index, 2);
});

test('slide background parsed from bg-color attribute', () => {
  const src = `---\ntitle: "T"\n---\n\n--- {bg-color="brand-dark"}\n\n# Slide\n`;
  const doc = parseDocument(src, 'test.md');
  assert.deepEqual(doc.slides[0].background, { type: 'color', value: 'brand-dark' });
});

test('slide background parsed from bg-image attribute', () => {
  const src = `---\ntitle: "T"\n---\n\n--- {bg-image="hero.jpg" bg-size="cover"}\n\n# Slide\n`;
  const doc = parseDocument(src, 'test.md');
  assert.deepEqual(doc.slides[0].background, { type: 'image', value: 'hero.jpg', size: 'cover', position: undefined, opacity: undefined });
});

test('slide id and transition parsed', () => {
  const src = `---\ntitle: "T"\n---\n\n--- {id="intro" transition="fade"}\n\n# Hello\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].id, 'intro');
  assert.equal(doc.slides[0].transition, 'fade');
});

test('section delimiter creates section with title', () => {
  const src = `---\ntitle: "T"\n---\n\n=== My Section\n\n# Slide\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.sections.length, 2);
  assert.equal(doc.sections[1].title, 'My Section');
});

test('front matter variables parsed', () => {
  const src = `---\ntitle: "T"\nvariables:\n  company: "Acme"\n---\n\n# Slide\n`;
  const doc = parseDocument(src, 'test.md');
  assert.deepEqual(doc.frontMatter.variables, { company: 'Acme' });
});

test('slide hidden attribute parsed', () => {
  const src = `---\ntitle: "T"\n---\n\n--- {hidden="true"}\n\n# Hidden\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].hidden, true);
});

test('parses heading levels', () => {
  const src = `---\ntitle: "T"\n---\n\n# H1\n## H2\n### H3\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].elements[0].type, 'heading');
  assert.equal(doc.slides[0].elements[0].level, 1);
  assert.equal(doc.slides[0].elements[1].level, 2);
  assert.equal(doc.slides[0].elements[2].level, 3);
});

test('parses unordered list items', () => {
  const src = `---\ntitle: "T"\n---\n\n* Item A\n- Item B\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].elements[0].type, 'list');
  assert.equal(doc.slides[0].elements[0].content, 'Item A');
  assert.equal(doc.slides[0].elements[1].content, 'Item B');
});

test('parses ordered list items', () => {
  const src = `---\ntitle: "T"\n---\n\n1. First\n2. Second\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].elements[0].type, 'list');
  assert.equal(doc.slides[0].elements[0].content, 'First');
});

test('parses image element', () => {
  const src = `---\ntitle: "T"\n---\n\n![Alt text](assets/img.png)\n`;
  const doc = parseDocument(src, 'test.md');
  const img = doc.slides[0].elements[0];
  assert.equal(img.type, 'image');
  assert.equal(img.content, 'Alt text');
  assert.equal(img.attributes?.['src'], 'assets/img.png');
});

test('parses blockquote element', () => {
  const src = `---\ntitle: "T"\n---\n\n> A quote here\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].elements[0].type, 'blockquote');
  assert.equal(doc.slides[0].elements[0].content, 'A quote here');
});

test('parses code fence element', () => {
  const src = '---\ntitle: "T"\n---\n\n```typescript\nconst x = 1;\n```\n';
  const doc = parseDocument(src, 'test.md');
  const el = doc.slides[0].elements[0];
  assert.equal(el.type, 'code');
  assert.equal(el.content, 'const x = 1;');
  assert.equal(el.attributes?.['lang'], 'typescript');
});

test('parses math block element', () => {
  const src = `---\ntitle: "T"\n---\n\n$$\nE = mc^2\n$$\n`;
  const doc = parseDocument(src, 'test.md');
  const el = doc.slides[0].elements[0];
  assert.equal(el.type, 'math');
  assert.equal(el.content, 'E = mc^2');
});

test('parses table element', () => {
  const src = `---\ntitle: "T"\n---\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n# After\n`;
  const doc = parseDocument(src, 'test.md');
  const el = doc.slides[0].elements[0];
  assert.equal(el.type, 'table');
  assert.ok(el.content?.includes('| A | B |'));
});

test('parses @icon directive', () => {
  const src = `---\ntitle: "T"\n---\n\n@icon(check-circle)\n`;
  const doc = parseDocument(src, 'test.md');
  const el = doc.slides[0].elements[0];
  assert.equal(el.type, 'icon');
  assert.equal(el.attributes?.['icon'], 'check-circle');
});

test('applies attribute block to preceding element', () => {
  const src = `---\ntitle: "T"\n---\n\n# Hello\n{ id="hero" animate="in: fade trigger=onload duration=0.5s" }\n`;
  const doc = parseDocument(src, 'test.md');
  const h = doc.slides[0].elements[0];
  assert.equal(h.id, 'hero');
  assert.ok(h.animate);
  assert.equal(h.animate?.phase, 'in');
  assert.equal(h.animate?.effect, 'fade');
});

test('paragraph fallback for plain text', () => {
  const src = `---\ntitle: "T"\n---\n\nJust some text.\n`;
  const doc = parseDocument(src, 'test.md');
  assert.equal(doc.slides[0].elements[0].type, 'paragraph');
  assert.equal(doc.slides[0].elements[0].content, 'Just some text.');
});

test('parses ::: notes block attaches to slide', () => {
  const src = `---\ntitle: "T"\n---\n\n# Slide\n\n::: notes\nHello notes.\n:::\n`;
  const doc = parseDocument(src, 'test.md');
  assert.ok(doc.slides[0].notes);
  assert.equal(doc.slides[0].notes?.raw, 'Hello notes.');
});

test('parses ::: notes block extracts markers', () => {
  const src = `---\ntitle: "T"\n---\n\n# Slide\n\n::: notes\nHello <marker: step1> world\n:::\n`;
  const doc = parseDocument(src, 'test.md');
  assert.deepEqual(doc.slides[0].notes?.markers, ['step1']);
});

test('parses ::: chart block with datasets', () => {
  const src = `---\ntitle: "T"\n---\n\n::: chart {type="bar" id="c1"}\nlabels: ["Q1", "Q2"]\ndatasets:\n  - label: "Rev"\n    data: [100, 200]\n:::\n`;
  const doc = parseDocument(src, 'test.md');
  const chart = doc.slides[0].elements[0];
  assert.equal(chart.type, 'chart');
  assert.equal(chart.id, 'c1');
  assert.ok(chart.chartData);
  assert.equal(chart.chartData?.type, 'bar');
  assert.equal(chart.chartData?.datasets.length, 1);
  assert.equal(chart.chartData?.datasets[0].label, 'Rev');
  assert.deepEqual(chart.chartData?.datasets[0].data, [100, 200]);
});

test('parses ::: keyframes block with stops', () => {
  const src = `---\ntitle: "T"\n---\n\n::: keyframes {id="kf-fly"}\n0% { opacity="0" transform="translateY(20px)" }\n100% { opacity="1" transform="translateY(0)" }\n:::\n`;
  const doc = parseDocument(src, 'test.md');
  const kf = doc.slides[0].elements[0];
  assert.equal(kf.type, 'keyframes');
  assert.equal(kf.id, 'kf-fly');
  assert.equal(kf.keyframeStops?.length, 2);
  assert.equal(kf.keyframeStops?.[0].percent, 0);
  assert.equal(kf.keyframeStops?.[0].props['opacity'], '0');
});

test('parses ::: shape block', () => {
  const src = `---\ntitle: "T"\n---\n\n::: shape {type="rectangle" id="s1"}\n:::\n`;
  const doc = parseDocument(src, 'test.md');
  const shape = doc.slides[0].elements[0];
  assert.equal(shape.type, 'shape');
  assert.equal(shape.id, 's1');
});

test('parses nested ::: grid with ::: cell children', () => {
  const src = `---\ntitle: "T"\n---\n\n::: grid {columns="3"}\n::: cell {col="1" row="1"}\nA\n:::\n:::\n`;
  const doc = parseDocument(src, 'test.md');
  const grid = doc.slides[0].elements[0];
  assert.equal(grid.type, 'grid');
  assert.equal(grid.attributes?.['columns'], '3');
  assert.equal(grid.children?.length, 1);
  assert.equal(grid.children?.[0].type, 'cell');
});

test('parses ::: container with column children', () => {
  const src = `---\ntitle: "T"\n---\n\n::: container\n::: column\n# Left\n:::\n::: column\n# Right\n:::\n:::\n`;
  const doc = parseDocument(src, 'test.md');
  const container = doc.slides[0].elements[0];
  assert.equal(container.type, 'container');
  assert.equal(container.children?.length, 2);
  assert.equal(container.children?.[0].type, 'column');
});
