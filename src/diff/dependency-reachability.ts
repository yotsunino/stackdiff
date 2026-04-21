import { DepMap } from './index';

export interface ReachabilityEntry {
  name: string;
  version: string;
  reachableCount: number;
  reachablePackages: string[];
  score: number;
}

export interface ReachabilityReport {
  entries: ReachabilityEntry[];
  totalPackages: number;
  averageReachability: number;
}

function collectReachable(
  name: string,
  depMap: DepMap,
  visited: Set<string>
): void {
  if (visited.has(name)) return;
  visited.add(name);
  const entry = depMap.get(name);
  if (!entry?.deps) return;
  for (const dep of Object.keys(entry.deps)) {
    collectReachable(dep, depMap, visited);
  }
}

export function computeReachabilityScore(reachable: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((reachable / total) * 100);
}

export function buildReachabilityReport(depMap: DepMap): ReachabilityReport {
  const total = depMap.size;
  const entries: ReachabilityEntry[] = [];

  for (const [name, meta] of depMap.entries()) {
    const visited = new Set<string>();
    collectReachable(name, depMap, visited);
    visited.delete(name);
    const reachablePackages = Array.from(visited).sort();
    const reachableCount = reachablePackages.length;
    const score = computeReachabilityScore(reachableCount, total);
    entries.push({ name, version: meta.version, reachableCount, reachablePackages, score });
  }

  entries.sort((a, b) => b.reachableCount - a.reachableCount);

  const averageReachability =
    total === 0
      ? 0
      : Math.round(entries.reduce((sum, e) => sum + e.reachableCount, 0) / total);

  return { entries, totalPackages: total, averageReachability };
}

export function formatReachabilityReportText(report: ReachabilityReport): string {
  if (report.entries.length === 0) return 'No packages found.';
  const lines: string[] = [
    `Dependency Reachability Report`,
    `Total packages: ${report.totalPackages}`,
    `Average reachable deps per package: ${report.averageReachability}`,
    '',
  ];
  for (const entry of report.entries) {
    lines.push(
      `  ${entry.name}@${entry.version} — reaches ${entry.reachableCount} packages (score: ${entry.score}%)`
    );
  }
  return lines.join('\n');
}
