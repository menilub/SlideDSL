import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseDocument } from './parser/slideParser.ts';
import { runValidators } from './validators/index.ts';
import { formatHuman } from './reporters/human.ts';
import { formatJson } from './reporters/json.ts';
import { ParseError } from './parser/types.ts';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help') {
  console.log('Usage: node src/cli.ts <file.md> [--format human|json] [--strict]');
  process.exit(2);
}

const filePath = resolve(args[0]);
const formatIdx = args.indexOf('--format');
const format = formatIdx !== -1 ? args[formatIdx + 1] : 'human';
const strict = args.includes('--strict');

if (!['human', 'json'].includes(format)) {
  console.error(`Invalid --format value '${format}'. Must be 'human' or 'json'.`);
  process.exit(2);
}

let src: string;
try {
  src = readFileSync(filePath, 'utf-8');
} catch {
  console.error(`Cannot read file: ${filePath}`);
  process.exit(2);
}

let doc;
try {
  doc = parseDocument(src, filePath);
} catch (err) {
  if (err instanceof ParseError) {
    const issue = { code: 'parse/error', severity: 'error' as const,
      line: err.line ?? 0, message: err.message, file: filePath };
    console.log(format === 'json' ? formatJson([issue]) : formatHuman([issue], filePath));
    process.exit(1);
  }
  throw err;
}

const issues = runValidators(doc, filePath);
const hasErrors = issues.some(i => i.severity === 'error');
const hasWarnings = issues.some(i => i.severity === 'warning');

console.log(format === 'json' ? formatJson(issues) : formatHuman(issues, filePath));

if (hasErrors || (strict && hasWarnings)) process.exit(1);
process.exit(0);
