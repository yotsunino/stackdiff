import {
  buildResilienceReport,
  computeResilienceScore,
  classifyResilience,
  formatResilienceReportText,
  DepMap,
} from '../dependency-resilience';

function makeDepMap(entries: Array<[string, string, Record<string, string>?]>): DepMap {
  const map: DepMap = new Map();
  for (const [name, version, dependencies] of entries) {
    map.set(name, { version, dependencies: dependencies ?? {} });
  }
  return map;
}

describe('computeResilienceScore', () => {
  it('returns 100 for a package with no dependents', () => {
    expect(computeResilienceScore('foo', 0, false)).toBe(100);
  });

  it('penalises heavily used packages without alternatives', () => {
    const score = computeResilienceScore('bar', 12, false);
    expect(score).toBeLessThan(50);
  });

  it('is less harsh when alternatives exist', () => {
    const withAlt = computeResilienceScore('baz', 12, true);
    const withoutAlt = computeResilienceScore('baz', 12, false);
    expect(withAlt).toBeGreaterThan(withoutAlt);
  });
});

describe('classifyResilience', () => {
  it('classifies low score as critical', () => {
    expect(classifyResilience(30, 2)).toBe('critical');
  });

  it('classifies high dependent count as critical', () => {
    expect(classifyResilience(90, 11)).toBe('critical');
  });

  it('classifies mid-range score as fragile', () => {
    expect(classifyResilience(55, 3)).toBe('fragile');
  });

  it('classifies high score as robust', () => {
    expect(classifyResilience(95, 1)).toBe('robust');
  });
});

describe('buildResilienceReport', () => {
  it('returns empty report for empty map', () => {
    const report = buildResilienceReport(new Map());
    expect(report.entries).toHaveLength(0);
    expect(report.overallScore).toBe(100);
  });

  it('detects single point of failure', () => {
    const depMap = makeDepMap([
      ['root', '1.0.0', { lodash: '^4.0.0', uniquepkg: '^1.0.0' }],
      ['a', '1.0.0', { uniquepkg: '^1.0.0' }],
      ['b', '1.0.0', { uniquepkg: '^1.0.0' }],
      ['c', '1.0.0', { uniquepkg: '^1.0.0' }],
      ['d', '1.0.0', { uniquepkg: '^1.0.0' }],
      ['uniquepkg', '1.0.0'],
      ['lodash', '4.17.21'],
    ]);
    const report = buildResilienceReport(depMap);
    const unique = report.entries.find(e => e.name === 'uniquepkg');
    expect(unique?.singlePointOfFailure).toBe(true);
    const lod = report.entries.find(e => e.name === 'lodash');
    expect(lod?.singlePointOfFailure).toBe(false);
  });

  it('sorts entries by score ascending', () => {
    const depMap = makeDepMap([
      ['a', '1.0.0'],
      ['b', '2.0.0'],
    ]);
    const report = buildResilienceReport(depMap);
    for (let i = 1; i < report.entries.length; i++) {
      expect(report.entries[i].score).toBeGreaterThanOrEqual(report.entries[i - 1].score);
    }
  });

  it('computes overall score as average', () => {
    const depMap = makeDepMap([['only', '1.0.0']]);
    const report = buildResilienceReport(depMap);
    expect(report.overallScore).toBe(report.entries[0].score);
  });
});

describe('formatResilienceReportText', () => {
  it('includes header and overall score', () => {
    const depMap = makeDepMap([['pkg', '1.2.3']]);
    const report = buildResilienceReport(depMap);
    const text = formatResilienceReportText(report);
    expect(text).toContain('Dependency Resilience Report');
    expect(text).toContain('Overall Score:');
    expect(text).toContain('pkg@1.2.3');
  });

  it('marks SPOF packages', () => {
    const depMap = makeDepMap([
      ['root', '1.0.0', { special: '^1.0.0' }],
      ['a', '1.0.0', { special: '^1.0.0' }],
      ['b', '1.0.0', { special: '^1.0.0' }],
      ['c', '1.0.0', { special: '^1.0.0' }],
      ['d', '1.0.0', { special: '^1.0.0' }],
      ['special', '1.0.0'],
    ]);
    const report = buildResilienceReport(depMap);
    const text = formatResilienceReportText(report);
    expect(text).toContain('[SPOF]');
  });
});
