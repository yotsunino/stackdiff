import {
  buildCohesionReport,
  computeCohesionScore,
  formatCohesionReportText,
  DepMap,
} from '../dependency-cohesion';

function makeDepMap(entries: Array<[string, { version: string; scope?: string; dependencies?: Record<string, string> }]>): DepMap {
  return new Map(entries);
}

describe('computeCohesionScore', () => {
  it('returns 0 when totalPackages is 0', () => {
    expect(computeCohesionScore(3, 0)).toBe(0);
  });

  it('returns 100 when all packages are shared', () => {
    expect(computeCohesionScore(10, 10)).toBe(100);
  });

  it('returns proportional score', () => {
    expect(computeCohesionScore(5, 10)).toBe(50);
  });
});

describe('buildCohesionReport', () => {
  it('builds report with no dependencies', () => {
    const base = makeDepMap([]);
    const head = makeDepMap([
      ['lodash', { version: '4.17.21', scope: 'production' }],
      ['react', { version: '18.0.0', scope: 'production' }],
    ]);
    const report = buildCohesionReport(base, head);
    expect(report.totalPackages).toBe(2);
    expect(report.entries.every((e) => e.sharedWith.length === 0)).toBe(true);
  });

  it('detects shared dependencies', () => {
    const base = makeDepMap([]);
    const head = makeDepMap([
      ['a', { version: '1.0.0', dependencies: { b: '2.0.0' } }],
      ['b', { version: '2.0.0' }],
    ]);
    const report = buildCohesionReport(base, head);
    const entry = report.entries.find((e) => e.name === 'a');
    expect(entry?.sharedWith).toContain('b');
    expect(entry?.cohesionScore).toBeGreaterThan(0);
  });

  it('counts high and low cohesion correctly', () => {
    const base = makeDepMap([]);
    const head = makeDepMap([
      ['a', { version: '1.0.0', dependencies: { b: '1.0.0', c: '1.0.0', d: '1.0.0' } }],
      ['b', { version: '1.0.0' }],
      ['c', { version: '1.0.0' }],
      ['d', { version: '1.0.0' }],
    ]);
    const report = buildCohesionReport(base, head);
    expect(report.highCohesionCount).toBeGreaterThanOrEqual(1);
    expect(report.averageScore).toBeGreaterThan(0);
  });

  it('returns empty report for empty head', () => {
    const base = makeDepMap([]);
    const head = makeDepMap([]);
    const report = buildCohesionReport(base, head);
    expect(report.totalPackages).toBe(0);
    expect(report.averageScore).toBe(0);
  });
});

describe('formatCohesionReportText', () => {
  it('includes header and stats', () => {
    const base = makeDepMap([]);
    const head = makeDepMap([['lodash', { version: '4.17.21' }]]);
    const report = buildCohesionReport(base, head);
    const text = formatCohesionReportText(report);
    expect(text).toContain('Dependency Cohesion Report');
    expect(text).toContain('Total Packages');
    expect(text).toContain('lodash@4.17.21');
  });

  it('shows shared=none when no shared deps', () => {
    const base = makeDepMap([]);
    const head = makeDepMap([['express', { version: '4.18.0' }]]);
    const report = buildCohesionReport(base, head);
    const text = formatCohesionReportText(report);
    expect(text).toContain('shared=[none]');
  });
});
