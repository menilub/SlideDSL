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
