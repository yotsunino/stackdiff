import { DepMap } from './index';

export interface OwnershipEntry {
  name: string;
  version: string;
  scope: 'direct' | 'transitive';
  introducedBy: string[];
}

export interface OwnershipReport {
  entries: OwnershipEntry[];
  totalDirect: number;
  totalTransitive: number;
}

export function buildOwnershipReport(
  direct: DepMap,
  transitive: DepMap,
  parentMap: Map<string, string[]> = new Map()
): OwnershipReport {
  const entries: OwnershipEntry[] = [];

  for (const [name, version] of direct.entries()) {
    entries.push({
      name,
      version,
      scope: 'direct',
      introducedBy: [],
    });
  }

  for (const [name, version] of transitive.entries()) {
    if (!direct.has(name)) {
      entries.push({
        name,
        version,
        scope: 'transitive',
        introducedBy: parentMap.get(name) ?? [],
      });
    }
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  return {
    entries,
    totalDirect: entries.filter(e => e.scope === 'direct').length,
    totalTransitive: entries.filter(e => e.scope === 'transitive').length,
  };
}

export function formatOwnershipReportText(report: OwnershipReport): string {
  if (report.entries.length === 0) {
    return 'No dependencies found.';
  }

  const lines: string[] = [
    `Dependency Ownership Report`,
    `Direct: ${report.totalDirect}  Transitive: ${report.totalTransitive}`,
    '',
  ];

  for (const entry of report.entries) {
    const scope = entry.scope === 'direct' ? '[direct]    ' : '[transitive]';
    const parents =
      entry.introducedBy.length > 0
        ? ` (via ${entry.introducedBy.join(', ')})`
        : '';
    lines.push(`  ${scope} ${entry.name}@${entry.version}${parents}`);
  }

  return lines.join('\n');
}
