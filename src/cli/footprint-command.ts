import * as fs from 'fs';
import { parsePackageLock } from '../parser';
import { buildFootprintReport, formatFootprintReportText } from '../diff/dependency-footprint';

export interface FootprintCommandOptions {
  lockFile: string;
  format: 'text' | 'json';
  top?: number;
}

export async function runFootprintCommand(options: FootprintCommandOptions): Promise<string> {
  const { lockFile, format, top } = options;

  if (!fs.existsSync(lockFile)) {
    throw new Error(`Lock file not found: ${lockFile}`);
  }

  const content = fs.readFileSync(lockFile, 'utf-8');
  const parsed = parsePackageLock(content);

  const directMap = new Map(
    [...parsed.entries()].filter(([, v]) => v.direct)
  );

  const report = buildFootprintReport(directMap, parsed);

  const trimmed = top
    ? { ...report, entries: report.entries.slice(0, top) }
    : report;

  if (format === 'json') {
    return JSON.stringify(trimmed, null, 2);
  }

  return formatFootprintReportText(trimmed);
}

export const footprintCommandDescription = [
  'footprint <lockfile>',
  'Analyze the dependency footprint (direct + transitive weight) of each package.',
  {
    '--format <text|json>': 'Output format (default: text)',
    '--top <n>':           'Show only the top N heaviest packages',
  },
] as const;
