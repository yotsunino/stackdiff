import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { diffLicenses, formatLicenseReportText, isRestrictiveLicense } from '../diff/license-checker';

export type LicenseCommandOptions = {
  base: string;
  head: string;
  format?: 'text' | 'json';
  failOnRestrictive?: boolean;
};

export async function runLicenseCommand(options: LicenseCommandOptions): Promise<number> {
  const basePath = path.resolve(options.base);
  const headPath = path.resolve(options.head);

  if (!fs.existsSync(basePath)) {
    console.error(`Error: base lock file not found: ${basePath}`);
    return 1;
  }
  if (!fs.existsSync(headPath)) {
    console.error(`Error: head lock file not found: ${headPath}`);
    return 1;
  }

  const baseContent = fs.readFileSync(basePath, 'utf-8');
  const headContent = fs.readFileSync(headPath, 'utf-8');

  const baseDeps = parsePackageLock(baseContent);
  const headDeps = parsePackageLock(headContent);

  const report = diffLicenses(baseDeps, headDeps);

  if (options.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatLicenseReportText(report));
  }

  if (options.failOnRestrictive) {
    const hasRestrictiveAdded = report.added.some(a => isRestrictiveLicense(a.license));
    const hasRestrictiveChanged = report.changed.some(c => isRestrictiveLicense(c.toLicense));
    if (hasRestrictiveAdded || hasRestrictiveChanged) {
      console.error('\nFailed: restrictive license(s) introduced.');
      return 1;
    }
  }

  return 0;
}

export const licenseCommandDescription =
  'Compare licenses across two package-lock.json files and flag restrictive changes';
