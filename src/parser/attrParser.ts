import type { AnimationAttr } from './types.ts';
import { ParseError } from './types.ts';

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
