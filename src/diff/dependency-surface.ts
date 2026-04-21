/**
 * Computes the "attack surface" of a dependency tree by counting
 * how many packages are exposed at the top level vs. transitively,
 * and flags packages that increased surface area between two lock files.
 */

export interface SurfaceEntry {
  name: string;
  version: string;
  direct: boolean;
  transitive: boolean;
}

export interface SurfaceReport {
  totalDirect: number;
  totalTransitive: number;
  surfaceScore: number;
  added: SurfaceEntry[];
  removed: SurfaceEntry[];
  unchanged: SurfaceEntry[];
}

export type DepMap = Map<string, { version: string; direct?: boolean }>;

function toSurfaceEntry(name: string, meta: { version: string; direct?: boolean }): SurfaceEntry {
  return {
    name,
    version: meta.version,
    direct: meta.direct === true,
    transitive: meta.direct !== true,
  };
}

export function buildSurfaceReport(base: DepMap, head: DepMap): SurfaceReport {
  const added: SurfaceEntry[] = [];
  const removed: SurfaceEntry[] = [];
  const unchanged: SurfaceEntry[] = [];

  for (const [name, meta] of head) {
    if (!base.has(name)) {
      added.push(toSurfaceEntry(name, meta));
    } else {
      unchanged.push(toSurfaceEntry(name, meta));
    }
  }

  for (const [name, meta] of base) {
    if (!head.has(name)) {
      removed.push(toSurfaceEntry(name, meta));
    }
  }

  const allHead = [...head.values()];
  const totalDirect = allHead.filter((m) => m.direct === true).length;
  const totalTransitive = allHead.filter((m) => m.direct !== true).length;
  const surfaceScore = totalDirect + Math.round(totalTransitive * 0.25);

  return { totalDirect, totalTransitive, surfaceScore, added, removed, unchanged };
}

export function formatSurfaceReportText(report: SurfaceReport): string {
  const lines: string[] = [
    `Dependency Surface Report`,
    `  Direct:     ${report.totalDirect}`,
    `  Transitive: ${report.totalTransitive}`,
    `  Score:      ${report.surfaceScore}`,
  ];

  if (report.added.length > 0) {
    lines.push(`\nAdded (${report.added.length}):`);
    for (const e of report.added) {
      lines.push(`  + ${e.name}@${e.version} [${e.direct ? 'direct' : 'transitive'}]`);
    }
  }

  if (report.removed.length > 0) {
    lines.push(`\nRemoved (${report.removed.length}):`);
    for (const e of report.removed) {
      lines.push(`  - ${e.name}@${e.version} [${e.direct ? 'direct' : 'transitive'}]`);
    }
  }

  if (report.added.length === 0 && report.removed.length === 0) {
    lines.push(`\nNo surface changes detected.`);
  }

  return lines.join('\n');
}
