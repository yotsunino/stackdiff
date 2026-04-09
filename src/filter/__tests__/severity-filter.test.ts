import {
  filterBySeverity,
  groupBySeverity,
  meetsThreshold,
  ConflictEntry,
} from '../severity-filter';

const makeEntry = (
  name: string,
  changeType: 'major' | 'minor' | 'patch'
): ConflictEntry => ({
  name,
  fromVersion: '1.0.0',
  toVersion: '2.0.0',
  changeType,
});

describe('meetsThreshold', () => {
  it('returns true for any entry when threshold is all', () => {
    expect(meetsThreshold(makeEntry('a', 'patch'), 'all')).toBe(true);
    expect(meetsThreshold(makeEntry('b', 'minor'), 'all')).toBe(true);
    expect(meetsThreshold(makeEntry('c', 'major'), 'all')).toBe(true);
  });

  it('filters out patch and minor when threshold is major', () => {
    expect(meetsThreshold(makeEntry('a', 'patch'), 'major')).toBe(false);
    expect(meetsThreshold(makeEntry('b', 'minor'), 'major')).toBe(false);
    expect(meetsThreshold(makeEntry('c', 'major'), 'major')).toBe(true);
  });

  it('filters out patch when threshold is minor', () => {
    expect(meetsThreshold(makeEntry('a', 'patch'), 'minor')).toBe(false);
    expect(meetsThreshold(makeEntry('b', 'minor'), 'minor')).toBe(true);
    expect(meetsThreshold(makeEntry('c', 'major'), 'minor')).toBe(true);
  });

  it('passes all entries when threshold is patch', () => {
    expect(meetsThreshold(makeEntry('a', 'patch'), 'patch')).toBe(true);
    expect(meetsThreshold(makeEntry('b', 'minor'), 'patch')).toBe(true);
    expect(meetsThreshold(makeEntry('c', 'major'), 'patch')).toBe(true);
  });
});

describe('filterBySeverity', () => {
  const entries: ConflictEntry[] = [
    makeEntry('lodash', 'patch'),
    makeEntry('react', 'minor'),
    makeEntry('webpack', 'major'),
  ];

  it('returns only major entries for major threshold', () => {
    const result = filterBySeverity(entries, 'major');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('webpack');
  });

  it('returns minor and major entries for minor threshold', () => {
    const result = filterBySeverity(entries, 'minor');
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.name)).toContain('react');
    expect(result.map((e) => e.name)).toContain('webpack');
  });

  it('returns all entries for all threshold', () => {
    expect(filterBySeverity(entries, 'all')).toHaveLength(3);
  });
});

describe('groupBySeverity', () => {
  const entries: ConflictEntry[] = [
    makeEntry('a', 'patch'),
    makeEntry('b', 'minor'),
    makeEntry('c', 'major'),
    makeEntry('d', 'major'),
  ];

  it('groups entries correctly', () => {
    const groups = groupBySeverity(entries);
    expect(groups.major).toHaveLength(2);
    expect(groups.minor).toHaveLength(1);
    expect(groups.patch).toHaveLength(1);
    expect(groups.all).toHaveLength(4);
  });
});
