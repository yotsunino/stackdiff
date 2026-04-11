import { DepMap } from './dependency-differ';

export type OutdatedEntry = {
  name: string;
  current: string;
  latest: string;
  severity: 'patch' | 'minor' | 'major';
};

export type OutdatedReport = {
  entries: OutdatedEntry[];
  total: number;
  byMajor: number;
  byMinor: number;
  byPatch: number;
};

export function classifyOutdated(
  current: string,
  latest: string
): 'patch' | 'minor' | 'major' {
  const [curMajor, curMinor] = current.replace(/^[^\d]*/, '').split('.').map(Number);
  const [latMajor, latMinor] = latest.replace(/^[^\d]*/, '').split('.').map(Number);
  if (latMajor > curMajor) return 'major';
  if (latMinor > curMinor) return 'minor';
  return 'patch';
}

export function detectOutdated(
  current: DepMap,
  latest: DepMap
): OutdatedReport {
  const entries: OutdatedEntry[] = [];

  for (const [name, latestVersion] of Object.entries(latest)) {
    const currentVersion = current[name];
    if (!currentVersion || currentVersion === latestVersion) continue;
    const severity = classifyOutdated(currentVersion, latestVersion);
    entries.push({ name, current: currentVersion, latest: latestVersion, severity });
  }

  return {
    entries,
    total: entries.length,
    byMajor: entries.filter(e => e.severity === 'major').length,
    byMinor: entries.filter(e => e.severity === 'minor').length,
    byPatch: entries.filter(e => e.severity === 'patch').length,
  };
}

export function formatOutdatedText(report: OutdatedReport): string {
  if (report.total === 0) return 'All dependencies are up to date.';
  const lines: string[] = [
    `Outdated dependencies: ${report.total} (major: ${report.byMajor}, minor: ${report.byMinor}, patch: ${report.byPatch})`,
    '',
  ];
  for (const entry of report.entries) {
    lines.push(`  [${entry.severity.toUpperCase()}] ${entry.name}: ${entry.current} → ${entry.latest}`);
  }
  return lines.join('\n');
}
