import { DepMap } from './index';

export interface OverlapEntry {
  name: string;
  versionA: string;
  versionB: string;
  shared: boolean;
}

export interface OverlapReport {
  onlyInA: string[];
  onlyInB: string[];
  shared: OverlapEntry[];
  overlapScore: number; // 0-100
}

export function computeOverlap(a: DepMap, b: DepMap): OverlapReport {
  const keysA = new Set(Object.keys(a));
  const keysB = new Set(Object.keys(b));

  const onlyInA = [...keysA].filter((k) => !keysB.has(k));
  const onlyInB = [...keysB].filter((k) => !keysA.has(k));

  const shared: OverlapEntry[] = [];
  for (const name of keysA) {
    if (keysB.has(name)) {
      shared.push({
        name,
        versionA: a[name].version,
        versionB: b[name].version,
        shared: a[name].version === b[name].version,
      });
    }
  }

  const total = keysA.size + onlyInB.length;
  const overlapScore = total === 0 ? 100 : Math.round((shared.length / total) * 100);

  return { onlyInA, onlyInB, shared, overlapScore };
}

export function formatOverlapReportText(report: OverlapReport): string {
  const lines: string[] = [];
  lines.push(`Overlap Score: ${report.overlapScore}%`);
  lines.push(`Shared packages: ${report.shared.length}`);

  const versionMismatches = report.shared.filter((e) => !e.shared);
  if (versionMismatches.length > 0) {
    lines.push(`\nVersion mismatches (${versionMismatches.length}):`);
    for (const e of versionMismatches) {
      lines.push(`  ${e.name}: ${e.versionA} → ${e.versionB}`);
    }
  }

  if (report.onlyInA.length > 0) {
    lines.push(`\nOnly in A (${report.onlyInA.length}): ${report.onlyInA.join(', ')}`);
  }
  if (report.onlyInB.length > 0) {
    lines.push(`\nOnly in B (${report.onlyInB.length}): ${report.onlyInB.join(', ')}`);
  }

  return lines.join('\n');
}
