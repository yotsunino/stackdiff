import {
  buildReachabilityReport,
  computeReachabilityScore,
  formatReachabilityReportText,
} from '../dependency-reachability';
import { DepMap } from '../index';

function makeDepMap(entries: Record<string, { version: string; deps?: Record<string, string> }>): DepMap {
  const map: DepMap = new Map();
  for (const [name, meta] of Object.entries(entries)) {
    map.set(name, { version: meta.version, deps: meta.deps ?? {} });
  }
  return map;
}

describe('computeReachabilityScore', () => {
  it('returns 0 when total is 0', () => {
    expect(computeReachabilityScore(0, 0)).toBe(0);
  });

  it('returns 100 when all packages are reachable', () => {
    expect(computeReachabilityScore(10, 10)).toBe(100);
  });

  it('returns proportional score', () => {
    expect(computeReachabilityScore(5, 10)).toBe(50);
  });
});

describe('buildReachabilityReport', () => {
  it('returns empty report for empty map', () => {
    const report = buildReachabilityReport(new Map());
    expect(report.entries).toHaveLength(0);
    expect(report.totalPackages).toBe(0);
    expect(report.averageReachability).toBe(0);
  });

  it('computes reachability for a simple chain', () => {
    const depMap = makeDepMap({
      a: { version: '1.0.0', deps: { b: '1.0.0' } },
      b: { version: '1.0.0', deps: { c: '1.0.0' } },
      c: { version: '1.0.0' },
    });
    const report = buildReachabilityReport(depMap);
    const a = report.entries.find((e) => e.name === 'a')!;
    expect(a.reachableCount).toBe(2);
    expect(a.reachablePackages).toEqual(['b', 'c']);
  });

  it('handles circular dependencies without infinite loop', () => {
    const depMap = makeDepMap({
      x: { version: '1.0.0', deps: { y: '1.0.0' } },
      y: { version: '1.0.0', deps: { x: '1.0.0' } },
    });
    const report = buildReachabilityReport(depMap);
    expect(report.entries).toHaveLength(2);
    const x = report.entries.find((e) => e.name === 'x')!;
    expect(x.reachableCount).toBe(1);
  });

  it('sorts entries by reachable count descending', () => {
    const depMap = makeDepMap({
      leaf: { version: '1.0.0' },
      root: { version: '1.0.0', deps: { leaf: '1.0.0' } },
    });
    const report = buildReachabilityReport(depMap);
    expect(report.entries[0].name).toBe('root');
  });
});

describe('formatReachabilityReportText', () => {
  it('returns fallback message for empty report', () => {
    const report = buildReachabilityReport(new Map());
    expect(formatReachabilityReportText(report)).toBe('No packages found.');
  });

  it('includes package name and reachability in output', () => {
    const depMap = makeDepMap({
      alpha: { version: '2.0.0', deps: { beta: '1.0.0' } },
      beta: { version: '1.0.0' },
    });
    const report = buildReachabilityReport(depMap);
    const text = formatReachabilityReportText(report);
    expect(text).toContain('alpha@2.0.0');
    expect(text).toContain('reaches 1 packages');
    expect(text).toContain('Total packages: 2');
  });
});
