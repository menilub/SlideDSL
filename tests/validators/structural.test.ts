import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runStructural } from '../../src/validators/structural.ts';
import { buildDoc, buildSlide, buildElement, buildFrontMatter } from '../helpers.ts';

test('structural/missing-title: fires when title is empty', () => {
  const doc = buildDoc({ frontMatter: buildFrontMatter({ title: '' }) });
  const issues = runStructural(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'structural/missing-title'));
});

test('structural/missing-title: no issue when title present', () => {
  const doc = buildDoc({ frontMatter: buildFrontMatter({ title: 'My Deck' }) });
  const issues = runStructural(doc, 'test.md');
  assert.ok(!issues.some(i => i.code === 'structural/missing-title'));
});

test('structural/animation-invalid-phase: fires for unknown phase', () => {
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

test('structural/invalid-transition-type: fires for unknown transition', () => {
  const slide = buildSlide({ transition: 'spin-around' });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runStructural(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'structural/invalid-transition-type'));
});

test('structural/invalid-export-format: fires for unknown format', () => {
  const doc = buildDoc({ frontMatter: buildFrontMatter({ export: { format: 'mov' as any } }) });
  const issues = runStructural(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'structural/invalid-export-format'));
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
  const el = buildElement({ type: 'template', id: undefined, attributes: {} });
  const slide = buildSlide({ elements: [el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runStructural(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'structural/template-missing-id'));
});

test('structural/keyframe-invalid-stop: fires for stop > 100', () => {
  const el = buildElement({
    type: 'keyframes', id: 'kf1',
    keyframeStops: [{ percent: 150, props: {} }]
  });
  const slide = buildSlide({ elements: [el] });
  const doc = buildDoc({ slides: [slide], sections: [{ slides: [slide], lineNumber: 1 }] });
  const issues = runStructural(doc, 'test.md');
  assert.ok(issues.some(i => i.code === 'structural/keyframe-invalid-stop'));
});
