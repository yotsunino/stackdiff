import {
  findDependents,
  computeImpactScore,
  buildImpactReport,
  formatImpactReportText,
} from '../dependency-impact';
import { DepMap } from '../index';

function makeDepMap(entries: Record<string, { version: string; requires?: Record<string, string> }>): DepMap {
  return entries as unknown as DepMap;
}

describe('findDependents', () => {
  it('returns packages that require the given package', () => {
    const depMap = makeDepMap({
      lodash: { version: '4.0.0' },
      express: { version: '4.18.0', requires: { lodash: '^4.0.0' } },
      axios: { version: '1.0.0', requires: { lodash: '^4.0.0' } },
    });
    expect(findDependents('lodash', depMap)).toEqual(['express', 'axios']);
  });

  it('returns empty array when no dependents exist', () => {
    const depMap = makeDepMap({ lodash: { version: '4.0.0' } });
    expect(findDependents('lodash', depMap)).toEqual([]);
  });
});

describe('computeImpactScore', () => {
  it('gives higher base score for direct changes', () => {
    expect(computeImpactScore(0, true)).toBe(2);
    expect(computeImpactScore(0, false)).toBe(1);
  });

  it('adds dependents count to score', () => {
    expect(computeImpactScore(3, true)).toBe(5);
    expect(computeImpactScore(3, false)).toBe(4);
  });
});

describe('buildImpactReport', () => {
  it('returns empty report when no version changes', () => {
    const dep = makeDepMap({ lodash: { version: '4.0.0' } });
    const report = buildImpactReport(dep, dep);
    expect(report.entries).toHaveLength(0);
    expect(report.totalImpactScore).toBe(0);
  });

  it('detects version changes and computes impact', () => {
    const base = makeDepMap({ lodash: { version: '3.0.0' } });
    const head = makeDepMap({
      lodash: { version: '4.0.0' },
      express: { version: '4.18.0', requires: { lodash: '^4.0.0' } },
    });
    const report = buildImpactReport(base, head);
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0].name).toBe('lodash');
    expect(report.entries[0].impactedDependents).toContain('express');
    expect(report.entries[0].impactScore).toBeGreaterThan(2);
  });

  it('flags high impact entries correctly', () => {
    const base = makeDepMap({ pkg: { version: '1.0.0' } });
    const head = makeDepMap({
      pkg: { version: '2.0.0' },
      a: { version: '1.0.0', requires: { pkg: '*' } },
      b: { version: '1.0.0', requires: { pkg: '*' } },
      c: { version: '1.0.0', requires: { pkg: '*' } },
    });
    const report = buildImpactReport(base, head);
    expect(report.highImpactCount).toBe(1);
  });
});

describe('formatImpactReportText', () => {
  it('returns no-change message when empty', () => {
    const report = { entries: [], totalImpactScore: 0, highImpactCount: 0 };
    expect(formatImpactReportText(report)).toContain('No impactful');
  });

  it('includes package name and versions', () => {
    const report = buildImpactReport(
      makeDepMap({ react: { version: '17.0.0' } }),
      makeDepMap({ react: { version: '18.0.0' } })
    );
    const text = formatImpactReportText(report);
    expect(text).toContain('react');
    expect(text).toContain('17.0.0');
    expect(text).toContain('18.0.0');
  });
});
