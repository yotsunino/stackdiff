import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { buildCohesionReport, formatCohesionReportText } from '../diff/dependency-cohesion';

export interface CohesionCommandOptions {
  base: string;
  head: string;
  format?: 'text' | 'json';
  minScore?: number;
}

export async function runCohesionCommand(options: CohesionCommandOptions): Promise<string> {
  const basePath = path.resolve(options.base);
  const headPath = path.resolve(options.head);

  if (!fs.existsSync(basePath)) {
    throw new Error(`Base lock file not found: ${basePath}`);
  }
  if (!fs.existsSync(headPath)) {
    throw new Error(`Head lock file not found: ${headPath}`);
  }

  const baseContent = fs.readFileSync(basePath, 'utf-8');
  const headContent = fs.readFileSync(headPath, 'utf-8');

  const baseDeps = parsePackageLock(baseContent);
  const headDeps = parsePackageLock(headContent);

  const report = buildCohesionReport(baseDeps, headDeps);

  const minScore = options.minScore ?? 0;
  const filtered = {
    ...report,
    entries: report.entries.filter((e) => e.cohesionScore >= minScore),
  };

  if (options.format === 'json') {
    return JSON.stringify(filtered, null, 2);
  }

  return formatCohesionReportText(filtered);
}

export const cohesionCommandDescription = [
  'cohesion <base> <head>',
  'Analyse dependency cohesion between two lock files',
  (yargs: any) =>
    yargs
      .positional('base', { describe: 'Path to base package-lock.json', type: 'string' })
      .positional('head', { describe: 'Path to head package-lock.json', type: 'string' })
      .option('format', { choices: ['text', 'json'], default: 'text', describe: 'Output format' })
      .option('min-score', { type: 'number', default: 0, describe: 'Minimum cohesion score to include' }),
] as const;
