import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { buildMaturityReport, formatMaturityReportText } from '../diff/dependency-maturity';
import { formatAsJson } from '../output';

export interface MaturityCommandOptions {
  lockFile: string;
  format: 'text' | 'json';
  minScore?: number;
}

export async function runMaturityCommand(options: MaturityCommandOptions): Promise<string> {
  const { lockFile, format, minScore } = options;

  const resolved = path.resolve(lockFile);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Lock file not found: ${resolved}`);
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  const parsed = parsePackageLock(content);

  const depMap = new Map(
    Object.entries(parsed.dependencies ?? {}).map(([name, entry]) => [
      name,
      { version: (entry as { version: string }).version },
    ])
  );

  let report = buildMaturityReport(depMap);

  if (minScore !== undefined) {
    report = {
      ...report,
      entries: report.entries.filter(e => e.score < minScore),
    };
  }

  if (format === 'json') {
    return formatAsJson({
      averageScore: report.averageScore,
      unstableCount: report.unstableCount,
      preReleaseCount: report.preReleaseCount,
      entries: report.entries,
    });
  }

  return formatMaturityReportText(report);
}

export const maturityCommandDescription =
  'Assess the maturity of dependencies based on version stability and pre-release status.';
