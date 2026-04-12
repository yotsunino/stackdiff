import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { buildChurnReport, formatChurnReportText, DepMap } from '../diff/dependency-churn';
import { formatAsJson } from '../output';

export interface ChurnCommandOptions {
  lockFiles: string[];
  format?: 'text' | 'json';
  minScore?: number;
}

export async function runChurnCommand(options: ChurnCommandOptions): Promise<string> {
  const { lockFiles, format = 'text', minScore = 0 } = options;

  if (lockFiles.length < 2) {
    throw new Error('At least two lock files are required to compute churn.');
  }

  const snapshots: DepMap[] = lockFiles.map((filePath) => {
    const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
    const parsed = parsePackageLock(content);
    return parsed as DepMap;
  });

  let report = buildChurnReport(snapshots);

  if (minScore > 0) {
    report = {
      ...report,
      entries: report.entries.filter((e) => e.churnScore >= minScore),
      highChurnPackages: report.highChurnPackages.filter((e) => e.churnScore >= minScore),
    };
  }

  if (format === 'json') {
    return formatAsJson({
      totalChurn: report.totalChurn,
      highChurnCount: report.highChurnPackages.length,
      entries: report.entries,
    });
  }

  return formatChurnReportText(report);
}

export const churnCommandDescription = [
  'churn <lock1> <lock2> [lockN...]',
  'Analyse how frequently dependencies change across multiple lock file snapshots.',
  'Options:',
  '  --format <text|json>   Output format (default: text)',
  '  --min-score <n>        Only show packages with a churn score >= n',
].join('\n');
