import { DepMap } from './index';

export type StabilityLevel = 'stable' | 'unstable' | 'experimental' | 'deprecated';

export interface StabilityEntry {
  name: string;
  version: string;
  level: StabilityLevel;
  reason: string;
}

export interface StabilityReport {
  entries: StabilityEntry[];
  unstableCount: number;
  experimentalCount: number;
  deprecatedCount: number;
}

export function classifyStability(name: string, version: string): StabilityLevel {
  const [major] = version.split('.').map(Number);
  if (major === 0) return 'experimental';
  if (name.startsWith('@alpha/') || name.includes('-alpha') || name.includes('-beta')) {
    return 'unstable';
  }
  if (version.includes('-alpha') || version.includes('-beta') || version.includes('-rc')) {
    return 'unstable';
  }
  return 'stable';
}

export function buildStabilityReport(
  deps: DepMap,
  deprecated: Set<string> = new Set()
): StabilityReport {
  const entries: StabilityEntry[] = [];

  for (const [name, entry] of deps.entries()) {
    const version = entry.version;
    let level: StabilityLevel;
    let reason: string;

    if (deprecated.has(name)) {
      level = 'deprecated';
      reason = 'Package is marked as deprecated';
    } else {
      level = classifyStability(name, version);
      if (level === 'experimental') {
        reason = `Major version is 0 (${version}), API may change`;
      } else if (level === 'unstable') {
        reason = `Pre-release version detected (${version})`;
      } else {
        reason = 'Stable release';
      }
    }

    if (level !== 'stable') {
      entries.push({ name, version, level, reason });
    }
  }

  return {
    entries,
    unstableCount: entries.filter(e => e.level === 'unstable').length,
    experimentalCount: entries.filter(e => e.level === 'experimental').length,
    deprecatedCount: entries.filter(e => e.level === 'deprecated').length,
  };
}

export function formatStabilityReportText(report: StabilityReport): string {
  if (report.entries.length === 0) {
    return 'All dependencies appear stable.';
  }
  const lines: string[] = ['Dependency Stability Report:', ''];
  for (const entry of report.entries) {
    const tag = `[${entry.level.toUpperCase()}]`;
    lines.push(`  ${tag.padEnd(14)} ${entry.name}@${entry.version}`);
    lines.push(`               ${entry.reason}`);
  }
  lines.push('');
  lines.push(
    `Summary: ${report.deprecatedCount} deprecated, ` +
    `${report.unstableCount} unstable, ` +
    `${report.experimentalCount} experimental`
  );
  return lines.join('\n');
}
