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
