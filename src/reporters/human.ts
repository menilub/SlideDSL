import type { Issue } from '../parser/types.ts';

export function formatHuman(issues: Issue[], filePath: string): string {
  const lines: string[] = [
    `SlideDSL Validator Report: ${filePath}`,
    '─'.repeat(50),
    '',
  ];

  if (issues.length === 0) {
    lines.push('✓ No issues found.');
    return lines.join('\n');
  }

  for (const issue of issues) {
    const prefix = issue.severity === 'error' ? '[ERROR]' : '[WARNING]';
    lines.push(`${prefix} Line ${issue.line}: ${issue.code}`);
    lines.push(`  ${issue.message}`);
    lines.push('');
  }

  lines.push('─'.repeat(50));
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  lines.push(`✓ ${issues.length} issue${issues.length !== 1 ? 's' : ''} (${errors} error${errors !== 1 ? 's' : ''}, ${warnings} warning${warnings !== 1 ? 's' : ''})`);

  return lines.join('\n');
}
