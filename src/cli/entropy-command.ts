import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { buildEntropyReport, formatEntropyReportText } from '../diff/dependency-entropy';

export interface EntropyCommandOptions {
  base: string;
  head: string;
  format?: 'text' | 'json';
  threshold?: number; // warn if overallEntropy exceeds this
}

export function runEntropyCommand(options: EntropyCommandOptions): void {
  const { base, head, format = 'text', threshold } = options;

  if (!fs.existsSync(base)) {
    console.error(`Error: base lock file not found: ${base}`);
    process.exit(1);
  }
  if (!fs.existsSync(head)) {
    console.error(`Error: head lock file not found: ${head}`);
    process.exit(1);
  }

  const baseContent = fs.readFileSync(path.resolve(base), 'utf-8');
  const headContent = fs.readFileSync(path.resolve(head), 'utf-8');

  const baseDeps = parsePackageLock(baseContent);
  const headDeps = parsePackageLock(headContent);

  const report = buildEntropyReport(baseDeps, headDeps);

  if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatEntropyReportText(report));
  }

  if (threshold !== undefined && report.overallEntropy > threshold) {
    console.error(
      `Entropy threshold exceeded: ${report.overallEntropy} > ${threshold}`
    );
    process.exit(1);
  }
}
