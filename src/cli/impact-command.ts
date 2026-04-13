import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { buildImpactReport, formatImpactReportText } from '../diff/dependency-impact';
import { formatAsJson } from '../output';

export interface ImpactCommandOptions {
  base: string;
  head: string;
  format?: 'text' | 'json';
  minScore?: number;
}

export async function runImpactCommand(options: ImpactCommandOptions): Promise<string> {
  const basePath = path.resolve(options.base);
  const headPath = path.resolve(options.head);

  if (!fs.existsSync(basePath)) throw new Error(`Base lock file not found: ${basePath}`);
  if (!fs.existsSync(headPath)) throw new Error(`Head lock file not found: ${headPath}`);

  const baseContent = fs.readFileSync(basePath, 'utf-8');
  const headContent = fs.readFileSync(headPath, 'utf-8');

  const baseMap = parsePackageLock(baseContent);
  const headMap = parsePackageLock(headContent);

  let report = buildImpactReport(baseMap, headMap);

  if (options.minScore !== undefined) {
    const threshold = options.minScore;
    report = {
      ...report,
      entries: report.entries.filter(e => e.impactScore >= threshold),
    };
  }

  if (options.format === 'json') {
    return formatAsJson(report);
  }

  return formatImpactReportText(report);
}

export const impactCommandDescription = [
  'impact <base> <head>',
  'Show which dependency changes have the highest downstream impact',
  (yargs: any) =>
    yargs
      .positional('base', { describe: 'Path to base package-lock.json', type: 'string' })
      .positional('head', { describe: 'Path to head package-lock.json', type: 'string' })
      .option('format', { choices: ['text', 'json'], default: 'text' })
      .option('min-score', { type: 'number', describe: 'Minimum impact score to include' }),
] as const;
