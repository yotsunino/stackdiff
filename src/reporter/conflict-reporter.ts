import { DiffResult } from '../diff/dependency-differ';

export type ReportFormat = 'text' | 'json';

export interface ReportOptions {
  format?: ReportFormat;
  onlyBreaking?: boolean;
}

export function formatReport(
  diffs: DiffResult[],
  options: ReportOptions = {}
): string {
  const { format = 'text', onlyBreaking = false } = options;

  const filtered = onlyBreaking
    ? diffs.filter((d) => d.isMajorChange)
    : diffs;

  if (format === 'json') {
    return JSON.stringify(filtered, null, 2);
  }

  return formatText(filtered);
}

function formatText(diffs: DiffResult[]): string {
  if (diffs.length === 0) {
    return '✅ No dependency conflicts detected.';
  }

  const lines: string[] = [];
  const breaking = diffs.filter((d) => d.isMajorChange);
  const nonBreaking = diffs.filter((d) => !d.isMajorChange);

  if (breaking.length > 0) {
    lines.push(`⚠️  Breaking changes (${breaking.length}):`);
    for (const d of breaking) {
      lines.push(
        `  🔴 ${d.name}: ${d.fromVersion ?? 'NEW'} → ${d.toVersion ?? 'REMOVED'}`
      );
    }
  }

  if (nonBreaking.length > 0) {
    lines.push(`\nℹ️  Non-breaking changes (${nonBreaking.length}):`);
    for (const d of nonBreaking) {
      lines.push(
        `  🟡 ${d.name}: ${d.fromVersion ?? 'NEW'} → ${d.toVersion ?? 'REMOVED'}`
      );
    }
  }

  return lines.join('\n');
}
