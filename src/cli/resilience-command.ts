import * as fs from 'fs';
import { parsePackageLock } from '../parser';
import { buildResilienceReport, formatResilienceReportText } from '../diff/dependency-resilience';
import { formatAsJson } from '../output';

export interface ResilienceCommandOptions {
  lockFile: string;
  json?: boolean;
  threshold?: number;
}

export function meetsResilienceThreshold(score: number, threshold: number): boolean {
  return score >= threshold;
}

export async function runResilienceCommand(options: ResilienceCommandOptions): Promise<void> {
  const { lockFile, json = false, threshold = 0 } = options;

  if (!fs.existsSync(lockFile)) {
    console.error(`Error: lock file not found: ${lockFile}`);
    process.exitCode = 1;
    return;
  }

  const raw = fs.readFileSync(lockFile, 'utf-8');
  const depMap = parsePackageLock(raw);
  const report = buildResilienceReport(depMap);

  if (json) {
    console.log(formatAsJson(report));
    return;
  }

  console.log(formatResilienceReportText(report));

  if (threshold > 0 && !meetsResilienceThreshold(report.overallScore, threshold)) {
    console.error(
      `\nResilience score ${report.overallScore} is below threshold ${threshold}.`
    );
    process.exitCode = 1;
  }
}
