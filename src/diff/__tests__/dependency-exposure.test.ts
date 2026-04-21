import {
  buildExposureReport,
  findTransitiveProviders,
  formatExposureReportText,
  DepMap,
} from '../dependency-exposure';

function makeDepMap(entries: Record<string, { version: string; dependencies?: Record<string, string> }>): DepMap {
  return new Map(Object.entries(entries));
}

describe('findTransitiveProviders', () => {
  it('returns empty array when no provider exists', () => {
    const direct = makeDepMap({ react: { version: '18.0.0' } });
    const all = makeDepMap({ react: { version: '18.0.0' } });
    const providers = findTransitiveProviders('react', direct, all);
    expect(providers).toEqual([]);
  });

  it('detects a direct dep that provides target transitively', () => {
    const direct = makeDepMap({
      lodash: { version: '4.0.0' },
      'my-lib': { version: '1.0.0', dependencies: { lodash: '^4.0.0' } },
    });
    const all = makeDepMap({
      lodash: { version: '4.0.0' },
      'my-lib': { version: '1.0.0', dependencies: { lodash: '^4.0.0' } },
    });
    const providers = findTransitiveProviders('lodash', direct, all);
    expect(providers).toContain('my-lib');
  });

  it('does not count the package itself as a provider', () => {
    const direct = makeDepMap({ lodash: { version: '4.0.0', dependencies: { lodash: '^4.0.0' } } });
    const all = makeDepMap({ lodash: { version: '4.0.0' } });
    const providers = findTransitiveProviders('lodash', direct, all);
    expect(providers).not.toContain('lodash');
  });
});

describe('buildExposureReport', () => {
  it('marks redundant direct dependencies correctly', () => {
    const direct = makeDepMap({
      chalk: { version: '5.0.0' },
      ora: { version: '6.0.0', dependencies: { chalk: '^5.0.0' } },
    });
    const all = makeDepMap({
      chalk: { version: '5.0.0' },
      ora: { version: '6.0.0', dependencies: { chalk: '^5.0.0' } },
    });
    const report = buildExposureReport(direct, all);
    const chalk = report.entries.find((e) => e.name === 'chalk');
    expect(chalk?.isRedundantDirect).toBe(true);
    expect(chalk?.resolvedBy).toContain('ora');
  });

  it('does not mark truly direct-only packages as redundant', () => {
    const direct = makeDepMap({
      typescript: { version: '5.0.0' },
      jest: { version: '29.0.0' },
    });
    const all = makeDepMap({
      typescript: { version: '5.0.0' },
      jest: { version: '29.0.0' },
    });
    const report = buildExposureReport(direct, all);
    expect(report.redundantCount).toBe(0);
    expect(report.exposureScore).toBe(0);
  });

  it('computes exposure score as percentage', () => {
    const direct = makeDepMap({
      a: { version: '1.0.0' },
      b: { version: '1.0.0' },
      c: { version: '1.0.0', dependencies: { a: '^1.0.0' } },
    });
    const all = makeDepMap({
      a: { version: '1.0.0' },
      b: { version: '1.0.0' },
      c: { version: '1.0.0', dependencies: { a: '^1.0.0' } },
    });
    const report = buildExposureReport(direct, all);
    expect(report.totalDirect).toBe(3);
    expect(report.redundantCount).toBe(1);
    expect(report.exposureScore).toBe(33);
  });
});

describe('formatExposureReportText', () => {
  it('includes header and summary line', () => {
    const report = buildExposureReport(
      makeDepMap({ react: { version: '18.0.0' } }),
      makeDepMap({ react: { version: '18.0.0' } })
    );
    const text = formatExposureReportText(report);
    expect(text).toContain('Dependency Exposure Report');
    expect(text).toContain('Direct: 1');
  });

  it('labels redundant packages with [REDUNDANT]', () => {
    const direct = makeDepMap({
      debug: { version: '4.0.0' },
      express: { version: '4.18.0', dependencies: { debug: '^4.0.0' } },
    });
    const all = makeDepMap({
      debug: { version: '4.0.0' },
      express: { version: '4.18.0', dependencies: { debug: '^4.0.0' } },
    });
    const text = formatExposureReportText(buildExposureReport(direct, all));
    expect(text).toContain('[REDUNDANT]');
    expect(text).toContain('express');
  });
});
