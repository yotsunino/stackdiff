/**
 * Measures how concentrated the dependency tree is — i.e., whether a small
 * number of packages account for the majority of transitive dependencies.
 */

export interface ConcentrationEntry {
  name: string;
  version: string;
  transitiveCount: number;
  sharePercent: number;
}

export interface ConcentrationReport {
  totalTransitive: number;
  entries: ConcentrationEntry[];
  topHeavy: boolean;
  topNSharePercent: number;
}

export function buildConcentrationReport(
  depMap: Map<string, { version: string; dependencies?: Record<string, string> }>,
  topN = 5
): ConcentrationReport {
  const totalTransitive = depMap.size;

  const entries: ConcentrationEntry[] = [];

  for (const [name, info] of depMap.entries()) {
    const transitiveCount = countTransitiveDeps(name, depMap, new Set());
    entries.push({
      name,
      version: info.version,
      transitiveCount,
      sharePercent:
        totalTransitive > 0
          ? Math.round((transitiveCount / totalTransitive) * 10000) / 100
          : 0,
    });
  }

  entries.sort((a, b) => b.transitiveCount - a.transitiveCount);

  const top = entries.slice(0, topN);
  const topNSharePercent =
    totalTransitive > 0
      ? Math.round(
          (top.reduce((sum, e) => sum + e.transitiveCount, 0) / totalTransitive) * 10000
        ) / 100
      : 0;

  return {
    totalTransitive,
    entries,
    topHeavy: topNSharePercent >= 60,
    topNSharePercent,
  };
}

function countTransitiveDeps(
  name: string,
  depMap: Map<string, { version: string; dependencies?: Record<string, string> }>,
  visited: Set<string>
): number {
  if (visited.has(name)) return 0;
  visited.add(name);
  const info = depMap.get(name);
  if (!info?.dependencies) return 0;
  let count = 0;
  for (const dep of Object.keys(info.dependencies)) {
    if (depMap.has(dep)) {
      count += 1 + countTransitiveDeps(dep, depMap, visited);
    }
  }
  return count;
}

export function formatConcentrationReportText(report: ConcentrationReport, topN = 5): string {
  const lines: string[] = [];
  lines.push(`Dependency Concentration Report`);
  lines.push(`Total packages: ${report.totalTransitive}`);
  lines.push(
    `Top ${topN} packages account for ${report.topNSharePercent}% of transitive deps${
      report.topHeavy ? ' ⚠ top-heavy' : ''
    }`
  );
  lines.push('');
  for (const entry of report.entries.slice(0, topN)) {
    lines.push(
      `  ${entry.name}@${entry.version} — ${entry.transitiveCount} transitive (${entry.sharePercent}%)`
    );
  }
  return lines.join('\n');
}
