import { detectRedundancy, formatRedundancyReportText } from '../dependency-redundancy';
import { DepMap } from '../index';

function makeDepMap(entries: Array<[string, { version: string; dependencies?: Record<string, string> }]>): DepMap {
  const map: DepMap = new Map();
  for (const [name, info] of entries) {
    map.set(name, { version: info.version, dependencies: info.dependencies ?? {} });
  }
  return map;
}

describe('detectRedundancy', () => {
  it('returns empty report when no redundancy', () => {
    const base = makeDepMap([['lodash', { version: '4.17.21' }]]);
    const head = makeDepMap([['lodash', { version: '4.17.21' }]]);
    const report = detectRedundancy(base, head);
    expect(report.totalRedundant).toBe(0);
    expect(report.entries).toHaveLength(0);
  });

  it('detects aliased packages with same version', () => {
    const base = makeDepMap([]);
    const head = makeDepMap([
      ['lodash', { version: '4.17.21' }],
      ['lodash-es', { version: '4.17.21' }],
    ]);
    const report = detectRedundancy(base, head);
    const aliased = report.entries.filter((e) => e.reason === 'aliased');
    expect(aliased).toHaveLength(1);
    expect(aliased[0].name).toBe('lodash-es');
  });

  it('detects subset-of-peer redundancy', () => {
    const baseDeps = { a: '1.0.0', b: '2.0.0', c: '3.0.0' };
    const headDeps = { a: '1.0.0', b: '2.0.0' };
    const base = makeDepMap([['mylib', { version: '1.0.0', dependencies: baseDeps }]]);
    const head = makeDepMap([['mylib', { version: '1.0.0', dependencies: headDeps }]]);
    const report = detectRedundancy(base, head);
    const subset = report.entries.filter((e) => e.reason === 'subset-of-peer');
    expect(subset).toHaveLength(1);
    expect(subset[0].name).toBe('mylib');
  });

  it('does not flag subset when head has same or more deps', () => {
    const deps = { a: '1.0.0', b: '2.0.0' };
    const base = makeDepMap([['mylib', { version: '1.0.0', dependencies: deps }]]);
    const head = makeDepMap([['mylib', { version: '1.0.0', dependencies: deps }]]);
    const report = detectRedundancy(base, head);
    expect(report.entries.filter((e) => e.reason === 'subset-of-peer')).toHaveLength(0);
  });
});

describe('formatRedundancyReportText', () => {
  it('returns clean message when no redundancy', () => {
    const text = formatRedundancyReportText({ entries: [], totalRedundant: 0 });
    expect(text).toBe('No redundant dependencies detected.');
  });

  it('formats entries correctly', () => {
    const report = {
      totalRedundant: 1,
      entries: [{ name: 'foo', version: '1.0.0', reason: 'aliased' as const, detail: 'Same version provided by bar' }],
    };
    const text = formatRedundancyReportText(report);
    expect(text).toContain('foo@1.0.0');
    expect(text).toContain('[aliased]');
    expect(text).toContain('Same version provided by bar');
  });
});
