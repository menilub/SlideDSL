import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSemantic } from '../../src/validators/semantic.ts';
import { buildDoc, buildSlide, buildElement, buildFrontMatter, buildNotes } from '../helpers.ts';

test('semantic/undefined-trigger: fires for after-nonexistent', () => {
  const el = buildElement({ id: 'h1', animate: { phase: 'in', effect: 'fade', trigger: 'after-nonexistent', duration: '0.5s' } });
  const slide = buildSlide({ elements: [el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runSemantic(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'semantic/undefined-trigger'));
});

test('semantic/undefined-trigger: no issue when referenced id exists', () => {
  const target = buildElement({ id: 'h1', lineNumber: 5 });
  const el = buildElement({ id: 'p1', animate: { phase: 'in', effect: 'fade', trigger: 'after-h1', duration: '0.5s' }, lineNumber: 6 });
  const slide = buildSlide({ elements: [target, el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runSemantic(doc, 'test.md');
  assert.ok(!issues.some(i => i.code === 'semantic/undefined-trigger'));
});

test('semantic/marker-undefined: fires when narrate trigger has no matching marker', () => {
  const el = buildElement({ animate: { phase: 'in', effect: 'fade', trigger: 'narrate-step1', duration: '0.5s' } });
  const slide = buildSlide({ elements: [el], notes: buildNotes({ markers: [] }) });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runSemantic(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'semantic/marker-undefined'));
});

test('semantic/unreferenced-marker: fires when notes marker has no trigger', () => {
  const slide = buildSlide({ notes: buildNotes({ markers: ['unused'] }) });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runSemantic(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'semantic/unreferenced-marker'));
});

test('semantic/keyframe-ref-undefined: fires for missing keyframes block', () => {
  const el = buildElement({ animate: { phase: 'in', effect: 'keyframe', trigger: 'onload', duration: '1s', ref: 'kf-missing' } });
  const slide = buildSlide({ elements: [el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runSemantic(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'semantic/keyframe-ref-undefined'));
});

test('semantic/path-ref-undefined: fires for missing path block', () => {
  const el = buildElement({ animate: { phase: 'move', effect: 'path', trigger: 'onload', duration: '2s', ref: 'path-missing' } });
  const slide = buildSlide({ elements: [el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runSemantic(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'semantic/path-ref-undefined'));
});

test('semantic/toc-anchor-missing: fires when toc.insert-after references nonexistent slide', () => {
  const slide = buildSlide({ id: 'slide-a' });
  const doc = buildDoc({
    slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }],
    frontMatter: buildFrontMatter({ toc: { enabled: true, 'insert-after': 'slide-nonexistent' } }),
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
