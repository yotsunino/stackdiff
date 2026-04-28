import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { buildMomentumReport, formatMomentumReportText, DepMap } from '../diff/dependency-momentum';

function lockToDepMap(lockPath: string): DepMap {
  const content = fs.readFileSync(lockPath, 'utf-8');
  const parsed = parsePackageLock(content);
  const map: DepMap = new Map();
  for (const [name, entry] of Object.entries(parsed)) {
    map.set(name, { version: (entry as any).version ?? '0.0.0' });
  }
  return map;
}

export function runMomentumCommand(args: {
  base: string;
  head: string;
  format?: 'text' | 'json';
  minScore?: number;
}): void {
  const basePath = path.resolve(args.base);
  const headPath = path.resolve(args.head);

  if (!fs.existsSync(basePath)) {
    console.error(`Base lock file not found: ${basePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(headPath)) {
    console.error(`Head lock file not found: ${headPath}`);
    process.exit(1);
  }

  const baseMap = lockToDepMap(basePath);
  const headMap = lockToDepMap(headPath);
  let report = buildMomentumReport(baseMap, headMap);

  if (args.minScore !== undefined) {
    report = {
      ...report,
      entries: report.entries.filter((e) => e.score >= (args.minScore ?? 0)),
    };
  }

  if (args.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    process.stdout.write(formatMomentumReportText(report));
  }
}
