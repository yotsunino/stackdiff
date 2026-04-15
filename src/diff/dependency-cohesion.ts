export interface CohesionEntry {
  name: string;
  version: string;
  scope: string;
  sharedWith: string[];
  cohesionScore: number;
}

export interface CohesionReport {
  entries: CohesionEntry[];
  averageScore: number;
  totalPackages: number;
  highCohesionCount: number;
  lowCohesionCount: number;
}

export type DepMap = Map<string, { version: string; scope?: string; dependencies?: Record<string, string> }>;

export function computeCohesionScore(sharedCount: number, totalPackages: number): number {
  if (totalPackages === 0) return 0;
  return Math.round((sharedCount / totalPackages) * 100);
}

export function buildCohesionReport(base: DepMap, head: DepMap): CohesionReport {
  const entries: CohesionEntry[] = [];

  for (const [name, headMeta] of head) {
    const scope = headMeta.scope ?? 'production';
    const deps = headMeta.dependencies ?? {};
    const sharedWith: string[] = [];

    for (const dep of Object.keys(deps)) {
      if (head.has(dep)) {
        sharedWith.push(dep);
      }
    }

    const cohesionScore = computeCohesionScore(sharedWith.length, head.size);
    entries.push({ name, version: headMeta.version, scope, sharedWith, cohesionScore });
  }

  entries.sort((a, b) => b.cohesionScore - a.cohesionScore);

  const totalPackages = entries.length;
  const averageScore =
    totalPackages > 0
      ? Math.round(entries.reduce((sum, e) => sum + e.cohesionScore, 0) / totalPackages)
      : 0;
  const highCohesionCount = entries.filter((e) => e.cohesionScore >= 50).length;
  const lowCohesionCount = entries.filter((e) => e.cohesionScore < 20).length;

  return { entries, averageScore, totalPackages, highCohesionCount, lowCohesionCount };
}

export function formatCohesionReportText(report: CohesionReport): string {
  const lines: string[] = [
    `Dependency Cohesion Report`,
    `Total Packages : ${report.totalPackages}`,
    `Average Score  : ${report.averageScore}%`,
    `High Cohesion  : ${report.highCohesionCount}`,
    `Low Cohesion   : ${report.lowCohesionCount}`,
    '',
  ];

  for (const entry of report.entries) {
    const shared = entry.sharedWith.length > 0 ? entry.sharedWith.join(', ') : 'none';
    lines.push(
      `  ${entry.name}@${entry.version} [${entry.scope}] score=${entry.cohesionScore}% shared=[${shared}]`
    );
  }

  return lines.join('\n');
}
