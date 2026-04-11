import { DependencyMap } from './index';

export interface DuplicateEntry {
  name: string;
  versions: string[];
  locations: string[];
}

export interface DuplicateReport {
  duplicates: DuplicateEntry[];
  totalDuplicates: number;
  affectedPackages: number;
}

/**
 * Finds packages that appear with multiple versions in a dependency map.
 */
export function detectDuplicates(deps: DependencyMap): DuplicateEntry[] {
  const grouped = new Map<string, { versions: Set<string>; locations: string[] }>();

  for (const [key, entry] of Object.entries(deps)) {
    const name = entry.name ?? key.split('@')[0];
    const version = entry.version;
    const location = key;

    if (!grouped.has(name)) {
      grouped.set(name, { versions: new Set(), locations: [] });
    }
    const group = grouped.get(name)!;
    group.versions.add(version);
    group.locations.push(location);
  }

  const duplicates: DuplicateEntry[] = [];
  for (const [name, { versions, locations }] of grouped.entries()) {
    if (versions.size > 1) {
      duplicates.push({
        name,
        versions: Array.from(versions).sort(),
        locations,
      });
    }
  }

  return duplicates.sort((a, b) => a.name.localeCompare(b.name));
}

export function buildDuplicateReport(deps: DependencyMap): DuplicateReport {
  const duplicates = detectDuplicates(deps);
  return {
    duplicates,
    totalDuplicates: duplicates.reduce((sum, d) => sum + d.versions.length, 0),
    affectedPackages: duplicates.length,
  };
}

export function formatDuplicateReportText(report: DuplicateReport): string {
  if (report.affectedPackages === 0) {
    return 'No duplicate packages detected.';
  }
  const lines: string[] = [
    `Duplicate packages: ${report.affectedPackages} package(s) with multiple versions`,
    '',
  ];
  for (const dup of report.duplicates) {
    lines.push(`  ${dup.name}: ${dup.versions.join(', ')}`);
  }
  return lines.join('\n');
}
