import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { detectRedundancy, formatRedundancyReportText } from '../diff/dependency-redundancy';
import { formatAsJson } from '../output';

export interface RedundancyCommandOptions {
  base: string;
  head: string;
  format?: 'text' | 'json';
}

export async function runRedundancyCommand(options: RedundancyCommandOptions): Promise<string> {
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

  const baseMap = parsePackageLock(baseContent);
  const headMap = parsePackageLock(headContent);

  const report = detectRedundancy(baseMap, headMap);

  if (options.format === 'json') {
    return formatAsJson({
      command: 'redundancy',
      totalRedundant: report.totalRedundant,
      entries: report.entries,
    });
  }

  return formatRedundancyReportText(report);
}
