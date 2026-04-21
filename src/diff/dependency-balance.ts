import { DepMap } from './index';

export interface BalanceEntry {
  name: string;
  directCount: number;
  transitiveCount: number;
  ratio: number;
  classification: 'lean' | 'balanced' | 'heavy';
}

export interface BalanceReport {
  entries: BalanceEntry[];
  averageRatio: number;
  heavyCount: number;
  leanCount: number;
  balancedCount: number;
}

export function classifyBalance(ratio: number): 'lean' | 'balanced' | 'heavy' {
  if (ratio < 2) return 'lean';
  if (ratio <= 5) return 'balanced';
  return 'heavy';
}

export function buildBalanceReport(
  direct: DepMap,
  all: DepMap
): BalanceReport {
  const entries: BalanceEntry[] = [];

  for (const [name] of direct) {
    const directCount = 1;
    const transitiveCount = Array.from(all.keys()).filter(
      k => k !== name && k.startsWith(name.split('/')[0])
    ).length;
    const ratio = transitiveCount === 0 ? 1 : transitiveCount / directCount;
    entries.push({
      name,
      directCount,
      transitiveCount,
      ratio,
      classification: classifyBalance(ratio),
    });
  }

  const totalRatio = entries.reduce((s, e) => s + e.ratio, 0);
  const averageRatio = entries.length > 0 ? totalRatio / entries.length : 0;

  return {
    entries,
    averageRatio: Math.round(averageRatio * 100) / 100,
    heavyCount: entries.filter(e => e.classification === 'heavy').length,
    leanCount: entries.filter(e => e.classification === 'lean').length,
    balancedCount: entries.filter(e => e.classification === 'balanced').length,
  };
}

export function formatBalanceReportText(report: BalanceReport): string {
  if (report.entries.length === 0) return 'No dependencies to analyse.';

  const lines: string[] = [
    `Dependency Balance Report`,
    `Average transitive ratio: ${report.averageRatio}`,
    `Lean: ${report.leanCount}  Balanced: ${report.balancedCount}  Heavy: ${report.heavyCount}`,
    '',
  ];

  for (const e of report.entries) {
    lines.push(
      `  ${e.classification.toUpperCase().padEnd(8)} ${e.name} (transitive: ${e.transitiveCount}, ratio: ${e.ratio.toFixed(2)})`
    );
  }

  return lines.join('\n');
}
