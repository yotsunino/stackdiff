import { detectDrift, formatDriftReportText } from '../drift-detector';

function makeDepMap(entries: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(entries));
}

describe('detectDrift', () => {
  it('returns empty report when maps are identical', () => {
    const base = makeDepMap({ react: '17.0.0', lodash: '4.17.21' });
    const head = makeDepMap({ react: '17.0.0', lodash: '4.17.21' });
    const report = detectDrift(base, head);
    expect(report.totalDrifted).toBe(0);
    expect(report.entries).toHaveLength(0);
  });

  it('detects a major version bump as high severity', () => {
    const base = makeDepMap({ react: '17.0.0' });
    const head = makeDepMap({ react: '18.0.0' });
    const report = detectDrift(base, head);
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0].severity).toBe('high');
    expect(report.highSeverityCount).toBe(1);
  });

  it('detects minor version drift as medium when 5+ minors apart', () => {
    const base = makeDepMap({ axios: '0.21.0' });
    const head = makeDepMap({ axios: '0.27.0' });
    const report = detectDrift(base, head);
    expect(report.entries[0].severity).toBe('medium');
  });

  it('classifies small patch/minor drift as low', () => {
    const base = makeDepMap({ lodash: '4.17.20' });
    const head = makeDepMap({ lodash: '4.17.21' });
    const report = detectDrift(base, head);
    expect(report.entries[0].severity).toBe('low');
  });

  it('ignores packages only in base (removed packages)', () => {
    const base = makeDepMap({ react: '17.0.0', removed: '1.0.0' });
    const head = makeDepMap({ react: '17.0.0' });
    const report = detectDrift(base, head);
    expect(report.totalDrifted).toBe(0);
  });

  it('counts multiple high severity entries correctly', () => {
    const base = makeDepMap({ a: '1.0.0', b: '2.0.0' });
    const head = makeDepMap({ a: '2.0.0', b: '3.0.0' });
    const report = detectDrift(base, head);
    expect(report.highSeverityCount).toBe(2);
  });
});

describe('formatDriftReportText', () => {
  it('returns no-drift message when entries are empty', () => {
    const result = formatDriftReportText({ entries: [], totalDrifted: 0, highSeverityCount: 0 });
    expect(result).toBe('No version drift detected.');
  });

  it('includes package name and versions in output', () => {
    const report = detectDrift(
      new Map([['react', '17.0.0']]),
      new Map([['react', '18.0.0']])
    );
    const text = formatDriftReportText(report);
    expect(text).toContain('react');
    expect(text).toContain('17.0.0');
    expect(text).toContain('18.0.0');
    expect(text).toContain('[HIGH]');
  });

  it('shows summary line with counts', () => {
    const report = detectDrift(
      new Map([['a', '1.0.0']]),
      new Map([['a', '2.0.0']])
    );
    const text = formatDriftReportText(report);
    expect(text).toContain('1 changed');
    expect(text).toContain('1 high severity');
  });
});
