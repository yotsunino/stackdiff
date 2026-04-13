import {
  classifyMaturity,
  scoreMaturity,
  buildMaturityReport,
  formatMaturityReportText,
  DepMap,
} from '../dependency-maturity';

function makeDepMap(entries: Record<string, string>): DepMap {
  return new Map(Object.entries(entries).map(([name, version]) => [name, { version }]));
}

describe('classifyMaturity', () => {
  it('returns stable for normal versions', () => {
    expect(classifyMaturity('1.2.3')).toBe('stable');
  });

  it('detects alpha', () => {
    expect(classifyMaturity('1.0.0-alpha.1')).toBe('alpha');
  });

  it('detects beta', () => {
    expect(classifyMaturity('2.0.0-beta.3')).toBe('beta');
  });

  it('detects rc', () => {
    expect(classifyMaturity('3.0.0-rc.1')).toBe('rc');
  });

  it('detects experimental/canary', () => {
    expect(classifyMaturity('0.0.1-canary.5')).toBe('experimental');
  });
});

describe('scoreMaturity', () => {
  it('gives 100 for stable major >= 1', () => {
    expect(scoreMaturity('stable', 1)).toBe(100);
  });

  it('penalizes major version 0', () => {
    expect(scoreMaturity('stable', 0)).toBe(80);
  });

  it('scores rc lower than stable', () => {
    expect(scoreMaturity('rc', 1)).toBe(70);
  });

  it('scores alpha the lowest non-experimental', () => {
    expect(scoreMaturity('alpha', 1)).toBe(30);
  });
});

describe('buildMaturityReport', () => {
  it('builds a report with correct counts', () => {
    const deps = makeDepMap({
      react: '18.2.0',
      lodash: '0.9.0',
      mylib: '1.0.0-beta.1',
    });
    const report = buildMaturityReport(deps);
    expect(report.entries).toHaveLength(3);
    expect(report.unstableCount).toBe(1); // lodash 0.x
    expect(report.preReleaseCount).toBe(2); // lodash (0.x) + mylib (beta)
  });

  it('returns averageScore of 100 for empty map', () => {
    const report = buildMaturityReport(new Map());
    expect(report.averageScore).toBe(100);
  });

  it('sorts entries by score ascending', () => {
    const deps = makeDepMap({ a: '1.0.0', b: '1.0.0-alpha.1' });
    const report = buildMaturityReport(deps);
    expect(report.entries[0].maturityLevel).toBe('alpha');
    expect(report.entries[1].maturityLevel).toBe('stable');
  });
});

describe('formatMaturityReportText', () => {
  it('includes header and score', () => {
    const deps = makeDepMap({ express: '4.18.2' });
    const report = buildMaturityReport(deps);
    const text = formatMaturityReportText(report);
    expect(text).toContain('Dependency Maturity Report');
    expect(text).toContain('Average Score: 100');
    expect(text).toContain('express@4.18.2');
  });

  it('adds warning flag for pre-release entries', () => {
    const deps = makeDepMap({ unstable: '1.0.0-beta.2' });
    const report = buildMaturityReport(deps);
    const text = formatMaturityReportText(report);
    expect(text).toContain('⚠');
  });
});
