import {
  diffLicenses,
  isRestrictiveLicense,
  formatLicenseReportText,
  LicenseReport,
} from '../license-checker';
import { DependencyMap } from '../../parser';

function makeDepMap(entries: Record<string, { version: string; license?: string }>): DependencyMap {
  const map: DependencyMap = {};
  for (const [name, val] of Object.entries(entries)) {
    map[name] = { version: val.version, resolved: '', integrity: '', license: val.license };
  }
  return map;
}

describe('isRestrictiveLicense', () => {
  it('returns true for GPL-2.0', () => {
    expect(isRestrictiveLicense('GPL-2.0')).toBe(true);
  });

  it('returns true for AGPL-3.0', () => {
    expect(isRestrictiveLicense('AGPL-3.0')).toBe(true);
  });

  it('returns false for MIT', () => {
    expect(isRestrictiveLicense('MIT')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isRestrictiveLicense(null)).toBe(false);
  });
});

describe('diffLicenses', () => {
  it('detects added packages', () => {
    const base = makeDepMap({});
    const head = makeDepMap({ lodash: { version: '4.0.0', license: 'MIT' } });
    const report = diffLicenses(base, head);
    expect(report.added).toHaveLength(1);
    expect(report.added[0]).toMatchObject({ name: 'lodash', license: 'MIT' });
  });

  it('detects removed packages', () => {
    const base = makeDepMap({ lodash: { version: '4.0.0', license: 'MIT' } });
    const head = makeDepMap({});
    const report = diffLicenses(base, head);
    expect(report.removed).toHaveLength(1);
    expect(report.removed[0].name).toBe('lodash');
  });

  it('detects license changes', () => {
    const base = makeDepMap({ react: { version: '17.0.0', license: 'MIT' } });
    const head = makeDepMap({ react: { version: '18.0.0', license: 'Apache-2.0' } });
    const report = diffLicenses(base, head);
    expect(report.changed).toHaveLength(1);
    expect(report.changed[0]).toMatchObject({
      name: 'react',
      fromLicense: 'MIT',
      toLicense: 'Apache-2.0',
    });
  });

  it('returns empty report when no changes', () => {
    const base = makeDepMap({ lodash: { version: '4.0.0', license: 'MIT' } });
    const head = makeDepMap({ lodash: { version: '4.0.0', license: 'MIT' } });
    const report = diffLicenses(base, head);
    expect(report.added).toHaveLength(0);
    expect(report.removed).toHaveLength(0);
    expect(report.changed).toHaveLength(0);
  });
});

describe('formatLicenseReportText', () => {
  it('formats a report with changes', () => {
    const report: LicenseReport = {
      added: [{ name: 'pkg-a', version: '1.0.0', license: 'GPL-3.0' }],
      removed: [],
      changed: [{ name: 'pkg-b', fromVersion: '1.0.0', toVersion: '2.0.0', fromLicense: 'MIT', toLicense: 'AGPL-3.0' }],
    };
    const text = formatLicenseReportText(report);
    expect(text).toContain('RESTRICTIVE');
    expect(text).toContain('pkg-a');
    expect(text).toContain('pkg-b');
    expect(text).toContain('MIT → AGPL-3.0');
  });

  it('shows no changes message when empty', () => {
    const report: LicenseReport = { added: [], removed: [], changed: [] };
    const text = formatLicenseReportText(report);
    expect(text).toContain('No license changes detected.');
  });
});
