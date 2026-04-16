import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { buildTrustReport, formatTrustReportText, TrustEntry } from '../diff/dependency-trust';

function depMapToTrustEntries(deps: Map<string, string>): TrustEntry[] {
  return Array.from(deps.entries()).map(([name, version]) => ({ name, version }));
}

export async function runTrustCommand(options: {
  lockFile: string;
  format?: 'text' | 'json';
  threshold?: 'high' | 'medium' | 'low';
}): Promise<void> {
  const { lockFile, format = 'text', threshold } = options;

  if (!fs.existsSync(lockFile)) {
    console.error(`Lock file not found: ${lockFile}`);
    process.exit(1);
  }

  const content = fs.readFileSync(lockFile, 'utf8');
  const parsed = parsePackageLock(content);
  const entries = depMapToTrustEntries(parsed.dependencies);
  const report = buildTrustReport(entries);

  const filtered = threshold
    ? {
        ...report,
        entries: report.entries.filter(e => {
          const order = ['unknown', 'low', 'medium', 'high'];
          return order.indexOf(e.trustLevel) <= order.indexOf(threshold);
        }),
      }
    : report;

  if (format === 'json') {
    console.log(JSON.stringify(filtered, null, 2));
  } else {
    console.log(formatTrustReportText(filtered));
  }

  if (filtered.lowTrustCount > 0) {
    process.exit(1);
  }
}
