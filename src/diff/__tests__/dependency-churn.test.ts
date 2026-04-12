import {
  buildChurnReport,
  formatChurnReportText,
  computeChurnScore,
  DepMap,
} from '../dependency-churn';

function makeDepMap(entries: Record<string, string>): DepMap {
  return new Map(Object.entries(entries).map(([k, v]) => [k, { version: v }]));
}

describe('computeChurnScore', () => {
  it('returns zero for no changes', () => {
    expect(computeChurnScore(0, 0)).toBe(0);
  });

  it('weights version jumps higher than change count', () => {
    expect(computeChurnScore(1, 2)).toBe(5);
    expect(computeChurnScore(2, 1)).toBe(4);
  });
});

describe('buildChurnReport', () => {
  it('returns empty report for fewer than 2 snapshots', () => {
    const report = buildChurnReport([makeDepMap({ react: '17.0.0' })]);
    expect(report.entries).toHaveLength(0);
    expect(report.totalChurn).toBe(0);
  });

  it('detects a version change between two snapshots', () => {
    const s1 = makeDepMap({ react: '17.0.0', lodash: '4.0.0' });
    const s2 = makeDepMap({ react: '18.0.0', lodash: '4.0.0' });
    const report = buildChurnReport([s1, s2]);
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0].name).toBe('react');
    expect(report.entries[0].changeCount).toBe(1);
  });

  it('accumulates changes across multiple snapshots', () => {
    const s1 = makeDepMap({ react: '17.0.0' });
    const s2 = makeDepMap({ react: '17.0.1' });
    const s3 = makeDepMap({ react: '17.0.2' });
    const s4 = makeDepMap({ react: '18.0.0' });
    const report = buildChurnReport([s1, s2, s3, s4]);
    expect(report.entries[0].changeCount).toBe(3);
    expect(report.highChurnPackages).toHaveLength(1);
    expect(report.highChurnPackages[0].name).toBe('react');
  });

  it('handles package additions and removals', () => {
    const s1 = makeDepMap({ lodash: '4.0.0' });
    const s2 = makeDepMap({ lodash: '4.0.0', axios: '1.0.0' });
    const report = buildChurnReport([s1, s2]);
    const axiosEntry = report.entries.find(e => e.name === 'axios');
    expect(axiosEntry).toBeDefined();
    expect(axiosEntry!.changeCount).toBe(1);
  });

  it('sorts entries by churn score descending', () => {
    const s1 = makeDepMap({ a: '1.0.0', b: '1.0.0' });
    const s2 = makeDepMap({ a: '1.0.1', b: '2.0.0' });
    const report = buildChurnReport([s1, s2]);
    expect(report.entries[0].name).toBe('b');
  });

  it('computes totalChurn as sum of all scores', () => {
    const s1 = makeDepMap({ a: '1.0.0', b: '1.0.0' });
    const s2 = makeDepMap({ a: '2.0.0', b: '3.0.0' });
    const report = buildChurnReport([s1, s2]);
    expect(report.totalChurn).toBe(report.entries.reduce((s, e) => s + e.churnScore, 0));
  });
});

describe('formatChurnReportText', () => {
  it('returns a no-churn message for empty report', () => {
    const text = formatChurnReportText({ entries: [], totalChurn: 0, highChurnPackages: [] });
    expect(text).toContain('No churn detected');
  });

  it('includes package names and change counts', () => {
    const s1 = makeDepMap({ react: '17.0.0' });
    const s2 = makeDepMap({ react: '18.0.0' });
    const report = buildChurnReport([s1, s2]);
    const text = formatChurnReportText(report);
    expect(text).toContain('react');
    expect(text).toContain('1 change(s)');
  });

  it('flags high-churn packages', () => {
    const snaps = [
      makeDepMap({ pkg: '1.0.0' }),
      makeDepMap({ pkg: '1.1.0' }),
      makeDepMap({ pkg: '1.2.0' }),
      makeDepMap({ pkg: '2.0.0' }),
    ];
    const report = buildChurnReport(snaps);
    const text = formatChurnReportText(report);
    expect(text).toContain('[HIGH]');
    expect(text).toContain('High-churn packages');
  });
});
