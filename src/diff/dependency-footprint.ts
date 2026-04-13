export interface FootprintEntry {
  name: string;
  version: string;
  depCount: number;
  transitiveCount: number;
  footprintScore: number;
}

export interface FootprintReport {
  entries: FootprintEntry[];
  totalDirect: number;
  totalTransitive: number;
  heaviest: FootprintEntry | null;
}

export type DepMap = Map<string, { version: string; requires?: Record<string, string> }>;

export function computeFootprintScore(depCount: number, transitiveCount: number): number {
  return Math.round(depCount * 1 + transitiveCount * 0.5);
}

export function buildFootprintReport(direct: DepMap, all: DepMap): FootprintReport {
  const entries: FootprintEntry[] = [];

  for (const [name, meta] of direct) {
    const requires = meta.requires ?? {};
    const depCount = Object.keys(requires).length;

    const transitiveCount = countTransitive(name, all, new Set());
    const footprintScore = computeFootprintScore(depCount, transitiveCount);

    entries.push({ name, version: meta.version, depCount, transitiveCount, footprintScore });
  }

  entries.sort((a, b) => b.footprintScore - a.footprintScore);

  const totalDirect = entries.reduce((s, e) => s + e.depCount, 0);
  const totalTransitive = entries.reduce((s, e) => s + e.transitiveCount, 0);
  const heaviest = entries[0] ?? null;

  return { entries, totalDirect, totalTransitive, heaviest };
}

function countTransitive(name: string, all: DepMap, visited: Set<string>): number {
  if (visited.has(name)) return 0;
  visited.add(name);
  const meta = all.get(name);
  if (!meta) return 0;
  const requires = meta.requires ?? {};
  let count = 0;
  for (const dep of Object.keys(requires)) {
    count += 1 + countTransitive(dep, all, visited);
  }
  return count;
}

export function formatFootprintReportText(report: FootprintReport): string {
  if (report.entries.length === 0) return 'No dependencies found.';

  const lines: string[] = ['Dependency Footprint Report', '==========================='];
  for (const e of report.entries) {
    lines.push(
      `  ${e.name}@${e.version}  direct-deps=${e.depCount}  transitive=${e.transitiveCount}  score=${e.footprintScore}`
    );
  }
  lines.push('');
  lines.push(`Total direct deps: ${report.totalDirect}`);
  lines.push(`Total transitive deps: ${report.totalTransitive}`);
  if (report.heaviest) {
    lines.push(`Heaviest package: ${report.heaviest.name} (score=${report.heaviest.footprintScore})`);
  }
  return lines.join('\n');
}
