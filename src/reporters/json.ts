import type { Issue } from '../parser/types.ts';

export function formatJson(issues: Issue[]): string {
  return JSON.stringify(issues);
}
