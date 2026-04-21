import {
  buildSurfaceReport,
  formatSurfaceReportText,
  DepMap,
} from '../dependency-surface';

function makeDepMap(entries: Array<[string, string, boolean?]>): DepMap {
  const m: DepMap = new Map();
  for (const [name, version, direct] of entries) {
    m.set(name, { version, direct });
  }
  return m;
}

describe('buildSurfaceReport', () => {
  it('counts direct and transitive packages in head', () => {
    const base = makeDepMap([]);
    const head = makeDepMap([
      ['react', '18.0.0', true],
      ['lodash', '4.17.21', false],
      ['tslib', '2.6.0', false],
    ]);
    const report = buildSurfaceReport(base, head);
    expect(report.totalDirect).toBe(1);
    expect(report.totalTransitive).toBe(2);
  });

  it('computes surface score as direct + 25% of transitive', () => {
    const base = makeDepMap([]);
    const head = makeDepMap([
      ['a', '1.0.0', true],
      ['b', '1.0.0', true],
      ['c', '1.0.0', false],
      ['d', '1.0.0', false],
      ['e', '1.0.0', false],
      ['f', '1.0.0', false],
    ]);
    const report = buildSurfaceReport(base, head);
    // 2 direct + round(4 * 0.25) = 2 + 1 = 3
    expect(report.surfaceScore).toBe(3);
  });

  it('detects added packages', () => {
    const base = makeDepMap([['react', '17.0.0', true]]);
    const head = makeDepMap([
      ['react', '18.0.0', true],
      ['react-dom', '18.0.0', true],
    ]);
    const report = buildSurfaceReport(base, head);
    expect(report.added).toHaveLength(1);
    expect(report.added[0].name).toBe('react-dom');
  });

  it('detects removed packages', () => {
    const base = makeDepMap([
      ['react', '17.0.0', true],
      ['moment', '2.29.0', false],
    ]);
    const head = makeDepMap([['react', '18.0.0', true]]);
    const report = buildSurfaceReport(base, head);
    expect(report.removed).toHaveLength(1);
    expect(report.removed[0].name).toBe('moment');
  });

  it('places unchanged packages correctly', () => {
    const base = makeDepMap([['lodash', '4.17.21', false]]);
    const head = makeDepMap([['lodash', '4.17.21', false]]);
    const report = buildSurfaceReport(base, head);
    expect(report.unchanged).toHaveLength(1);
    expect(report.added).toHaveLength(0);
    expect(report.removed).toHaveLength(0);
  });
});

describe('formatSurfaceReportText', () => {
  it('includes header and counts', () => {
    const base = makeDepMap([]);
    const head = makeDepMap([['react', '18.0.0', true]]);
    const report = buildSurfaceReport(base, head);
    const text = formatSurfaceReportText(report);
    expect(text).toContain('Dependency Surface Report');
    expect(text).toContain('Direct:');
    expect(text).toContain('Transitive:');
  });

  it('shows no changes message when surface is identical', () => {
    const base = makeDepMap([['a', '1.0.0', true]]);
    const head = makeDepMap([['a', '1.0.0', true]]);
    const report = buildSurfaceReport(base, head);
    const text = formatSurfaceReportText(report);
    expect(text).toContain('No surface changes detected.');
  });

  it('lists added packages with + prefix', () => {
    const base = makeDepMap([]);
    const head = makeDepMap([['axios', '1.6.0', true]]);
    const report = buildSurfaceReport(base, head);
    const text = formatSurfaceReportText(report);
    expect(text).toContain('+ axios@1.6.0 [direct]');
  });

  it('lists removed packages with - prefix', () => {
    const base = makeDepMap([['got', '12.0.0', false]]);
    const head = makeDepMap([]);
    const report = buildSurfaceReport(base, head);
    const text = formatSurfaceReportText(report);
    expect(text).toContain('- got@12.0.0 [transitive]');
  });
});
