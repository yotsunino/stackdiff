import {
  computeCoupling,
  buildCouplingReport,
  formatCouplingReportText,
  DepMap,
} from '../dependency-coupling';

function makeDepMap(entries: Record<string, { version: string; deps?: string[] }>): DepMap {
  const map: DepMap = {};
  for (const [name, { version, deps }] of Object.entries(entries)) {
    map[name] = {
      version,
      dependencies: deps ? Object.fromEntries(deps.map((d) => [d, '*'])) : undefined,
    };
  }
  return map;
}

describe('computeCoupling', () => {
  it('returns empty array when no shared deps exist', () => {
    const head = makeDepMap({
      a: { version: '1.0.0', deps: ['x'] },
      b: { version: '1.0.0', deps: ['y'] },
    });
    const result = computeCoupling({}, head);
    expect(result).toHaveLength(0);
  });

  it('detects shared dependency between two packages', () => {
    const head = makeDepMap({
      a: { version: '1.0.0', deps: ['shared', 'only-a'] },
      b: { version: '1.0.0', deps: ['shared', 'only-b'] },
    });
    const result = computeCoupling({}, head);
    expect(result).toHaveLength(1);
    expect(result[0].sharedDeps).toContain('shared');
    expect(result[0].packageA).toBe('a');
    expect(result[0].packageB).toBe('b');
  });

  it('computes coupling score as jaccard index', () => {
    const head = makeDepMap({
      a: { version: '1.0.0', deps: ['x', 'y'] },
      b: { version: '1.0.0', deps: ['x', 'y'] },
    });
    const result = computeCoupling({}, head);
    expect(result[0].couplingScore).toBe(1);
  });

  it('sorts pairs by descending coupling score', () => {
    const head = makeDepMap({
      a: { version: '1.0.0', deps: ['x', 'y', 'z'] },
      b: { version: '1.0.0', deps: ['x', 'y', 'z'] },
      c: { version: '1.0.0', deps: ['x', 'w'] },
    });
    const result = computeCoupling({}, head);
    expect(result[0].couplingScore).toBeGreaterThanOrEqual(result[1].couplingScore);
  });

  it('ignores packages with no dependencies', () => {
    const head = makeDepMap({
      a: { version: '1.0.0' },
      b: { version: '1.0.0' },
    });
    const result = computeCoupling({}, head);
    expect(result).toHaveLength(0);
  });
});

describe('buildCouplingReport', () => {
  it('returns zero averageScore for empty pairs', () => {
    const report = buildCouplingReport([]);
    expect(report.averageScore).toBe(0);
    expect(report.highCouplingCount).toBe(0);
  });

  it('counts high coupling pairs correctly', () => {
    const pairs = [
      { packageA: 'a', packageB: 'b', sharedDeps: ['x'], couplingScore: 0.8 },
      { packageA: 'c', packageB: 'd', sharedDeps: ['y'], couplingScore: 0.3 },
    ];
    const report = buildCouplingReport(pairs);
    expect(report.highCouplingCount).toBe(1);
    expect(report.averageScore).toBe(0.55);
  });
});

describe('formatCouplingReportText', () => {
  it('returns no-coupling message for empty report', () => {
    const report = buildCouplingReport([]);
    expect(formatCouplingReportText(report)).toMatch(/No coupling/);
  });

  it('includes pair info in output', () => {
    const pairs = [
      { packageA: 'alpha', packageB: 'beta', sharedDeps: ['lodash'], couplingScore: 0.75 },
    ];
    const report = buildCouplingReport(pairs);
    const text = formatCouplingReportText(report);
    expect(text).toContain('alpha');
    expect(text).toContain('beta');
    expect(text).toContain('lodash');
    expect(text).toContain('0.75');
  });
});
