import {
  buildConcentrationReport,
  formatConcentrationReportText,
} from '../dependency-concentration';

type DepInfo = { version: string; dependencies?: Record<string, string> };

function makeDepMap(entries: Record<string, DepInfo>): Map<string, DepInfo> {
  return new Map(Object.entries(entries));
}

describe('buildConcentrationReport', () => {
  it('returns zero totals for an empty map', () => {
    const report = buildConcentrationReport(new Map());
    expect(report.totalTransitive).toBe(0);
    expect(report.entries).toHaveLength(0);
    expect(report.topHeavy).toBe(false);
    expect(report.topNSharePercent).toBe(0);
  });

  it('counts direct packages with no nested deps', () => {
    const map = makeDepMap({
      lodash: { version: '4.17.21' },
      react: { version: '18.0.0' },
    });
    const report = buildConcentrationReport(map);
    expect(report.totalTransitive).toBe(2);
    expect(report.entries.every((e) => e.transitiveCount === 0)).toBe(true);
  });

  it('counts transitive dependencies correctly', () => {
    const map = makeDepMap({
      a: { version: '1.0.0', dependencies: { b: '1.0.0', c: '1.0.0' } },
      b: { version: '1.0.0', dependencies: { c: '1.0.0' } },
      c: { version: '1.0.0' },
    });
    const report = buildConcentrationReport(map);
    const aEntry = report.entries.find((e) => e.name === 'a')!;
    expect(aEntry.transitiveCount).toBe(2); // b and c
    const bEntry = report.entries.find((e) => e.name === 'b')!;
    expect(bEntry.transitiveCount).toBe(1); // c
    const cEntry = report.entries.find((e) => e.name === 'c')!;
    expect(cEntry.transitiveCount).toBe(0);
  });

  it('sorts entries by transitiveCount descending', () => {
    const map = makeDepMap({
      x: { version: '1.0.0' },
      y: { version: '1.0.0', dependencies: { x: '1.0.0' } },
    });
    const report = buildConcentrationReport(map);
    expect(report.entries[0].name).toBe('y');
  });

  it('flags topHeavy when top packages exceed 60% share', () => {
    const deps: Record<string, DepInfo> = {};
    // Create a hub package that pulls in many others
    const children: Record<string, string> = {};
    for (let i = 0; i < 10; i++) {
      deps[`child${i}`] = { version: '1.0.0' };
      children[`child${i}`] = '1.0.0';
    }
    deps['hub'] = { version: '1.0.0', dependencies: children };
    const map = makeDepMap(deps);
    const report = buildConcentrationReport(map, 1);
    expect(report.topHeavy).toBe(true);
  });

  it('avoids infinite loops on circular deps', () => {
    const map = makeDepMap({
      a: { version: '1.0.0', dependencies: { b: '1.0.0' } },
      b: { version: '1.0.0', dependencies: { a: '1.0.0' } },
    });
    expect(() => buildConcentrationReport(map)).not.toThrow();
  });
});

describe('formatConcentrationReportText', () => {
  it('includes header and total package count', () => {
    const map = makeDepMap({
      lodash: { version: '4.17.21' },
    });
    const report = buildConcentrationReport(map);
    const text = formatConcentrationReportText(report);
    expect(text).toContain('Dependency Concentration Report');
    expect(text).toContain('Total packages: 1');
  });

  it('marks top-heavy in output', () => {
    const report = {
      totalTransitive: 10,
      entries: [],
      topHeavy: true,
      topNSharePercent: 75,
    };
    const text = formatConcentrationReportText(report);
    expect(text).toContain('top-heavy');
  });
});
