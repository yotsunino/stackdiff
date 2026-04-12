import { computeOverlap, formatOverlapReportText } from '../dependency-overlap';
import { DepMap } from '../index';

function makeDepMap(entries: Record<string, string>): DepMap {
  const map: DepMap = {};
  for (const [name, version] of Object.entries(entries)) {
    map[name] = { version, resolved: '', integrity: '' };
  }
  return map;
}

describe('computeOverlap', () => {
  it('returns 100% overlap when both maps are identical', () => {
    const a = makeDepMap({ react: '18.0.0', lodash: '4.17.21' });
    const b = makeDepMap({ react: '18.0.0', lodash: '4.17.21' });
    const result = computeOverlap(a, b);
    expect(result.overlapScore).toBe(100);
    expect(result.onlyInA).toHaveLength(0);
    expect(result.onlyInB).toHaveLength(0);
    expect(result.shared).toHaveLength(2);
    expect(result.shared.every((e) => e.shared)).toBe(true);
  });

  it('identifies packages only in A', () => {
    const a = makeDepMap({ react: '18.0.0', lodash: '4.17.21' });
    const b = makeDepMap({ react: '18.0.0' });
    const result = computeOverlap(a, b);
    expect(result.onlyInA).toEqual(['lodash']);
    expect(result.onlyInB).toHaveLength(0);
  });

  it('identifies packages only in B', () => {
    const a = makeDepMap({ react: '18.0.0' });
    const b = makeDepMap({ react: '18.0.0', axios: '1.0.0' });
    const result = computeOverlap(a, b);
    expect(result.onlyInB).toEqual(['axios']);
    expect(result.onlyInA).toHaveLength(0);
  });

  it('marks shared entries with version mismatches correctly', () => {
    const a = makeDepMap({ react: '17.0.0' });
    const b = makeDepMap({ react: '18.0.0' });
    const result = computeOverlap(a, b);
    expect(result.shared).toHaveLength(1);
    expect(result.shared[0].shared).toBe(false);
    expect(result.shared[0].versionA).toBe('17.0.0');
    expect(result.shared[0].versionB).toBe('18.0.0');
  });

  it('returns 0% overlap when maps are completely disjoint', () => {
    const a = makeDepMap({ react: '18.0.0' });
    const b = makeDepMap({ lodash: '4.17.21' });
    const result = computeOverlap(a, b);
    expect(result.overlapScore).toBe(0);
  });

  it('handles empty maps', () => {
    const result = computeOverlap({}, {});
    expect(result.overlapScore).toBe(100);
    expect(result.shared).toHaveLength(0);
  });
});

describe('formatOverlapReportText', () => {
  it('includes overlap score and shared count', () => {
    const a = makeDepMap({ react: '18.0.0', lodash: '4.17.21' });
    const b = makeDepMap({ react: '18.0.0', lodash: '4.17.21' });
    const report = computeOverlap(a, b);
    const text = formatOverlapReportText(report);
    expect(text).toContain('Overlap Score: 100%');
    expect(text).toContain('Shared packages: 2');
  });

  it('lists version mismatches', () => {
    const a = makeDepMap({ react: '17.0.0' });
    const b = makeDepMap({ react: '18.0.0' });
    const report = computeOverlap(a, b);
    const text = formatOverlapReportText(report);
    expect(text).toContain('react: 17.0.0 → 18.0.0');
  });

  it('lists only-in-A and only-in-B packages', () => {
    const a = makeDepMap({ alpha: '1.0.0' });
    const b = makeDepMap({ beta: '2.0.0' });
    const report = computeOverlap(a, b);
    const text = formatOverlapReportText(report);
    expect(text).toContain('Only in A');
    expect(text).toContain('Only in B');
  });
});
