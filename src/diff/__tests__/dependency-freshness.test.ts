import {
  parseTuple,
  computeFreshnessScore,
  buildFreshnessReport,
  formatFreshnessReportText,
} from '../dependency-freshness';
import { DepMap } from '../index';

function makeDepMap(entries: Record<string, string>): DepMap {
  const map: DepMap = new Map();
  for (const [name, version] of Object.entries(entries)) {
    map.set(name, { version, resolved: '', integrity: '' });
  }
  return map;
}

describe('parseTuple', () => {
  it('parses a plain semver string', () => {
    expect(parseTuple('1.2.3')).toEqual([1, 2, 3]);
  });

  it('strips leading non-digit characters', () => {
    expect(parseTuple('^2.0.0')).toEqual([2, 0, 0]);
  });

  it('handles missing patch segment', () => {
    expect(parseTuple('3.1')).toEqual([3, 1, 0]);
  });
});

describe('computeFreshnessScore', () => {
  it('returns 100 when current equals latest', () => {
    const result = computeFreshnessScore('1.2.3', '1.2.3');
    expect(result.score).toBe(100);
    expect(result.behindMajor).toBe(0);
  });

  it('deducts 30 per major version behind', () => {
    const result = computeFreshnessScore('1.0.0', '3.0.0');
    expect(result.behindMajor).toBe(2);
    expect(result.score).toBe(40);
  });

  it('deducts 10 per minor version behind', () => {
    const result = computeFreshnessScore('2.0.0', '2.3.0');
    expect(result.behindMinor).toBe(3);
    expect(result.score).toBe(70);
  });

  it('deducts 2 per patch version behind', () => {
    const result = computeFreshnessScore('1.0.0', '1.0.4');
    expect(result.behindPatch).toBe(4);
    expect(result.score).toBe(92);
  });

  it('clamps score to 0 when very far behind', () => {
    const result = computeFreshnessScore('1.0.0', '10.0.0');
    expect(result.score).toBe(0);
  });

  it('does not count minor/patch behind when major differs', () => {
    const result = computeFreshnessScore('1.5.9', '2.0.0');
    expect(result.behindMinor).toBe(0);
    expect(result.behindPatch).toBe(0);
  });
});

describe('buildFreshnessReport', () => {
  it('produces entries for packages present in both maps', () => {
    const current = makeDepMap({ react: '17.0.0', lodash: '4.17.0' });
    const latest = makeDepMap({ react: '18.2.0', lodash: '4.17.21' });
    const report = buildFreshnessReport(current, latest);
    expect(report.entries).toHaveLength(2);
  });

  it('skips packages not present in latest map', () => {
    const current = makeDepMap({ react: '17.0.0', unknown: '1.0.0' });
    const latest = makeDepMap({ react: '18.0.0' });
    const report = buildFreshnessReport(current, latest);
    expect(report.entries).toHaveLength(1);
  });

  it('computes averageScore correctly', () => {
    const current = makeDepMap({ a: '1.0.0' });
    const latest = makeDepMap({ a: '1.0.0' });
    const report = buildFreshnessReport(current, latest);
    expect(report.averageScore).toBe(100);
  });

  it('counts stale packages with score below 70', () => {
    const current = makeDepMap({ a: '1.0.0' });
    const latest = makeDepMap({ a: '3.0.0' });
    const report = buildFreshnessReport(current, latest);
    expect(report.staleCount).toBe(1);
    expect(report.freshCount).toBe(0);
  });
});

describe('formatFreshnessReportText', () => {
  it('includes header and average score', () => {
    const current = makeDepMap({ lodash: '4.17.0' });
    const latest = makeDepMap({ lodash: '4.17.21' });
    const report = buildFreshnessReport(current, latest);
    const text = formatFreshnessReportText(report);
    expect(text).toContain('Dependency Freshness Report');
    expect(text).toContain('Average Score:');
  });

  it('shows up to date label when current equals latest', () => {
    const current = makeDepMap({ react: '18.0.0' });
    const latest = makeDepMap({ react: '18.0.0' });
    const report = buildFreshnessReport(current, latest);
    const text = formatFreshnessReportText(report);
    expect(text).toContain('up to date');
  });

  it('shows behind label when outdated', () => {
    const current = makeDepMap({ react: '16.0.0' });
    const latest = makeDepMap({ react: '18.0.0' });
    const report = buildFreshnessReport(current, latest);
    const text = formatFreshnessReportText(report);
    expect(text).toContain('behind by 2 major');
  });
});
