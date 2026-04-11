import { DependencyMap } from '../parser';

export type LicenseEntry = {
  name: string;
  version: string;
  license: string | null;
};

export type LicenseChange = {
  name: string;
  fromVersion: string;
  toVersion: string;
  fromLicense: string | null;
  toLicense: string | null;
};

export type LicenseReport = {
  added: LicenseEntry[];
  removed: LicenseEntry[];
  changed: LicenseChange[];
};

const COPYLEFT_LICENSES = new Set(['GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'AGPL-3.0']);

export function isRestrictiveLicense(license: string | null): boolean {
  if (!license) return false;
  return COPYLEFT_LICENSES.has(license.trim());
}

export function diffLicenses(
  base: DependencyMap,
  head: DependencyMap
): LicenseReport {
  const added: LicenseEntry[] = [];
  const removed: LicenseEntry[] = [];
  const changed: LicenseChange[] = [];

  for (const [name, headDep] of Object.entries(head)) {
    const baseDep = base[name];
    const headLicense = headDep.license ?? null;

    if (!baseDep) {
      added.push({ name, version: headDep.version, license: headLicense });
    } else {
      const baseLicense = baseDep.license ?? null;
      if (baseLicense !== headLicense) {
        changed.push({
          name,
          fromVersion: baseDep.version,
          toVersion: headDep.version,
          fromLicense: baseLicense,
          toLicense: headLicense,
        });
      }
    }
  }

  for (const [name, baseDep] of Object.entries(base)) {
    if (!head[name]) {
      removed.push({ name, version: baseDep.version, license: baseDep.license ?? null });
    }
  }

  return { added, removed, changed };
}

export function formatLicenseReportText(report: LicenseReport): string {
  const lines: string[] = ['License Changes:'];

  if (report.changed.length > 0) {
    lines.push('\n  Changed:');
    for (const c of report.changed) {
      const warn = isRestrictiveLicense(c.toLicense) ? ' ⚠ RESTRICTIVE' : '';
      lines.push(`    ${c.name}: ${c.fromLicense ?? 'unknown'} → ${c.toLicense ?? 'unknown'}${warn}`);
    }
  }

  if (report.added.length > 0) {
    lines.push('\n  Added:');
    for (const a of report.added) {
      const warn = isRestrictiveLicense(a.license) ? ' ⚠ RESTRICTIVE' : '';
      lines.push(`    ${a.name}@${a.version}: ${a.license ?? 'unknown'}${warn}`);
    }
  }

  if (report.removed.length > 0) {
    lines.push('\n  Removed:');
    for (const r of report.removed) {
      lines.push(`    ${r.name}@${r.version}: ${r.license ?? 'unknown'}`);
    }
  }

  if (report.added.length === 0 && report.removed.length === 0 && report.changed.length === 0) {
    lines.push('  No license changes detected.');
  }

  return lines.join('\n');
}
