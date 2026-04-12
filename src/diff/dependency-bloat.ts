export interface BloatEntry {
  name: string;
  version: string;
  directDeps: number;
  transitiveDeps: number;
  totalDeps: number;
  bloatScore: number;
}

export interface BloatReport {
  entries: BloatEntry[];
  totalDirect: number;
  totalTransitive: number;
  heaviest: BloatEntry | null;
}

export type DepMap = Map<string, { version: string; requires?: Record<string, string> }>;

export function computeBloatScore(direct: number, transitive: number): number {
  return Math.round(direct + transitive * 0.5);
}

export function buildBloatReport(
  deps: DepMap,
  transitiveCounts: Map<string, number>
): BloatReport {
  const entries: BloatEntry[] = [];

  for (const [name, info] of deps) {
    const directDeps = Object.keys(info.requires ?? {}).length;
    const transitiveDeps = transitiveCounts.get(name) ?? 0;
    const totalDeps = directDeps + transitiveDeps;
    const bloatScore = computeBloatScore(directDeps, transitiveDeps);
    entries.push({ name, version: info.version, directDeps, transitiveDeps, totalDeps, bloatScore });
  }

  entries.sort((a, b) => b.bloatScore - a.bloatScore);

  const totalDirect = entries.reduce((s, e) => s + e.directDeps, 0);
  const totalTransitive = entries.reduce((s, e) => s + e.transitiveDeps, 0);
  const heaviest = entries.length > 0 ? entries[0] : null;

  return { entries, totalDirect, totalTransitive, heaviest };
}

export function formatBloatReportText(report: BloatReport): string {
  if (report.entries.length === 0) return 'No dependency bloat data available.';

  const lines: string[] = ['Dependency Bloat Report', '======================='];

  for (const e of report.entries) {
    lines.push(
      `  ${e.name}@${e.version} — direct: ${e.directDeps}, transitive: ${e.transitiveDeps}, score: ${e.bloatScore}`
    );
  }

  lines.push('');
  lines.push(`Total direct deps: ${report.totalDirect}`);
  lines.push(`Total transitive deps: ${report.totalTransitive}`);
  if (report.heaviest) {
    lines.push(`Heaviest package: ${report.heaviest.name}@${report.heaviest.version} (score: ${report.heaviest.bloatScore})`);
  }

  return lines.join('\n');
}
