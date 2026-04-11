import { DepMap } from './index';

export interface DriftEntry {
  name: string;
  baseVersion: string;
  headVersion: string;
  driftDays?: number;
  severity: 'low' | 'medium' | 'high';
}

export interface DriftReport {
  entries: DriftEntry[];
  totalDrifted: number;
  highSeverityCount: number;
}

function classifyDriftSeverity(
  baseVersion: string,
  headVersion: string
): 'low' | 'medium' | 'high' {
  const [baseMajor, baseMinor] = baseVersion.replace(/^[^\d]*/, '').split('.').map(Number);
  const [headMajor, headMinor] = headVersion.replace(/^[^\d]*/, '').split('.').map(Number);

  if (isNaN(baseMajor) || isNaN(headMajor)) return 'low';

  if (headMajor > baseMajor) return 'high';
  if (headMinor - (baseMinor ?? 0) >= 5) return 'medium';
  return 'low';
}

export function detectDrift(base: DepMap, head: DepMap): DriftReport {
  const entries: DriftEntry[] = [];

  for (const [name, headVersion] of head.entries()) {
    const baseVersion = base.get(name);
    if (!baseVersion || baseVersion === headVersion) continue;

    const severity = classifyDriftSeverity(baseVersion, headVersion);
    entries.push({ name, baseVersion, headVersion, severity });
  }

  const highSeverityCount = entries.filter((e) => e.severity === 'high').length;

  return {
    entries,
    totalDrifted: entries.length,
    highSeverityCount,
  };
}

export function formatDriftReportText(report: DriftReport): string {
  if (report.entries.length === 0) {
    return 'No version drift detected.';
  }

  const lines: string[] = [
    `Version Drift Report (${report.totalDrifted} changed, ${report.highSeverityCount} high severity):`,
    '',
  ];

  for (const entry of report.entries) {
    const badge = entry.severity === 'high' ? '[HIGH]' : entry.severity === 'medium' ? '[MED] ' : '[LOW] ';
    lines.push(`  ${badge} ${entry.name}: ${entry.baseVersion} → ${entry.headVersion}`);
  }

  return lines.join('\n');
}
