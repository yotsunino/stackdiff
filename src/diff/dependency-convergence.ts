/**
 * Dependency convergence: measures how consistently a single version
 * of each package is used across the resolved dependency tree.
 * A score of 1.0 means every package has exactly one resolved version.
 */

export interface ConvergenceEntry {
  name: string;
  versions: string[];
  count: number;
  converged: boolean;
}

export interface ConvergenceReport {
  entries: ConvergenceEntry[];
  score: number;
  totalPackages: number;
  divergedPackages: number;
}

export type DepMap = Map<string, { version: string; resolved?: string }>;

/**
 * Groups all resolved versions per package name from a flat dep map.
 * The map keys are expected to be `name@version` or plain `name`.
 */
export function groupVersions(deps: DepMap): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const [key, meta] of deps) {
    // key may be "pkg" or "pkg@1.2.3" (nested lockfile style)
    const name = key.includes('@') && !key.startsWith('@')
      ? key.split('@')[0]
      : key.startsWith('@')
        ? key.split('@').slice(0, 2).join('@')
        : key;
    const list = grouped.get(name) ?? [];
    if (!list.includes(meta.version)) list.push(meta.version);
    grouped.set(name, list);
  }
  return grouped;
}

export function buildConvergenceReport(deps: DepMap): ConvergenceReport {
  const grouped = groupVersions(deps);
  const entries: ConvergenceEntry[] = [];

  for (const [name, versions] of grouped) {
    entries.push({
      name,
      versions,
      count: versions.length,
      converged: versions.length === 1,
    });
  }

  entries.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const totalPackages = entries.length;
  const divergedPackages = entries.filter((e) => !e.converged).length;
  const score =
    totalPackages === 0 ? 1 : (totalPackages - divergedPackages) / totalPackages;

  return { entries, score, totalPackages, divergedPackages };
}

export function formatConvergenceReportText(report: ConvergenceReport): string {
  const pct = (report.score * 100).toFixed(1);
  const lines: string[] = [
    `Convergence Score: ${pct}% (${report.totalPackages - report.divergedPackages}/${report.totalPackages} packages converged)`,
  ];

  const diverged = report.entries.filter((e) => !e.converged);
  if (diverged.length === 0) {
    lines.push('All packages have a single resolved version. ✓');
  } else {
    lines.push('');
    lines.push('Diverged packages:');
    for (const e of diverged) {
      lines.push(`  ${e.name}  (${e.count} versions: ${e.versions.join(', ')})`);
    }
  }

  return lines.join('\n');
}
