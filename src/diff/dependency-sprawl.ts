export interface SprawlEntry {
  name: string;
  directDeps: number;
  transitiveDeps: number;
  sprawlScore: number;
  classification: 'contained' | 'moderate' | 'sprawling' | 'excessive';
}

export interface SprawlReport {
  entries: SprawlEntry[];
  averageScore: number;
  mostSprawling: string | null;
}

export type DepMap = Map<string, { version: string; dependencies?: Record<string, string> }>;

export function computeSprawlScore(direct: number, transitive: number): number {
  if (direct === 0) return 0;
  return Math.round((transitive / Math.max(direct, 1)) * 10) / 10;
}

export function classifySprawl(score: number): SprawlEntry['classification'] {
  if (score <= 1) return 'contained';
  if (score <= 5) return 'moderate';
  if (score <= 15) return 'sprawling';
  return 'excessive';
}

export function buildSprawlReport(depMap: DepMap): SprawlReport {
  const entries: SprawlEntry[] = [];

  for (const [name, meta] of depMap) {
    const directDeps = Object.keys(meta.dependencies ?? {}).length;
    const transitiveDeps = countTransitive(name, depMap, new Set());
    const sprawlScore = computeSprawlScore(directDeps, transitiveDeps);
    entries.push({
      name,
      directDeps,
      transitiveDeps,
      sprawlScore,
      classification: classifySprawl(sprawlScore),
    });
  }

  entries.sort((a, b) => b.sprawlScore - a.sprawlScore);

  const averageScore =
    entries.length > 0
      ? Math.round((entries.reduce((s, e) => s + e.sprawlScore, 0) / entries.length) * 10) / 10
      : 0;

  return {
    entries,
    averageScore,
    mostSprawling: entries[0]?.name ?? null,
  };
}

function countTransitive(name: string, depMap: DepMap, visited: Set<string>): number {
  if (visited.has(name)) return 0;
  visited.add(name);
  const meta = depMap.get(name);
  if (!meta?.dependencies) return 0;
  let count = 0;
  for (const dep of Object.keys(meta.dependencies)) {
    count += 1 + countTransitive(dep, depMap, visited);
  }
  return count;
}

export function formatSprawlReportText(report: SprawlReport): string {
  if (report.entries.length === 0) return 'No dependency sprawl data available.';
  const lines: string[] = [`Dependency Sprawl Report (avg score: ${report.averageScore})`, ''];
  for (const e of report.entries) {
    lines.push(`  ${e.name}: score=${e.sprawlScore} [${e.classification}] (direct=${e.directDeps}, transitive=${e.transitiveDeps})`);
  }
  if (report.mostSprawling) {
    lines.push(`\nMost sprawling: ${report.mostSprawling}`);
  }
  return lines.join('\n');
}
