import { DependencyMap } from '../parser';

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface HealthEntry {
  name: string;
  version: string;
  status: HealthStatus;
  reasons: string[];
}

export interface HealthReport {
  entries: HealthEntry[];
  summary: { healthy: number; warning: number; critical: number; unknown: number };
}

const DEPRECATED_PACKAGES: Record<string, string> = {
  request: 'use node-fetch or axios',
  moment: 'use date-fns or dayjs',
  lodash: 'consider native alternatives',
};

const KNOWN_CRITICAL: string[] = ['node-uuid', 'jade', 'nomnom'];

export function assessHealth(name: string, version: string): HealthEntry {
  const reasons: string[] = [];
  let status: HealthStatus = 'healthy';

  if (KNOWN_CRITICAL.includes(name)) {
    reasons.push(`Package "${name}" is abandoned/unmaintained`);
    status = 'critical';
  }

  if (DEPRECATED_PACKAGES[name]) {
    reasons.push(`Deprecated: ${DEPRECATED_PACKAGES[name]}`);
    if (status === 'healthy') status = 'warning';
  }

  const major = parseInt(version.split('.')[0] ?? '0', 10);
  if (major === 0) {
    reasons.push('Pre-1.0 release — API may be unstable');
    if (status === 'healthy') status = 'warning';
  }

  if (!version || version === 'unknown') {
    reasons.push('Version is unknown or unresolved');
    status = 'unknown';
  }

  return { name, version, status, reasons };
}

export function buildHealthReport(deps: DependencyMap): HealthReport {
  const entries: HealthEntry[] = Object.entries(deps).map(([name, { version }]) =>
    assessHealth(name, version)
  );

  const summary = { healthy: 0, warning: 0, critical: 0, unknown: 0 };
  for (const e of entries) summary[e.status]++;

  return { entries, summary };
}

export function formatHealthReportText(report: HealthReport): string {
  const lines: string[] = ['## Dependency Health Report', ''];
  const { healthy, warning, critical, unknown } = report.summary;
  lines.push(`Healthy: ${healthy}  Warning: ${warning}  Critical: ${critical}  Unknown: ${unknown}`, '');

  const nonHealthy = report.entries.filter(e => e.status !== 'healthy');
  if (nonHealthy.length === 0) {
    lines.push('All dependencies appear healthy.');
  } else {
    for (const e of nonHealthy) {
      lines.push(`[${e.status.toUpperCase()}] ${e.name}@${e.version}`);
      for (const r of e.reasons) lines.push(`  - ${r}`);
    }
  }

  return lines.join('\n');
}
