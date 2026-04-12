import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { flattenTransitiveDeps } from '../resolver/transitive-resolver';
import { buildBloatReport, formatBloatReportText } from '../diff/dependency-bloat';
import { formatAsJson } from '../output/report-formatter';

export interface BloatCommandOptions {
  lockFile: string;
  topN?: number;
  json?: boolean;
}

export async function runBloatCommand(options: BloatCommandOptions): Promise<string> {
  const { lockFile, topN = 10, json = false } = options;

  const resolved = path.resolve(lockFile);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Lock file not found: ${resolved}`);
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  const parsed = parsePackageLock(content);
  const deps = parsed.dependencies;

  const transitiveCounts = new Map<string, number>();
  for (const name of deps.keys()) {
    const flat = flattenTransitiveDeps(name, deps as any);
    transitiveCounts.set(name, flat.size);
  }

  const report = buildBloatReport(deps as any, transitiveCounts);
  const trimmed = { ...report, entries: report.entries.slice(0, topN) };

  if (json) {
    return formatAsJson(trimmed);
  }

  return formatBloatReportText(trimmed);
}

export const bloatCommandDescription =
  'Analyze dependency bloat by counting direct and transitive sub-dependencies per package.';
