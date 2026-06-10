import type { SlideDSLDocument, Issue } from '../parser/types.ts';
import { runStructural } from './structural.ts';
import { runSemantic } from './semantic.ts';
import { runLint } from './lint.ts';

export function runValidators(doc: SlideDSLDocument, filePath: string): Issue[] {
  return [
    ...runStructural(doc, filePath),
    ...runSemantic(doc, filePath),
    ...runLint(doc, filePath),
  ];
}
