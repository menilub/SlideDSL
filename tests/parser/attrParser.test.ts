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
