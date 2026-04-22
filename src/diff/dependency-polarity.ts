import { DepMap } from '../parser';

export type PolarityType = 'additive' | 'reductive' | 'neutral' | 'mixed';

export interface PolarityEntry {
  name: string;
  added: number;
  removed: number;
  net: number;
  polarity: PolarityType;
}

export interface PolarityReport {
  entries: PolarityEntry[];
  overallPolarity: PolarityType;
  totalAdded: number;
  totalRemoved: number;
  netChange: number;
}

export function classifyPolarity(added: number, removed: number): PolarityType {
  if (added > 0 && removed === 0) return 'additive';
  if (removed > 0 && added === 0) return 'reductive';
  if (added === 0 && removed === 0) return 'neutral';
  return 'mixed';
}

export function buildPolarityReport(
  base: DepMap,
  head: DepMap
): PolarityReport {
  const allNames = new Set([...base.keys(), ...head.keys()]);
  const entries: PolarityEntry[] = [];

  for (const name of allNames) {
    const inBase = base.has(name) ? 1 : 0;
    const inHead = head.has(name) ? 1 : 0;
    const added = inHead - (inBase > 0 && inHead > 0 ? 0 : inBase > 0 ? 1 : 0);
    const removed = inBase - (inBase > 0 && inHead > 0 ? 0 : inHead > 0 ? 1 : 0);

    const a = !base.has(name) && head.has(name) ? 1 : 0;
    const r = base.has(name) && !head.has(name) ? 1 : 0;
    const net = a - r;
    const polarity = classifyPolarity(a, r);

    if (a > 0 || r > 0) {
      entries.push({ name, added: a, removed: r, net, polarity });
    }
  }

  const totalAdded = entries.reduce((s, e) => s + e.added, 0);
  const totalRemoved = entries.reduce((s, e) => s + e.removed, 0);
  const netChange = totalAdded - totalRemoved;
  const overallPolarity = classifyPolarity(totalAdded, totalRemoved);

  return { entries, overallPolarity, totalAdded, totalRemoved, netChange };
}

export function formatPolarityReportText(report: PolarityReport): string {
  const lines: string[] = [
    `Dependency Polarity Report`,
    `Overall: ${report.overallPolarity} (+${report.totalAdded} / -${report.totalRemoved}, net ${report.netChange})`,
    '',
  ];

  if (report.entries.length === 0) {
    lines.push('  No changes detected.');
    return lines.join('\n');
  }

  for (const e of report.entries) {
    const sign = e.net > 0 ? '+' : '';
    lines.push(`  [${e.polarity.padEnd(9)}] ${e.name} (net ${sign}${e.net})`);
  }

  return lines.join('\n');
}
