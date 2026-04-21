import * as fs from 'fs';
import { parsePackageLock } from '../parser';
import { buildScopeReport, formatScopeReportText, DepMap } from '../diff/dependency-scope';
import { formatAsJson } from '../output';

export interface ScopeCommandOptions {
  lockFile: string;
  json?: boolean;
  scope?: string;
}

function buildDepMap(parsed: ReturnType<typeof parsePackageLock>): DepMap {
  const map: DepMap = new Map();
  for (const [name, meta] of Object.entries(parsed.dependencies ?? {})) {
    map.set(name, {
      version: (meta as any).version ?? '0.0.0',
      scope: (meta as any).dev ? 'development' : 'production',
      transitive: (meta as any).transitive ?? false,
    });
  }
  return map;
}

export function runScopeCommand(options: ScopeCommandOptions): string {
  if (!fs.existsSync(options.lockFile)) {
    throw new Error(`Lock file not found: ${options.lockFile}`);
  }

  const content = fs.readFileSync(options.lockFile, 'utf-8');
  const parsed = parsePackageLock(content);
  let depMap = buildDepMap(parsed);

  if (options.scope) {
    const target = options.scope.toLowerCase();
    depMap = new Map(
      [...depMap.entries()].filter(([, meta]) => (meta.scope ?? 'unknown') === target)
    );
  }

  const report = buildScopeReport(depMap);

  if (options.json) {
    return formatAsJson({ scope: report.totals, entries: report.entries });
  }

  return formatScopeReportText(report);
}
