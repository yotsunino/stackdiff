import * as fs from 'fs';
import { parsePackageLock } from '../parser';
import { buildRiskReport, formatRiskReportText, RiskLevel } from '../diff/dependency-risk';
import { formatAsJson } from '../output';

const RISK_ORDER: RiskLevel[] = ['critical', 'high', 'medium', 'low', 'none'];

export function filterByRiskThreshold(entries: ReturnType<typeof buildRiskReport>['entries'], threshold: RiskLevel) {
  const minIndex = RISK_ORDER.indexOf(threshold);
  return entries.filter(e => RISK_ORDER.indexOf(e.riskLevel) <= minIndex);
}

export async function runRiskCommand(options: {
  lockFile: string;
  threshold?: RiskLevel;
  format?: 'text' | 'json';
  output?: string;
}): Promise<void> {
  const { lockFile, threshold = 'low', format = 'text', output } = options;

  if (!fs.existsSync(lockFile)) {
    console.error(`Error: lock file not found: ${lockFile}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(lockFile, 'utf-8');
  const deps = parsePackageLock(raw);
  const report = buildRiskReport(deps);

  const filtered = {
    ...report,
    entries: filterByRiskThreshold(report.entries, threshold),
  };

  let result: string;
  if (format === 'json') {
    result = formatAsJson(filtered);
  } else {
    result = formatRiskReportText(filtered);
  }

  if (output) {
    fs.writeFileSync(output, result, 'utf-8');
    console.log(`Risk report written to ${output}`);
  } else {
    console.log(result);
  }

  const hasCritical = filtered.entries.some(e => e.riskLevel === 'critical');
  if (hasCritical) process.exit(1);
}
