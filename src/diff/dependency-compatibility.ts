import { parseSemver } from '../resolver/semver-utils';

export interface CompatibilityEntry {
  name: string;
  fromVersion: string;
  toVersion: string;
  compatible: boolean;
  reason: string;
}

export interface CompatibilityReport {
  compatible: CompatibilityEntry[];
  incompatible: CompatibilityEntry[];
  total: number;
}

export type DepMap = Map<string, { version: string; resolved?: string }>;

export function checkCompatibility(
  base: DepMap,
  head: DepMap
): CompatibilityEntry[] {
  const entries: CompatibilityEntry[] = [];

  for (const [name, headPkg] of head) {
    const basePkg = base.get(name);
    if (!basePkg) continue;
    if (basePkg.version === headPkg.version) continue;

    const from = parseSemver(basePkg.version);
    const to = parseSemver(headPkg.version);

    let compatible = true;
    let reason = 'patch or minor bump';

    if (!from || !to) {
      compatible = false;
      reason = 'unparseable version';
    } else if (to.major !== from.major) {
      compatible = false;
      reason = `major version change: ${from.major} → ${to.major}`;
    } else if (to.minor < from.minor) {
      compatible = false;
      reason = `minor downgrade: ${from.minor} → ${to.minor}`;
    } else if (to.patch < from.patch && to.minor === from.minor) {
      compatible = false;
      reason = `patch downgrade: ${from.patch} → ${to.patch}`;
    }

    entries.push({ name, fromVersion: basePkg.version, toVersion: headPkg.version, compatible, reason });
  }

  return entries;
}

export function buildCompatibilityReport(entries: CompatibilityEntry[]): CompatibilityReport {
  return {
    compatible: entries.filter(e => e.compatible),
    incompatible: entries.filter(e => !e.compatible),
    total: entries.length,
  };
}

export function formatCompatibilityReportText(report: CompatibilityReport): string {
  const lines: string[] = [];
  lines.push(`Compatibility Report (${report.total} changed)`);
  lines.push(`  Compatible:   ${report.compatible.length}`);
  lines.push(`  Incompatible: ${report.incompatible.length}`);

  if (report.incompatible.length > 0) {
    lines.push('');
    lines.push('Incompatible changes:');
    for (const e of report.incompatible) {
      lines.push(`  ${e.name}: ${e.fromVersion} → ${e.toVersion} (${e.reason})`);
    }
  }

  return lines.join('\n');
}
