/**
 * Detects packages that have no shared dependencies with the rest of the tree.
 * An "isolated" package is one whose transitive deps overlap with no other package's deps.
 */

export interface IsolationEntry {
  name: string;
  version: string;
  transitiveDeps: string[];
  isolationScore: number; // 0-100, higher = more isolated
}

export interface IsolationReport {
  entries: IsolationEntry[];
  totalPackages: number;
  isolatedCount: number;
}

export type DepMap = Map<string, { version: string; deps?: string[] }>;

export function computeIsolationScore(
  name: string,
  transitiveDeps: Set<string>,
  allDeps: Map<string, Set<string>>
): number {
  if (transitiveDeps.size === 0) return 100;

  let sharedCount = 0;
  for (const [pkg, deps] of allDeps) {
    if (pkg === name) continue;
    for (const dep of transitiveDeps) {
      if (deps.has(dep)) {
        sharedCount++;
        break;
      }
    }
  }

  const totalOthers = allDeps.size - 1;
  if (totalOthers <= 0) return 100;
  const overlapRatio = sharedCount / totalOthers;
  return Math.round((1 - overlapRatio) * 100);
}

export function buildIsolationReport(depMap: DepMap): IsolationReport {
  // Build transitive dep sets per package
  const transitiveMap = new Map<string, Set<string>>();
  for (const [name, info] of depMap) {
    const deps = new Set<string>(info.deps ?? []);
    transitiveMap.set(name, deps);
  }

  const entries: IsolationEntry[] = [];
  for (const [name, info] of depMap) {
    const transitiveDeps = transitiveMap.get(name) ?? new Set();
    const isolationScore = computeIsolationScore(name, transitiveDeps, transitiveMap);
    entries.push({
      name,
      version: info.version,
      transitiveDeps: Array.from(transitiveDeps),
      isolationScore,
    });
  }

  entries.sort((a, b) => b.isolationScore - a.isolationScore);

  return {
    entries,
    totalPackages: entries.length,
    isolatedCount: entries.filter((e) => e.isolationScore === 100).length,
  };
}

export function formatIsolationReportText(report: IsolationReport): string {
  const lines: string[] = [
    `Dependency Isolation Report`,
    `Total packages: ${report.totalPackages}  Fully isolated: ${report.isolatedCount}`,
    ``,
  ];

  for (const entry of report.entries) {
    const bar = "█".repeat(Math.round(entry.isolationScore / 10));
    lines.push(
      `  ${entry.name}@${entry.version}  score=${entry.isolationScore}/100  ${bar}`
    );
  }

  return lines.join("\n");
}
