import {
  buildBloatReport,
  computeBloatScore,
  formatBloatReportText,
  DepMap,
} from '../dependency-bloat';

function makeDepMap(entries: Array<[string, { version: string; requires?: Record<string, string> }]>): DepMap {
  return new Map(entries);
}

describe('computeBloatScore', () => {
  it('returns direct + half transitive', () => {
    expect(computeBloatScore(4, 10)).toBe(9);
  });

  it('returns 0 for empty package', () => {
    expect(computeBloatScore(0, 0)).toBe(0);
  });
});

describe('buildBloatReport', () => {
  it('builds entries for each dep', () => {
    const deps = makeDepMap([
      ['lodash', { version: '4.17.21', requires: { 'some-dep': '^1.0.0' } }],
      ['tiny', { version: '1.0.0' }],
    ]);
    const transitive = new Map([['lodash', 8], ['tiny', 0]]);
    const report = buildBloatReport(deps, transitive);

    expect(report.entries).toHaveLength(2);
    const lodash = report.entries.find(e => e.name === 'lodash')!;
    expect(lodash.directDeps).toBe(1);
    expect(lodash.transitiveDeps).toBe(8);
    expect(lodash.bloatScore).toBe(computeBloatScore(1, 8));
  });

  it('sorts entries by bloat score descending', () => {
    const deps = makeDepMap([
      ['a', { version: '1.0.0' }],
      ['b', { version: '2.0.0', requires: { x: '*', y: '*', z: '*' } }],
    ]);
    const transitive = new Map([['a', 0], ['b', 5]]);
    const report = buildBloatReport(deps, transitive);
    expect(report.entries[0].name).toBe('b');
  });

  it('identifies the heaviest package', () => {
    const deps = makeDepMap([
      ['heavy', { version: '3.0.0', requires: { a: '*', b: '*' } }],
    ]);
    const transitive = new Map([['heavy', 20]]);
    const report = buildBloatReport(deps, transitive);
    expect(report.heaviest?.name).toBe('heavy');
  });

  it('returns null heaviest for empty map', () => {
    const report = buildBloatReport(new Map(), new Map());
    expect(report.heaviest).toBeNull();
    expect(report.entries).toHaveLength(0);
  });

  it('sums totalDirect and totalTransitive', () => {
    const deps = makeDepMap([
      ['a', { version: '1.0.0', requires: { x: '*' } }],
      ['b', { version: '1.0.0', requires: { y: '*', z: '*' } }],
    ]);
    const transitive = new Map([['a', 3], ['b', 7]]);
    const report = buildBloatReport(deps, transitive);
    expect(report.totalDirect).toBe(3);
    expect(report.totalTransitive).toBe(10);
  });
});

describe('formatBloatReportText', () => {
  it('returns fallback message for empty report', () => {
    const report = buildBloatReport(new Map(), new Map());
    expect(formatBloatReportText(report)).toBe('No dependency bloat data available.');
  });

  it('includes package names and scores', () => {
    const deps = makeDepMap([['react', { version: '18.0.0', requires: { 'loose-envify': '*' } }]]);
    const transitive = new Map([['react', 4]]);
    const report = buildBloatReport(deps, transitive);
    const text = formatBloatReportText(report);
    expect(text).toContain('react@18.0.0');
    expect(text).toContain('score:');
    expect(text).toContain('Heaviest package:');
  });
});
