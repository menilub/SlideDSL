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
