import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { buildTimeline, formatTimelineReportText } from '../diff/dependency-timeline';
import { formatAsJson } from '../output';

export interface TimelineCommandOptions {
  base: string;
  head: string;
  format?: 'text' | 'json';
  outputFile?: string;
}

export async function runTimelineCommand(options: TimelineCommandOptions): Promise<void> {
  const { base, head, format = 'text', outputFile } = options;

  if (!fs.existsSync(base)) {
    throw new Error(`Base lock file not found: ${base}`);
  }
  if (!fs.existsSync(head)) {
    throw new Error(`Head lock file not found: ${head}`);
  }

  const baseContent = fs.readFileSync(base, 'utf-8');
  const headContent = fs.readFileSync(head, 'utf-8');

  const baseDeps = parsePackageLock(baseContent);
  const headDeps = parsePackageLock(headContent);

  const report = buildTimeline(baseDeps, headDeps);

  let output: string;
  if (format === 'json') {
    output = formatAsJson(report);
  } else {
    output = formatTimelineReportText(report);
  }

  if (outputFile) {
    const dir = path.dirname(outputFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputFile, output, 'utf-8');
    console.log(`Timeline report written to ${outputFile}`);
  } else {
    console.log(output);
  }

  if (report.downgradedCount > 0) {
    console.warn(`\nWarning: ${report.downgradedCount} package(s) were downgraded.`);
  }
}
