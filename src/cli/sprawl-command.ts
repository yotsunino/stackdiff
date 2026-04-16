import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { buildSprawlReport, formatSprawlReportText } from '../diff/dependency-sprawl';

export interface SprawlCommandOptions {
  lockFile: string;
  json: boolean;
  threshold?: number;
}

export async function runSprawlCommand(options: SprawlCommandOptions): Promise<void> {
  const lockPath = path.resolve(options.lockFile);

  if (!fs.existsSync(lockPath)) {
    console.error(`Lock file not found: ${lockPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(lockPath, 'utf-8');
  const depMap = parsePackageLock(content);
  const report = buildSprawlReport(depMap);

  const filtered =
    options.threshold !== undefined
      ? { ...report, entries: report.entries.filter(e => e.sprawlScore >= options.threshold!) }
      : report;

  if (options.json) {
    console.log(JSON.stringify(filtered, null, 2));
  } else {
    console.log(formatSprawlReportText(filtered));
  }
}

export const sprawlCommandDescription = 'Analyse dependency sprawl — ratio of transitive to direct dependencies';
