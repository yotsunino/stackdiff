import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { buildDuplicateReport, formatDuplicateReportText } from '../diff/duplicate-detector';
import { formatAsJson } from '../output';

export interface DuplicateCommandOptions {
  lockFile: string;
  format: 'text' | 'json';
  threshold?: number;
}

export async function runDuplicateCommand(options: DuplicateCommandOptions): Promise<string> {
  const resolved = path.resolve(options.lockFile);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Lock file not found: ${resolved}`);
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  const deps = parsePackageLock(content);
  const report = buildDuplicateReport(deps);

  const threshold = options.threshold ?? 0;
  if (report.affectedPackages < threshold) {
    const msg = `Duplicate count (${report.affectedPackages}) is within threshold (${threshold}).`;
    return options.format === 'json'
      ? JSON.stringify({ status: 'ok', message: msg, report })
      : msg;
  }

  if (options.format === 'json') {
    return formatAsJson({
      status: report.affectedPackages > 0 ? 'warn' : 'ok',
      report,
    });
  }

  return formatDuplicateReportText(report);
}

export function duplicateCommandDescription(): string {
  return 'Detect packages that appear with multiple versions in a lock file.';
}
