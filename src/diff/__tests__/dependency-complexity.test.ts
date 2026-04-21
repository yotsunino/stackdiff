import {
  buildComplexityReport,
  classifyComplexity,
  computeComplexityScore,
  formatComplexityReportText,
  DepMap,
} from '../dependency-complexity';

function makeDepMap(entries: Array<[string, { version: string; requires?: Record<string, string>; dependencies?: Record<string, { version: string }> }]>): DepMap {
  return new Map(entries);
}

describe('computeComplexityScore', () => {
  it('returns zero for a leaf dependency', () => {
    expect(computeComplexityScore(0, 0, 0)).toBe(0);
  });

  it('weights transitive deps at 0.5', () => {
    expect(computeComplexityScore(0, 10, 0)).toBe(5);
  });

  it('weights depth at 2', () => {
    expect(computeComplexityScore(0, 0, 5)).toBe(10);
  });

  it('combines all factors', () => {
    expect(computeComplexityScore(4, 10, 3)).toBe(4 + 5 + 6);
  });
});

describe('classifyComplexity', () => {
  it('returns low for score < 10', () => expect(classifyComplexity(5)).toBe('low'));
  it('returns medium for score 10–24', () => expect(classifyComplexity(15)).toBe('medium'));
  it('returns high for score 25–49', () => expect(classifyComplexity(30)).toBe('high'));
  it('returns critical for score >= 50', () => expect(classifyComplexity(50)).toBe('critical'));
});

describe('buildComplexityReport', () => {
  it('returns empty report for empty map', () => {
    const report = buildComplexityReport(makeDepMap([]));
    expect(report.entries).toHaveLength(0);
    expect(report.totalScore).toBe(0);
    expect(report.averageScore).toBe(0);
    expect(report.highComplexityCount).toBe(0);
  });

  it('computes scores for each entry', () => {
    const map = makeDepMap([
      ['lodash', { version: '4.17.21', requires: { a: '1', b: '2' } }],
      ['react', { version: '18.0.0', requires: { a: '1' }, dependencies: { x: { version: '1.0.0' }, y: { version: '2.0.0' } } }],
    ]);
    const report = buildComplexityReport(map);
    expect(report.entries).toHaveLength(2);
    const lodash = report.entries.find(e => e.name === 'lodash')!;
    expect(lodash.directDeps).toBe(2);
    expect(lodash.transitiveDeps).toBe(0);
  });

  it('sorts entries by score descending', () => {
    const map = makeDepMap([
      ['simple', { version: '1.0.0' }],
      ['complex', { version: '2.0.0', requires: { a: '1', b: '2', c: '3' }, dependencies: { x: { version: '1.0.0' }, y: { version: '1.0.0' }, z: { version: '1.0.0' } } }],
    ]);
    const report = buildComplexityReport(map);
    expect(report.entries[0].name).toBe('complex');
  });

  it('counts high and critical entries', () => {
    const map = makeDepMap([
      ['big', { version: '1.0.0', requires: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`dep${i}`, '1.0.0'])) }],
      ['small', { version: '1.0.0' }],
    ]);
    const report = buildComplexityReport(map);
    expect(report.highComplexityCount).toBeGreaterThanOrEqual(1);
  });
});

describe('formatComplexityReportText', () => {
  it('returns a no-deps message for empty report', () => {
    const report = buildComplexityReport(makeDepMap([]));
    expect(formatComplexityReportText(report)).toContain('No dependencies');
  });

  it('includes package name and grade in output', () => {
    const map = makeDepMap([['express', { version: '4.18.0', requires: { a: '1' } }]]);
    const report = buildComplexityReport(map);
    const text = formatComplexityReportText(report);
    expect(text).toContain('express@4.18.0');
    expect(text).toContain('score=');
  });
});
