import { DepMap } from './index';

export interface RedundancyEntry {
  name: string;
  version: string;
  reason: 'duplicate-version' | 'subset-of-peer' | 'aliased';
  detail: string;
}

export interface RedundancyReport {
  entries: RedundancyEntry[];
  totalRedundant: number;
}

export function detectRedundancy(
  base: DepMap,
  head: DepMap
): RedundancyReport {
  const entries: RedundancyEntry[] = [];
  const seen = new Map<string, string>();

  for (const [name, info] of head) {
    const version = info.version;

    // Detect packages that appear under multiple aliases resolving same version
    const existing = seen.get(version);
    if (existing && existing !== name) {
      entries.push({
        name,
        version,
        reason: 'aliased',
        detail: `Same version ${version} already provided by ${existing}`,
      });
    } else {
      seen.set(version, name);
    }

    // Detect packages unchanged between base and head that are also in peer deps
    const baseInfo = base.get(name);
    if (baseInfo && baseInfo.version === version) {
      const deps = info.dependencies ?? {};
      const baseDeps = baseInfo.dependencies ?? {};
      const baseDepNames = new Set(Object.keys(baseDeps));
      const headDepNames = new Set(Object.keys(deps));
      const isSubset = [...headDepNames].every((d) => baseDepNames.has(d));
      if (isSubset && headDepNames.size > 0 && headDepNames.size < baseDepNames.size) {
        entries.push({
          name,
          version,
          reason: 'subset-of-peer',
          detail: `Dependency set is a strict subset of base (${headDepNames.size} vs ${baseDepNames.size})`,
        });
      }
    }
  }

  return { entries, totalRedundant: entries.length };
}

export function formatRedundancyReportText(report: RedundancyReport): string {
  if (report.totalRedundant === 0) {
    return 'No redundant dependencies detected.';
  }
  const lines: string[] = [`Redundant Dependencies: ${report.totalRedundant}`, ''];
  for (const entry of report.entries) {
    lines.push(`  ${entry.name}@${entry.version} [${entry.reason}]`);
    lines.push(`    ${entry.detail}`);
  }
  return lines.join('\n');
}
