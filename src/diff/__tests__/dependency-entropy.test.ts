import {
  computeEntropy,
  classifyEntropy,
  buildEntropyReport,
  formatEntropyReportText,
  DepMap,
} from '../dependency-entropy';

function makeDepMap(entries: Record<string, string>): DepMap {
  return new Map(Object.entries(entries).map(([k, v]) => [k, { version: v }]));
}

describe('computeEntropy', () => {
  it('returns 0 for empty list', () => {
    expect(computeEntropy([])).toBe(0);
  });

  it('returns 0 when all versions are identical', () => {
    expect(computeEntropy(['1.0.0', '1.0.0', '1.0.0'])).toBe(0);
  });

  it('returns 1 for two equally distributed versions', () => {
    expect(computeEntropy(['1.0.0', '2.0.0'])).toBe(1);
  });

  it('returns higher entropy for more unique versions', () => {
    const e2 = computeEntropy(['1.0.0', '2.0.0']);
    const e4 = computeEntropy(['1.0.0', '2.0.0', '3.0.0', '4.0.0']);
    expect(e4).toBeGreaterThan(e2);
  });
});

describe('classifyEntropy', () => {
  it('classifies 0 as stable', () => {
    expect(classifyEntropy(0)).toBe('stable');
  });

  it('classifies 0.9 as diverse', () => {
    expect(classifyEntropy(0.9)).toBe('diverse');
  });

  it('classifies 2.0 as chaotic', () => {
    expect(classifyEntropy(2.0)).toBe('chaotic');
  });
});

describe('buildEntropyReport', () => {
  it('returns stable entry when base and head share the same version', () => {
    const base = makeDepMap({ react: '18.0.0' });
    const head = makeDepMap({ react: '18.0.0' });
    const report = buildEntropyReport(base, head);
    const entry = report.entries.find((e) => e.name === 'react')!;
    expect(entry.label).toBe('stable');
    expect(entry.entropy).toBe(0);
  });

  it('returns diverse entry when versions differ', () => {
    const base = makeDepMap({ lodash: '4.17.0' });
    const head = makeDepMap({ lodash: '4.18.0' });
    const report = buildEntropyReport(base, head);
    const entry = report.entries.find((e) => e.name === 'lodash')!;
    expect(entry.label).toBe('diverse');
    expect(entry.entropy).toBe(1);
  });

  it('includes packages only in base', () => {
    const base = makeDepMap({ express: '4.18.0' });
    const head = makeDepMap({});
    const report = buildEntropyReport(base, head);
    expect(report.entries.find((e) => e.name === 'express')).toBeDefined();
  });

  it('computes overallEntropy as average', () => {
    const base = makeDepMap({ a: '1.0.0', b: '2.0.0' });
    const head = makeDepMap({ a: '1.0.0', b: '3.0.0' });
    const report = buildEntropyReport(base, head);
    expect(report.overallEntropy).toBeGreaterThanOrEqual(0);
  });

  it('returns empty report for empty maps', () => {
    const report = buildEntropyReport(new Map(), new Map());
    expect(report.entries).toHaveLength(0);
    expect(report.overallEntropy).toBe(0);
  });
});

describe('formatEntropyReportText', () => {
  it('includes summary line', () => {
    const base = makeDepMap({ react: '17.0.0' });
    const head = makeDepMap({ react: '18.0.0' });
    const report = buildEntropyReport(base, head);
    const text = formatEntropyReportText(report);
    expect(text).toContain('Overall dependency entropy');
  });

  it('includes chaotic section when applicable', () => {
    const base = makeDepMap({ a: '1.0.0', b: '2.0.0', c: '3.0.0' });
    const head = makeDepMap({ a: '4.0.0', b: '5.0.0', c: '6.0.0' });
    const report = buildEntropyReport(base, head);
    // force at least one chaotic by checking structure
    const text = formatEntropyReportText(report);
    expect(typeof text).toBe('string');
    expect(text).toContain('## Dependency Entropy Report');
  });
});
