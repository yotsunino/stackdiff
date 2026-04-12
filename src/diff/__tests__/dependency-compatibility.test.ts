import {
  checkCompatibility,
  buildCompatibilityReport,
  formatCompatibilityReportText,
  DepMap,
} from '../dependency-compatibility';

function makeDepMap(entries: Record<string, string>): DepMap {
  return new Map(Object.entries(entries).map(([k, v]) => [k, { version: v }]));
}

describe('checkCompatibility', () => {
  it('returns empty when no shared packages changed', () => {
    const base = makeDepMap({ lodash: '4.17.20' });
    const head = makeDepMap({ lodash: '4.17.20' });
    expect(checkCompatibility(base, head)).toHaveLength(0);
  });

  it('marks major bump as incompatible', () => {
    const base = makeDepMap({ react: '17.0.2' });
    const head = makeDepMap({ react: '18.0.0' });
    const result = checkCompatibility(base, head);
    expect(result).toHaveLength(1);
    expect(result[0].compatible).toBe(false);
    expect(result[0].reason).toMatch(/major version change/);
  });

  it('marks minor bump as compatible', () => {
    const base = makeDepMap({ axios: '1.2.0' });
    const head = makeDepMap({ axios: '1.3.0' });
    const result = checkCompatibility(base, head);
    expect(result).toHaveLength(1);
    expect(result[0].compatible).toBe(true);
  });

  it('marks patch bump as compatible', () => {
    const base = makeDepMap({ axios: '1.2.0' });
    const head = makeDepMap({ axios: '1.2.5' });
    const result = checkCompatibility(base, head);
    expect(result[0].compatible).toBe(true);
    expect(result[0].reason).toBe('patch or minor bump');
  });

  it('marks minor downgrade as incompatible', () => {
    const base = makeDepMap({ express: '4.18.0' });
    const head = makeDepMap({ express: '4.17.0' });
    const result = checkCompatibility(base, head);
    expect(result[0].compatible).toBe(false);
    expect(result[0].reason).toMatch(/minor downgrade/);
  });

  it('marks patch downgrade as incompatible', () => {
    const base = makeDepMap({ chalk: '5.1.2' });
    const head = makeDepMap({ chalk: '5.1.0' });
    const result = checkCompatibility(base, head);
    expect(result[0].compatible).toBe(false);
    expect(result[0].reason).toMatch(/patch downgrade/);
  });

  it('skips packages only in head', () => {
    const base = makeDepMap({});
    const head = makeDepMap({ newpkg: '1.0.0' });
    expect(checkCompatibility(base, head)).toHaveLength(0);
  });
});

describe('buildCompatibilityReport', () => {
  it('groups entries correctly', () => {
    const entries = [
      { name: 'a', fromVersion: '1.0.0', toVersion: '2.0.0', compatible: false, reason: 'major' },
      { name: 'b', fromVersion: '1.0.0', toVersion: '1.1.0', compatible: true, reason: 'minor bump' },
    ];
    const report = buildCompatibilityReport(entries);
    expect(report.total).toBe(2);
    expect(report.compatible).toHaveLength(1);
    expect(report.incompatible).toHaveLength(1);
  });
});

describe('formatCompatibilityReportText', () => {
  it('includes summary counts', () => {
    const report = buildCompatibilityReport([
      { name: 'react', fromVersion: '17.0.0', toVersion: '18.0.0', compatible: false, reason: 'major version change: 17 → 18' },
    ]);
    const text = formatCompatibilityReportText(report);
    expect(text).toContain('Incompatible: 1');
    expect(text).toContain('react: 17.0.0 → 18.0.0');
  });

  it('omits incompatible block when none exist', () => {
    const report = buildCompatibilityReport([
      { name: 'lodash', fromVersion: '4.17.20', toVersion: '4.17.21', compatible: true, reason: 'patch or minor bump' },
    ]);
    const text = formatCompatibilityReportText(report);
    expect(text).not.toContain('Incompatible changes:');
  });
});
