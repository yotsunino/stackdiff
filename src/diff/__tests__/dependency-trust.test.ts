import { scoreTrust, buildTrustReport, formatTrustReportText, TrustEntry } from '../dependency-trust';

function makeEntry(overrides: Partial<TrustEntry> = {}): TrustEntry {
  return { name: 'pkg', version: '1.0.0', ...overrides };
}

describe('scoreTrust', () => {
  it('returns unknown when no signals provided', () => {
    const result = scoreTrust(makeEntry());
    expect(result.trustLevel).toBe('unknown');
    expect(result.score).toBe(0);
  });

  it('scores high for popular well-maintained package', () => {
    const result = scoreTrust(makeEntry({
      downloadsPerWeek: 500_000,
      maintainerCount: 5,
      hasTypes: true,
      publishedAt: new Date(Date.now() - 200 * 86_400_000).toISOString(),
    }));
    expect(result.trustLevel).toBe('high');
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('scores low for rarely downloaded single-maintainer package', () => {
    const result = scoreTrust(makeEntry({
      downloadsPerWeek: 500,
      maintainerCount: 1,
    }));
    expect(result.trustLevel).toBe('low');
  });

  it('includes types bonus in reasons', () => {
    const result = scoreTrust(makeEntry({ hasTypes: true, downloadsPerWeek: 50_000 }));
    expect(result.reasons).toContain('ships TypeScript types');
  });

  it('gives established release bonus for old publish date', () => {
    const result = scoreTrust(makeEntry({
      publishedAt: new Date(Date.now() - 365 * 86_400_000).toISOString(),
    }));
    expect(result.reasons).toContain('established release');
  });
});

describe('buildTrustReport', () => {
  it('computes average score and low trust count', () => {
    const entries: TrustEntry[] = [
      makeEntry({ name: 'a', downloadsPerWeek: 200_000, maintainerCount: 4, hasTypes: true }),
      makeEntry({ name: 'b', downloadsPerWeek: 100 }),
    ];
    const report = buildTrustReport(entries);
    expect(report.entries).toHaveLength(2);
    expect(report.lowTrustCount).toBeGreaterThanOrEqual(1);
    expect(report.averageScore).toBeGreaterThan(0);
  });

  it('returns zero averageScore for empty list', () => {
    const report = buildTrustReport([]);
    expect(report.averageScore).toBe(0);
    expect(report.lowTrustCount).toBe(0);
  });
});

describe('formatTrustReportText', () => {
  it('includes header and package lines', () => {
    const report = buildTrustReport([makeEntry({ name: 'foo', downloadsPerWeek: 5_000, maintainerCount: 1 })]);
    const text = formatTrustReportText(report);
    expect(text).toContain('Dependency Trust Report');
    expect(text).toContain('foo@1.0.0');
    expect(text).toContain('Average score:');
  });
});
