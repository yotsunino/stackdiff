/**
 * dependency-modularity.ts
 *
 * Analyses how modular a dependency tree is by measuring the ratio of
 * direct-to-transitive dependencies and detecting "god packages" that pull
 * in disproportionately large transitive sub-trees.
 */

export interface ModularityEntry {
  name: string;
  version: string;
  directDeps: number;
  transitiveDeps: number;
  modularityScore: number; // 0–100, higher = more modular
  classification: 'modular' | 'moderate' | 'monolithic';
}

export interface ModularityReport {
  entries: ModularityEntry[];
  averageScore: number;
  godPackages: string[];
  totalDirect: number;
  totalTransitive: number;
}

export interface DepNode {
  version: string;
  dependencies?: Record<string, string>;
}

export type DepMap = Map<string, DepNode>;

/** Threshold (number of transitive deps) above which a package is a "god package". */
const GOD_PACKAGE_THRESHOLD = 20;

/**
 * Recursively count all transitive dependencies reachable from `name`.
 * Uses a visited set to avoid infinite loops in cyclic graphs.
 */
function countTransitive(
  name: string,
  depMap: DepMap,
  visited: Set<string> = new Set()
): number {
  if (visited.has(name)) return 0;
  visited.add(name);

  const node = depMap.get(name);
  if (!node?.dependencies) return 0;

  let count = 0;
  for (const child of Object.keys(node.dependencies)) {
    count += 1 + countTransitive(child, depMap, visited);
  }
  return count;
}

/**
 * Compute a modularity score (0–100) based on the ratio of direct to total
 * (direct + transitive) dependencies.  A package with zero deps scores 100.
 */
function computeModularityScore(direct: number, transitive: number): number {
  const total = direct + transitive;
  if (total === 0) return 100;
  return Math.round((direct / total) * 100);
}

function classifyModularity(
  score: number
): ModularityEntry['classification'] {
  if (score >= 70) return 'modular';
  if (score >= 40) return 'moderate';
  return 'monolithic';
}

/**
 * Build a full modularity report for all packages in the dependency map.
 */
export function buildModularityReport(depMap: DepMap): ModularityReport {
  const entries: ModularityEntry[] = [];
  let scoreSum = 0;
  let totalDirect = 0;
  let totalTransitive = 0;

  for (const [name, node] of depMap) {
    const directDeps = node.dependencies
      ? Object.keys(node.dependencies).length
      : 0;
    const transitiveDeps = countTransitive(name, depMap);
    const modularityScore = computeModularityScore(directDeps, transitiveDeps);
    const classification = classifyModularity(modularityScore);

    entries.push({
      name,
      version: node.version,
      directDeps,
      transitiveDeps,
      modularityScore,
      classification,
    });

    scoreSum += modularityScore;
    totalDirect += directDeps;
    totalTransitive += transitiveDeps;
  }

  const averageScore =
    entries.length > 0 ? Math.round(scoreSum / entries.length) : 100;

  const godPackages = entries
    .filter((e) => e.transitiveDeps >= GOD_PACKAGE_THRESHOLD)
    .map((e) => e.name);

  // Sort: monolithic first, then by transitive count descending
  entries.sort((a, b) => b.transitiveDeps - a.transitiveDeps);

  return { entries, averageScore, godPackages, totalDirect, totalTransitive };
}

/**
 * Render a human-readable text summary of the modularity report.
 */
export function formatModularityReportText(report: ModularityReport): string {
  const lines: string[] = [
    '=== Dependency Modularity Report ===',
    `Average modularity score : ${report.averageScore}/100`,
    `Total direct deps        : ${report.totalDirect}`,
    `Total transitive deps    : ${report.totalTransitive}`,
  ];

  if (report.godPackages.length > 0) {
    lines.push(
      `\nGod packages (≥${GOD_PACKAGE_THRESHOLD} transitive deps): ${report.godPackages.join(', ')}`
    );
  } else {
    lines.push('\nNo god packages detected.');
  }

  lines.push('\nPackage breakdown:');
  for (const e of report.entries) {
    const flag = report.godPackages.includes(e.name) ? ' ⚠' : '';
    lines.push(
      `  ${e.name}@${e.version}  [${e.classification}]  score=${e.modularityScore}  ` +
        `direct=${e.directDeps}  transitive=${e.transitiveDeps}${flag}`
    );
  }

  return lines.join('\n');
}
