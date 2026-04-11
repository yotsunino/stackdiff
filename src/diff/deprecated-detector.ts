import { DepMap } from './index';

export interface DeprecatedEntry {
  name: string;
  version: string;
  message: string | null;
}

export interface DeprecatedReport {
  deprecated: DeprecatedEntry[];
  count: number;
}

/**
 * Checks whether a package version string contains a deprecation marker.
 * In a real implementation this would query a registry; here we detect
 * an inline "deprecated:" annotation stored in the version field by
 * test fixtures and the parser layer.
 */
export function isDeprecated(version: string): { deprecated: boolean; message: string | null } {
  const match = version.match(/deprecated:(.*)$/);
  if (match) {
    return { deprecated: true, message: match[1].trim() || null };
  }
  return { deprecated: false, message: null };
}

/**
 * Scans a dependency map and returns all packages that are marked as
 * deprecated together with any deprecation message.
 */
export function detectDeprecated(deps: DepMap): DeprecatedReport {
  const deprecated: DeprecatedEntry[] = [];

  for (const [name, version] of Object.entries(deps)) {
    const result = isDeprecated(version);
    if (result.deprecated) {
      deprecated.push({ name, version, message: result.message });
    }
  }

  return { deprecated, count: deprecated.length };
}

/**
 * Finds packages that became deprecated when moving from `base` to `head`.
 */
export function diffDeprecated(
  base: DepMap,
  head: DepMap
): { newlyDeprecated: DeprecatedEntry[]; resolved: string[] } {
  const baseReport = detectDeprecated(base);
  const headReport = detectDeprecated(head);

  const baseNames = new Set(baseReport.deprecated.map((d) => d.name));
  const headNames = new Set(headReport.deprecated.map((d) => d.name));

  const newlyDeprecated = headReport.deprecated.filter((d) => !baseNames.has(d.name));
  const resolved = baseReport.deprecated
    .filter((d) => !headNames.has(d.name))
    .map((d) => d.name);

  return { newlyDeprecated, resolved };
}

export function formatDeprecatedReportText(report: DeprecatedReport): string {
  if (report.count === 0) {
    return 'No deprecated packages detected.';
  }
  const lines: string[] = [`Deprecated packages (${report.count}):`, ''];
  for (const entry of report.deprecated) {
    const msg = entry.message ? ` — ${entry.message}` : '';
    lines.push(`  • ${entry.name}@${entry.version.replace(/deprecated:.*$/, '').trim()}${msg}`);
  }
  return lines.join('\n');
}
