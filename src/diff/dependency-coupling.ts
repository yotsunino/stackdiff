/**
 * Measures coupling between dependencies — how many packages share
 * common sub-dependencies, indicating tight inter-package relationships.
 */

export interface DepMap {
  [name: string]: { version: string; dependencies?: Record<string, string> };
}

export interface CouplingEntry {
  packageA: string;
  packageB: string;
  sharedDeps: string[];
  couplingScore: number;
}

export interface CouplingReport {
  pairs: CouplingEntry[];
  highCouplingCount: number;
  averageScore: number;
}

export function computeCoupling(
  base: DepMap,
  head: DepMap
): CouplingEntry[] {
  const names = Array.from(
    new Set([...Object.keys(base), ...Object.keys(head)])
  );

  const getDeps = (map: DepMap, name: string): Set<string> => {
    const entry = map[name];
    if (!entry?.dependencies) return new Set();
    return new Set(Object.keys(entry.dependencies));
  };

  const pairs: CouplingEntry[] = [];

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i];
      const b = names[j];

      const depsA = getDeps(head, a);
      const depsB = getDeps(head, b);

      if (depsA.size === 0 && depsB.size === 0) continue;

      const shared = [...depsA].filter((d) => depsB.has(d));
      if (shared.length === 0) continue;

      const union = new Set([...depsA, ...depsB]);
      const score = parseFloat(
        (shared.length / union.size).toFixed(3)
      );

      pairs.push({ packageA: a, packageB: b, sharedDeps: shared, couplingScore: score });
    }
  }

  return pairs.sort((a, b) => b.couplingScore - a.couplingScore);
}

export function buildCouplingReport(pairs: CouplingEntry[]): CouplingReport {
  const highCouplingCount = pairs.filter((p) => p.couplingScore >= 0.5).length;
  const averageScore =
    pairs.length === 0
      ? 0
      : parseFloat(
          (pairs.reduce((s, p) => s + p.couplingScore, 0) / pairs.length).toFixed(3)
        );
  return { pairs, highCouplingCount, averageScore };
}

export function formatCouplingReportText(report: CouplingReport): string {
  if (report.pairs.length === 0) return 'No coupling detected between dependencies.';

  const lines: string[] = [
    `Dependency Coupling Report`,
    `Average coupling score: ${report.averageScore}`,
    `Highly coupled pairs (>=0.5): ${report.highCouplingCount}`,
    '',
  ];

  for (const p of report.pairs.slice(0, 10)) {
    lines.push(
      `  ${p.packageA} <-> ${p.packageB}  score=${p.couplingScore}  shared=[${p.sharedDeps.join(', ')}]`
    );
  }

  return lines.join('\n');
}
