import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { buildComplexityReport, formatComplexityReportText } from '../diff/dependency-complexity';

export interface ComplexityCommandOptions {
  lockFile: string;
  threshold?: number;
  format?: 'text' | 'json';
}

export function runComplexityCommand(options: ComplexityCommandOptions): string {
  const { lockFile, threshold = 0, format = 'text' } = options;

  if (!fs.existsSync(lockFile)) {
    throw new Error(`Lock file not found: ${lockFile}`);
  }

  const raw = fs.readFileSync(lockFile, 'utf-8');
  const parsed = parsePackageLock(raw);
  const depMap = new Map(
    Object.entries(parsed.dependencies ?? {}).map(([name, meta]) => [
      name,
      meta as { version: string; requires?: Record<string, string>; dependencies?: Record<string, { version: string }> },
    ])
  );

  const report = buildComplexityReport(depMap);

  const filtered = {
    ...report,
    entries: threshold > 0 ? report.entries.filter(e => e.score >= threshold) : report.entries,
  };

  if (format === 'json') {
    return JSON.stringify(filtered, null, 2);
  }

  return formatComplexityReportText(filtered);
}

export const complexityCommandDescription =
  'Analyse the structural complexity of each dependency based on direct deps, transitive deps, and depth.';
