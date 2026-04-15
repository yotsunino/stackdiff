import * as path from 'path';
import * as fs from 'fs';
import { parsePackageLock } from '../parser';
import { buildVolatilityReport, formatVolatilityReportText } from '../diff/dependency-volatility';

export interface VolatilityCommandOptions {
  base: string;
  head: string;
  format?: 'text' | 'json';
  threshold?: 'stable' | 'moderate' | 'volatile' | 'highly-volatile';
}

const SEVERITY_ORDER = ['stable', 'moderate', 'volatile', 'highly-volatile'];

export function meetsVolatilityThreshold(
  volatility: string,
  threshold: string
): boolean {
  return SEVERITY_ORDER.indexOf(volatility) >= SEVERITY_ORDER.indexOf(threshold);
}

export async function runVolatilityCommand(options: VolatilityCommandOptions): Promise<void> {
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

  const baseDeps = parsePackageLock(baseContent);
  const headDeps = parsePackageLock(headContent);

  const report = buildVolatilityReport(baseDeps, headDeps);

  const threshold = options.threshold ?? 'stable';
  const filtered = {
    ...report,
    entries: report.entries.filter(e => meetsVolatilityThreshold(e.volatility, threshold)),
  };

  if (options.format === 'json') {
    console.log(JSON.stringify(filtered, null, 2));
  } else {
    console.log(formatVolatilityReportText(filtered));
  }

  const hasHighSeverity = filtered.entries.some(e =>
    meetsVolatilityThreshold(e.volatility, 'volatile')
  );
  if (hasHighSeverity) {
    process.exitCode = 1;
  }
}
