/**
 * dependency-density.ts
 * Measures how densely packed a dependency tree is by comparing
 * direct vs transitive dependency ratios.
 */

export interface DensityEntry {
  name: string;
  version: string;
  directDeps: number;
  transitiveDeps: number;
  densityScore: number;
}

export interface DensityReport {
  entries: DensityEntry[];
  averageDensity: number;
  classification: 'sparse' | 'moderate' | 'dense' | 'very-dense';
}

export type DepMap = Map<string, { version: string; dependencies?: Record<string, string> }>;

export function computeDensityScore(direct: number, transitive: number): number {
  if (direct === 0) return 0;
  return parseFloat((transitive / direct).toFixed(2));
}

export function classifyDensity(averageScore: number): DensityReport['classification'] {
  if (averageScore < 2) return 'sparse';
  if (averageScore < 5) return 'moderate';
  if (averageScore < 10) return 'dense';
  return 'very-dense';
}

export function buildDensityReport(depMap: DepMap): DensityReport {
  const entries: DensityEntry[] = [];

  for (const [name, meta] of depMap.entries()) {
    const directDeps = Object.keys(meta.dependencies ?? {}).length;
    let transitiveDeps = 0;

    const visited = new Set<string>();
    const queue = Object.keys(meta.dependencies ?? {});
    while (queue.length > 0) {
      const dep = queue.shift()!;
      if (visited.has(dep)) continue;
      visited.add(dep);
      transitiveDeps++;
      const child = depMap.get(dep);
      if (child?.dependencies) {
        queue.push(...Object.keys(child.dependencies));
      }
    }

    entries.push({
      name,
      version: meta.version,
      directDeps,
      transitiveDeps,
      densityScore: computeDensityScore(directDeps, transitiveDeps),
    });
  }

  const averageDensity =
    entries.length > 0
      ? parseFloat(
          (entries.reduce((sum, e) => sum + e.densityScore, 0) / entries.length).toFixed(2)
        )
      : 0;

  return {
    entries,
    averageDensity,
    classification: classifyDensity(averageDensity),
  };
}

export function formatDensityReportText(report: DensityReport): string {
  const lines: string[] = [
    `Dependency Density Report`,
    `Classification: ${report.classification} (avg score: ${report.averageDensity})`,
    '',
  ];

  for (const entry of report.entries) {
    lines.push(
      `  ${entry.name}@${entry.version} — direct: ${entry.directDeps}, transitive: ${entry.transitiveDeps}, score: ${entry.densityScore}`
    );
  }

  return lines.join('\n');
}
