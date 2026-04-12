import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { buildHealthReport, formatHealthReportText, HealthStatus } from '../diff/dependency-health';
import { formatAsJson } from '../output';

export interface HealthCommandOptions {
  lockFile: string;
  format: 'text' | 'json';
  minStatus?: HealthStatus;
}

const STATUS_RANK: Record<HealthStatus, number> = {
  healthy: 0,
  warning: 1,
  critical: 2,
  unknown: 3,
};

export function runHealthCommand(options: HealthCommandOptions): string {
  const { lockFile, format, minStatus = 'warning' } = options;

  const absPath = path.resolve(lockFile);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Lock file not found: ${absPath}`);
  }

  const content = fs.readFileSync(absPath, 'utf-8');
  const parsed = parsePackageLock(content);
  const report = buildHealthReport(parsed.dependencies);

  const threshold = STATUS_RANK[minStatus];
  const filtered = {
    ...report,
    entries: report.entries.filter(e => STATUS_RANK[e.status] >= threshold),
  };

  // Recompute summary for filtered set
  const summary = { healthy: 0, warning: 0, critical: 0, unknown: 0 };
  for (const e of filtered.entries) summary[e.status]++;
  filtered.summary = summary;

  if (format === 'json') {
    return formatAsJson({ health: filtered });
  }

  return formatHealthReportText(filtered);
}

export const healthCommandDescription =
  'Analyse dependency health: deprecated, abandoned, and unstable packages';
