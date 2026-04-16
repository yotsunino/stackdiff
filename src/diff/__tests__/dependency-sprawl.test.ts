import {
  computeSprawlScore,
  classifySprawl,
  buildSprawlReport,
  formatSprawlReportText,
  DepMap,
} from '../dependency-sprawl';

function makeDepMap(entries: Record<string, { version: string; dependencies?: Record<string, string> }>): DepMap {
  return new Map(Object.entries(entries));
}

describe('computeSprawlScore', () => {
  it('returns 0 when no direct deps', () => {
    expect(computeSprawlScore(0, 10)).toBe(0);
  });

  it('calculates ratio correctly', () => {
    expect(computeSprawlScore(2, 10)).toBe(5);
  });
});

describe('classifySprawl', () => {
  it('classifies contained', () => expect(classifySprawl(0.5)).toBe('contained'));
  it('classifies moderate', () => expect(classifySprawl(3)).toBe('moderate'));
  it('classifies sprawling', () => expect(classifySprawl(10)).toBe('sprawling'));
  it('classifies excessive', () => expect(classifySprawl(20)).toBe('excessive'));
});

describe('buildSprawlReport', () => {
  it('returns empty report for empty map', () => {
    const report = buildSprawlReport(new Map());
    expect(report.entries).toHaveLength(0);
    expect(report.averageScore).toBe(0);
    expect(report.mostSprawling).toBeNull();
  });

  it('builds report with transitive deps', () => {
    const depMap = makeDepMap({
      lodash: { version: '4.0.0' },
      express: { version: '4.18.0', dependencies: { lodash: '4.0.0' } },
      app: { version: '1.0.0', dependencies: { express: '4.18.0', lodash: '4.0.0' } },
    });
    const report = buildSprawlReport(depMap);
    const appEntry = report.entries.find(e => e.name === 'app');
    expect(appEntry).toBeDefined();
    expect(appEntry!.directDeps).toBe(2);
    expect(appEntry!.transitiveDeps).toBeGreaterThan(0);
  });

  it('sets mostSprawling to highest scoring package', () => {
    const depMap = makeDepMap({
      a: { version: '1.0.0' },
      b: { version: '1.0.0', dependencies: { a: '1.0.0' } },
    });
    const report = buildSprawlReport(depMap);
    expect(report.mostSprawling).toBe('b');
  });
});

describe('formatSprawlReportText', () => {
  it('returns fallback for empty report', () => {
    const report = buildSprawlReport(new Map());
    expect(formatSprawlReportText(report)).toContain('No dependency sprawl');
  });

  it('includes package names and scores', () => {
    const depMap = makeDepMap({
      react: { version: '18.0.0' },
      next: { version: '13.0.0', dependencies: { react: '18.0.0' } },
    });
    const text = formatSprawlReportText(buildSprawlReport(depMap));
    expect(text).toContain('next');
    expect(text).toContain('score=');
  });
});
