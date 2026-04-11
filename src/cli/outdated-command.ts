import * as path from 'path';
import * as fs from 'fs';
import { parsePackageLock } from '../parser';
import { detectOutdated, formatOutdatedText, OutdatedReport } from '../diff/outdated-detector';
import { formatAsJson } from '../output/report-formatter';

export type OutdatedCommandOptions = {
  current: string;
  latest: string;
  format?: 'text' | 'json';
  severity?: 'patch' | 'minor' | 'major';
};

const SEVERITY_RANK: Record<string, number> = { patch: 0, minor: 1, major: 2 };

function filterBySeverityThreshold(
  report: OutdatedReport,
  threshold: 'patch' | 'minor' | 'major'
): OutdatedReport {
  const minRank = SEVERITY_RANK[threshold];
  const entries = report.entries.filter(e => SEVERITY_RANK[e.severity] >= minRank);
  return {
    entries,
    total: entries.length,
    byMajor: entries.filter(e => e.severity === 'major').length,
    byMinor: entries.filter(e => e.severity === 'minor').length,
    byPatch: entries.filter(e => e.severity === 'patch').length,
  };
}

export function runOutdatedCommand(options: OutdatedCommandOptions): string {
  const currentPath = path.resolve(options.current);
  const latestPath = path.resolve(options.latest);

  if (!fs.existsSync(currentPath)) throw new Error(`File not found: ${currentPath}`);
  if (!fs.existsSync(latestPath)) throw new Error(`File not found: ${latestPath}`);

  const currentDeps = parsePackageLock(fs.readFileSync(currentPath, 'utf-8'));
  const latestDeps = parsePackageLock(fs.readFileSync(latestPath, 'utf-8'));

  let report = detectOutdated(currentDeps, latestDeps);

  if (options.severity) {
    report = filterBySeverityThreshold(report, options.severity);
  }

  if (options.format === 'json') {
    return JSON.stringify(report, null, 2);
  }

  return formatOutdatedText(report);
}
