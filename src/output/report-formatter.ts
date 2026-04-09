import type { DiffResult } from '../diff/dependency-differ';

export type OutputFormat = 'text' | 'json' | 'markdown';

export interface FormattedOutput {
  format: OutputFormat;
  content: string;
  hasBreaking: boolean;
  breakingCount: number;
  totalChanged: number;
}

export function formatAsJson(diffs: DiffResult[]): string {
  const output = {
    summary: {
      total: diffs.length,
      breaking: diffs.filter((d) => d.isBreaking).length,
      added: diffs.filter((d) => d.type === 'added').length,
      removed: diffs.filter((d) => d.type === 'removed').length,
      updated: diffs.filter((d) => d.type === 'updated').length,
    },
    changes: diffs.map((d) => ({
      package: d.name,
      type: d.type,
      from: d.from ?? null,
      to: d.to ?? null,
      breaking: d.isBreaking,
      label: d.label,
    })),
  };
  return JSON.stringify(output, null, 2);
}

export function formatAsMarkdown(diffs: DiffResult[]): string {
  if (diffs.length === 0) return '## StackDiff Report\n\nNo dependency changes detected.\n';

  const breaking = diffs.filter((d) => d.isBreaking);
  const lines: string[] = ['## StackDiff Report', ''];

  lines.push(`**${diffs.length}** change(s) detected, **${breaking.length}** breaking.`, '');
  lines.push('| Package | Type | From | To | Breaking |');
  lines.push('|---------|------|------|----|----------|');

  for (const d of diffs) {
    const flag = d.isBreaking ? '⚠️ Yes' : 'No';
    lines.push(`| \`${d.name}\` | ${d.type} | ${d.from ?? '—'} | ${d.to ?? '—'} | ${flag} |`);
  }

  return lines.join('\n') + '\n';
}

export function buildOutput(diffs: DiffResult[], format: OutputFormat): FormattedOutput {
  const breaking = diffs.filter((d) => d.isBreaking);
  let content: string;

  if (format === 'json') {
    content = formatAsJson(diffs);
  } else if (format === 'markdown') {
    content = formatAsMarkdown(diffs);
  } else {
    // Delegate plain text to existing reporter
    const { formatText } = require('../reporter/conflict-reporter');
    content = formatText(diffs);
  }

  return {
    format,
    content,
    hasBreaking: breaking.length > 0,
    breakingCount: breaking.length,
    totalChanged: diffs.length,
  };
}
