import * as fs from 'fs';
import { parsePackageLock } from '../parser';
import { buildVisibilityReport, formatVisibilityReportText } from '../diff/dependency-visibility';
import { formatAsJson } from '../output';

export interface VisibilityCommandOptions {
  lockFile: string;
  json?: boolean;
  scopeFilter?: string;
}

export async function runVisibilityCommand(
  options: VisibilityCommandOptions
): Promise<string> {
  const { lockFile, json, scopeFilter } = options;

  if (!fs.existsSync(lockFile)) {
    throw new Error(`Lock file not found: ${lockFile}`);
  }

  const content = fs.readFileSync(lockFile, 'utf-8');
  const parsed = parsePackageLock(content);

  let deps = parsed.dependencies;

  if (scopeFilter) {
    const filtered = new Map<string, string>();
    for (const [name, version] of deps.entries()) {
      if (name.startsWith(scopeFilter)) {
        filtered.set(name, version);
      }
    }
    deps = filtered;
  }

  const report = buildVisibilityReport(deps);

  if (json) {
    return formatAsJson({
      publicCount: report.publicCount,
      privateCount: report.privateCount,
      scopedCount: report.scopedCount,
      unknownCount: report.unknownCount,
      entries: report.entries,
    });
  }

  return formatVisibilityReportText(report);
}
