import { changeDepth, classifyVolatility, buildVolatilityReport, formatVolatilityReportText } from './dependency-volatility';

function makeDepMap(entries: Array<{ name: string; version: string; deps?: Record<string, string> }>) {
  const map = new Map<string, { version: string; dependencies?: Record<string, string> }>();
  for (const e of entries) {
    map.set(e.name, { version: e.version, dependencies: e.deps });
  }
  return map;
}

describe('changeDepth', () => {
  it('returns 0 for identical versions', () => {
    expect(changeDepth('1.2.3', '1.2.3')).toBe(0);
  });

  it('returns 1 for patch change', () => {
    expect(changeDepth('1.2.3', '1.2.4')).toBe(1);
  });

  it('returns 2 for minor change', () => {
    expect(changeDepth('1.2.3', '1.3.0')).toBe(2);
  });

  it('returns 3 for major change', () => {
    expect(changeDepth('1.2.3', '2.0.0')).toBe(3);
  });
});

describe('classifyVolatility', () => {
  it('classifies stable when score is low', () => {
    expect(classifyVolatility(0)).toBe('stable');
    expect(classifyVolatility(5)).toBe('stable');
  });

  it('classifies moderate when score is mid-range', () => {
    expect(classifyVolatility(15)).toBe('moderate');
  });

  it('classifies volatile when score is high', () => {
    expect(classifyVolatility(35)).toBe('volatile');
  });

  it('classifies highly-volatile when score is very high', () => {
    expect(classifyVolatility(60)).toBe('highly-volatile');
  });
});

describe('buildVolatilityReport', () => {
  it('returns empty report for identical maps', () => {
    const base = makeDepMap([{ name: 'lodash', version: '4.17.21' }]);
    const head = makeDepMap([{ name: 'lodash', version: '4.17.21' }]);
    const report = buildVolatilityReport(base, head);
    expect(report.entries).toHaveLength(0);
  });

  it('detects a volatile package with major bump', () => {
    const base = makeDepMap([{ name: 'react', version: '16.0.0' }]);
    const head = makeDepMap([{ name: 'react', version: '18.2.0' }]);
    const report = buildVolatilityReport(base, head);
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0].name).toBe('react');
    expect(report.entries[0].volatility).toBe('volatile');
  });

  it('ignores added packages with no base', () => {
    const base = makeDepMap([]);
    const head = makeDepMap([{ name: 'axios', version: '1.0.0' }]);
    const report = buildVolatilityReport(base, head);
    expect(report.entries).toHaveLength(0);
  });
});

describe('formatVolatilityReportText', () => {
  it('returns no-changes message for empty report', () => {
    const text = formatVolatilityReportText({ entries: [], totalScore: 0, overall: 'stable' });
    expect(text).toContain('No volatility');
  });

  it('includes package name and volatility label', () => {
    const report = {
      entries: [{ name: 'react', from: '16.0.0', to: '18.2.0', score: 30, volatility: 'volatile' as const }],
      totalScore: 30,
      overall: 'volatile' as const,
    };
    const text = formatVolatilityReportText(report);
    expect(text).toContain('react');
    expect(text).toContain('volatile');
  });
});
