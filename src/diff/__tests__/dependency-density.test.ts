import {
  computeDensityScore,
  classifyDensity,
  buildDensityReport,
  formatDensityReportText,
  DepMap,
} from '../dependency-density';

function makeDepMap(entries: Record<string, { version: string; dependencies?: Record<string, string> }>): DepMap {
  return new Map(Object.entries(entries));
}

describe('computeDensityScore', () => {
  it('returns 0 when there are no direct deps', () => {
    expect(computeDensityScore(0, 10)).toBe(0);
  });

  it('calculates ratio of transitive to direct', () => {
    expect(computeDensityScore(4, 20)).toBe(5);
  });

  it('handles equal direct and transitive counts', () => {
    expect(computeDensityScore(3, 3)).toBe(1);
  });
});

describe('classifyDensity', () => {
  it('classifies score < 2 as sparse', () => {
    expect(classifyDensity(1.5)).toBe('sparse');
  });

  it('classifies score 2–4 as moderate', () => {
    expect(classifyDensity(3)).toBe('moderate');
  });

  it('classifies score 5–9 as dense', () => {
    expect(classifyDensity(7)).toBe('dense');
  });

  it('classifies score >= 10 as very-dense', () => {
    expect(classifyDensity(12)).toBe('very-dense');
  });
});

describe('buildDensityReport', () => {
  it('returns empty report for empty map', () => {
    const report = buildDensityReport(makeDepMap({}));
    expect(report.entries).toHaveLength(0);
    expect(report.averageDensity).toBe(0);
    expect(report.classification).toBe('sparse');
  });

  it('computes transitive deps through the graph', () => {
    const depMap = makeDepMap({
      lodash: { version: '4.17.21' },
      express: { version: '4.18.0', dependencies: { lodash: '4.17.21' } },
      myapp: { version: '1.0.0', dependencies: { express: '4.18.0', lodash: '4.17.21' } },
    });

    const report = buildDensityReport(depMap);
    const myapp = report.entries.find((e) => e.name === 'myapp')!;
    expect(myapp.directDeps).toBe(2);
    expect(myapp.transitiveDeps).toBe(2);
  });

  it('assigns zero density to leaf nodes with no deps', () => {
    const depMap = makeDepMap({
      lodash: { version: '4.17.21' },
    });
    const report = buildDensityReport(depMap);
    expect(report.entries[0].densityScore).toBe(0);
  });
});

describe('formatDensityReportText', () => {
  it('includes classification and average score', () => {
    const depMap = makeDepMap({
      lodash: { version: '4.17.21' },
    });
    const report = buildDensityReport(depMap);
    const text = formatDensityReportText(report);
    expect(text).toContain('Dependency Density Report');
    expect(text).toContain('sparse');
    expect(text).toContain('lodash@4.17.21');
  });
});
