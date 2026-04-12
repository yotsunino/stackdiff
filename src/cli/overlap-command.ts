import * as fs from 'fs';
import { parsePackageLock } from '../parser';
import { computeOverlap, formatOverlapReportText } from '../diff/dependency-overlap';
import { formatAsJson } from '../output';

export interface OverlapCommandOptions {
  lockA: string;
  lockB: string;
  format?: 'text' | 'json';
  minOverlap?: number;
}

export async function runOverlapCommand(options: OverlapCommandOptions): Promise<void> {
  const { lockA, lockB, format = 'text', minOverlap } = options;

  if (!fs.existsSync(lockA)) {
    throw new Error(`Lock file not found: ${lockA}`);
  }
  if (!fs.existsSync(lockB)) {
    throw new Error(`Lock file not found: ${lockB}`);
  }

  const contentA = fs.readFileSync(lockA, 'utf-8');
  const contentB = fs.readFileSync(lockB, 'utf-8');

  const depsA = parsePackageLock(contentA);
  const depsB = parsePackageLock(contentB);

  const report = computeOverlap(depsA, depsB);

  if (minOverlap !== undefined && report.overlapScore < minOverlap) {
    process.stderr.write(
      `Overlap score ${report.overlapScore}% is below threshold ${minOverlap}%\n`
    );
    process.exitCode = 1;
  }

  if (format === 'json') {
    process.stdout.write(formatAsJson(report) + '\n');
  } else {
    process.stdout.write(formatOverlapReportText(report) + '\n');
  }
}

export const overlapCommandDescription =
  'Compare dependency overlap between two lock files and report shared, added, and removed packages.';
