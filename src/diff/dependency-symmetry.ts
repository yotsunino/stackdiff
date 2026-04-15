/**
 * Dependency symmetry: detects packages that appear in one lock file
 * but not the other, and measures how symmetric the two dependency trees are.
 */

export interface SymmetryEntry {
  name: string;
  version: string;
  side: 'base' | 'head';
}

export interface SymmetryReport {
  onlyInBase: SymmetryEntry[];
  onlyInHead: SymmetryEntry[];
  commonCount: number;
  symmetryScore: number; // 0-100, 100 = perfectly symmetric
}

export type DepMap = Map<string, { version: string; [key: string]: unknown }>;

export function buildSymmetryReport(base: DepMap, head: DepMap): SymmetryReport {
  const onlyInBase: SymmetryEntry[] = [];
  const onlyInHead: SymmetryEntry[] = [];
  let commonCount = 0;

  for (const [name, info] of base) {
    if (!head.has(name)) {
      onlyInBase.push({ name, version: info.version, side: 'base' });
    } else {
      commonCount++;
    }
  }

  for (const [name, info] of head) {
    if (!base.has(name)) {
      onlyInHead.push({ name, version: info.version, side: 'head' });
    }
  }

  const total = commonCount + onlyInBase.length + onlyInHead.length;
  const symmetryScore = total === 0 ? 100 : Math.round((commonCount / total) * 100);

  return { onlyInBase, onlyInHead, commonCount, symmetryScore };
}

export function formatSymmetryReportText(report: SymmetryReport): string {
  const lines: string[] = [];
  lines.push(`Symmetry Score: ${report.symmetryScore}/100 (${report.commonCount} shared packages)`);

  if (report.onlyInBase.length > 0) {
    lines.push(`\nOnly in base (${report.onlyInBase.length}):`);
    for (const e of report.onlyInBase) {
      lines.push(`  - ${e.name}@${e.version}`);
    }
  }

  if (report.onlyInHead.length > 0) {
    lines.push(`\nOnly in head (${report.onlyInHead.length}):`);
    for (const e of report.onlyInHead) {
      lines.push(`  + ${e.name}@${e.version}`);
    }
  }

  if (report.onlyInBase.length === 0 && report.onlyInHead.length === 0) {
    lines.push('Both dependency trees are perfectly symmetric.');
  }

  return lines.join('\n');
}
