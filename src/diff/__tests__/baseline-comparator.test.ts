import {
  compareToBaseline,
  exceedsDriftThreshold,
  formatBaselineSummary,
} from '../baseline-comparator';
import { DependencyMap } from '../../parser';

function makeDepMap(entries: Record<string, string>): DependencyMap {
  const map: DependencyMap = new Map();
  for (const [name, version] of Object.entries(entries)) {
    map.set(name, { version, resolved: '', integrity: '', dependencies: {} });
  }
  return map;
}

describe('compareToBaseline', () => {
  const baseline = makeDepMap({ react: '17.0.0', lodash: '4.17.21' });

  it('detects added packages', () => {
    const current = makeDepMap({ react: '17.0.0', lodash: '4.17.21', axios: '1.0.0' });
    const result = compareToBaseline('v1', baseline, current);
    expect(result.added).toHaveLength(1);
    expect(result.added[0].name).toBe('axios');
    expect(result.totalDrift).toBe(1);
  });

  it('detects removed packages', () => {
    const current = makeDepMap({ react: '17.0.0' });
    const result = compareToBaseline('v1', baseline, current);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].name).toBe('lodash');
  });

  it('detects changed packages', () => {
    const current = makeDepMap({ react: '18.0.0', lodash: '4.17.21' });
    const result = compareToBaseline('v1', baseline, current);
    expect(result.changed).toHaveLength(1);
    expect(result.changed[0].name).toBe('react');
    expect(result.changed[0].from).toBe('17.0.0');
    expect(result.changed[0].to).toBe('18.0.0');
  });

  it('returns zero drift for identical maps', () => {
    const current = makeDepMap({ react: '17.0.0', lodash: '4.17.21' });
    const result = compareToBaseline('v1', baseline, current);
    expect(result.totalDrift).toBe(0);
  });
});

describe('exceedsDriftThreshold', () => {
  it('returns true when drift exceeds threshold', () => {
    const baseline = makeDepMap({ a: '1.0.0' });
    const current = makeDepMap({ a: '2.0.0', b: '1.0.0' });
    const result = compareToBaseline('v1', baseline, current);
    expect(exceedsDriftThreshold(result, 1)).toBe(true);
  });

  it('returns false when drift is within threshold', () => {
    const baseline = makeDepMap({ a: '1.0.0' });
    const current = makeDepMap({ a: '1.0.1' });
    const result = compareToBaseline('v1', baseline, current);
    expect(exceedsDriftThreshold(result, 2)).toBe(false);
  });
});

describe('formatBaselineSummary', () => {
  it('includes baseline name and counts', () => {
    const baseline = makeDepMap({ react: '17.0.0' });
    const current = makeDepMap({ react: '18.0.0' });
    const result = compareToBaseline('main', baseline, current);
    const text = formatBaselineSummary(result);
    expect(text).toContain('Baseline: main');
    expect(text).toContain('Total drift: 1');
    expect(text).toContain('react: 17.0.0 → 18.0.0');
  });
});
