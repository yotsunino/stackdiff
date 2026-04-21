/**
 * dependency-exposure.ts
 * Detects packages that are exposed as direct dependencies but could be
 * satisfied transitively, increasing unnecessary surface area.
 */

export interface ExposureEntry {
  name: string;
  version: string;
  resolvedBy: string[];
  isRedundantDirect: boolean;
}

export interface ExposureReport {
  entries: ExposureEntry[];
  redundantCount: number;
  totalDirect: number;
  exposureScore: number;
}

export type DepMap = Map<string, { version: string; dependencies?: Record<string, string> }>;

/**
 * Finds all packages that are transitively provided by at least one direct dependency.
 */
export function findTransitiveProviders(
  name: string,
  direct: DepMap,
  all: DepMap,
  visited = new Set<string>()
): string[] {
  const providers: string[] = [];
  for (const [depName, depMeta] of direct) {
    if (depName === name) continue;
    if (visited.has(depName)) continue;
    visited.add(depName);
    const sub = depMeta.dependencies ?? {};
    if (name in sub) {
      providers.push(depName);
    } else {
      const subMap: DepMap = new Map(
        Object.entries(sub).map(([k]) => [k, all.get(k) ?? { version: '0.0.0' }])
      );
      const nested = findTransitiveProviders(name, subMap, all, visited);
      if (nested.length > 0) providers.push(depName);
    }
  }
  return providers;
}

export function buildExposureReport(direct: DepMap, all: DepMap): ExposureReport {
  const entries: ExposureEntry[] = [];

  for (const [name, meta] of direct) {
    const providers = findTransitiveProviders(name, direct, all, new Set([name]));
    entries.push({
      name,
      version: meta.version,
      resolvedBy: providers,
      isRedundantDirect: providers.length > 0,
    });
  }

  const redundantCount = entries.filter((e) => e.isRedundantDirect).length;
  const totalDirect = entries.length;
  const exposureScore = totalDirect === 0 ? 0 : Math.round((redundantCount / totalDirect) * 100);

  return { entries, redundantCount, totalDirect, exposureScore };
}

export function formatExposureReportText(report: ExposureReport): string {
  const lines: string[] = [];
  lines.push(`Dependency Exposure Report`);
  lines.push(`Direct: ${report.totalDirect}  Redundant: ${report.redundantCount}  Score: ${report.exposureScore}%`);
  lines.push('');
  for (const entry of report.entries) {
    if (entry.isRedundantDirect) {
      lines.push(`  [REDUNDANT] ${entry.name}@${entry.version} — already provided by: ${entry.resolvedBy.join(', ')}`);
    } else {
      lines.push(`  [OK]        ${entry.name}@${entry.version}`);
    }
  }
  return lines.join('\n');
}
