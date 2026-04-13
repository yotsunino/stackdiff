import {
  buildFootprintReport,
  computeFootprintScore,
  formatFootprintReportText,
  DepMap,
} from '../dependency-footprint';

function makeDepMap(entries: [string, { version: string; requires?: Record<string, string> }][]): DepMap {
  return new Map(entries);
}

describe('computeFootprintScore', () => {
  it('returns 0 for no deps', () => {
    expect(computeFootprintScore(0, 0)).toBe(0);
  });

  it('weights transitive at 0.5', () => {
    expect(computeFootprintScore(2, 4)).toBe(4);
  });

  it('rounds result', () => {
    expect(computeFootprintScore(1, 1)).toBe(2);
  });
});

describe('buildFootprintReport', () => {
  it('returns empty report for empty maps', () => {
    const report = buildFootprintReport(makeDepMap([]), makeDepMap([]));
    expect(report.entries).toHaveLength(0);
    expect(report.heaviest).toBeNull();
    expect(report.totalDirect).toBe(0);
    expect(report.totalTransitive).toBe(0);
  });

  it('computes footprint for single package with no deps', () => {
    const direct = makeDepMap([['lodash', { version: '4.17.21' }]]);
    const all = makeDepMap([['lodash', { version: '4.17.21' }]]);
    const report = buildFootprintReport(direct, all);
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0].name).toBe('lodash');
    expect(report.entries[0].depCount).toBe(0);
    expect(report.entries[0].transitiveCount).toBe(0);
  });

  it('counts direct deps from requires field', () => {
    const direct = makeDepMap([['express', { version: '4.18.0', requires: { 'body-parser': '1.x', 'qs': '6.x' } }]]);
    const all = makeDepMap([
      ['express', { version: '4.18.0', requires: { 'body-parser': '1.x', 'qs': '6.x' } }],
      ['body-parser', { version: '1.20.0' }],
      ['qs', { version: '6.11.0' }],
    ]);
    const report = buildFootprintReport(direct, all);
    expect(report.entries[0].depCount).toBe(2);
    expect(report.entries[0].transitiveCount).toBe(2);
  });

  it('sorts entries by footprintScore descending', () => {
    const direct = makeDepMap([
      ['small', { version: '1.0.0' }],
      ['big', { version: '2.0.0', requires: { a: '1.x', b: '1.x', c: '1.x' } }],
    ]);
    const all = makeDepMap([
      ['small', { version: '1.0.0' }],
      ['big', { version: '2.0.0', requires: { a: '1.x', b: '1.x', c: '1.x' } }],
      ['a', { version: '1.0.0' }],
      ['b', { version: '1.0.0' }],
      ['c', { version: '1.0.0' }],
    ]);
    const report = buildFootprintReport(direct, all);
    expect(report.entries[0].name).toBe('big');
    expect(report.heaviest?.name).toBe('big');
  });
});

describe('formatFootprintReportText', () => {
  it('returns message for empty report', () => {
    const report = buildFootprintReport(new Map(), new Map());
    expect(formatFootprintReportText(report)).toBe('No dependencies found.');
  });

  it('includes package name and score in output', () => {
    const direct = makeDepMap([['react', { version: '18.0.0' }]]);
    const all = makeDepMap([['react', { version: '18.0.0' }]]);
    const report = buildFootprintReport(direct, all);
    const text = formatFootprintReportText(report);
    expect(text).toContain('react@18.0.0');
    expect(text).toContain('Heaviest package: react');
  });
});
