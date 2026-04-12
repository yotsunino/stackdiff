import { matchesPattern, isIncluded, filterDependencies } from '../dependency-filter';
import { DiffEntry } from '../../diff/dependency-differ';

function makeEntry(name: string, breaking = false, direct = true): DiffEntry {
  return { name, from: '1.0.0', to: '2.0.0', breaking, direct, changeType: 'major' };
}

describe('matchesPattern', () => {
  it('matches exact name', () => {
    expect(matchesPattern('lodash', 'lodash')).toBe(true);
  });

  it('does not match different name', () => {
    expect(matchesPattern('lodash', 'ramda')).toBe(false);
  });

  it('matches suffix wildcard', () => {
    expect(matchesPattern('@scope/foo', '@scope/*')).toBe(true);
    expect(matchesPattern('other/foo', '@scope/*')).toBe(false);
  });

  it('matches prefix wildcard', () => {
    expect(matchesPattern('foo-plugin', '*-plugin')).toBe(true);
    expect(matchesPattern('foo-util', '*-plugin')).toBe(false);
  });

  it('matches bare wildcard', () => {
    expect(matchesPattern('anything', '*')).toBe(true);
  });
});

describe('isIncluded', () => {
  it('includes all when no include/exclude provided', () => {
    expect(isIncluded('lodash')).toBe(true);
  });

  it('excludes matching packages', () => {
    expect(isIncluded('lodash', undefined, ['lodash'])).toBe(false);
  });

  it('includes only matching packages when include list given', () => {
    expect(isIncluded('lodash', ['lodash'])).toBe(true);
    expect(isIncluded('ramda', ['lodash'])).toBe(false);
  });

  it('exclude takes priority over include', () => {
    expect(isIncluded('lodash', ['lodash'], ['lodash'])).toBe(false);
  });
});

describe('filterDependencies', () => {
  const entries = [
    makeEntry('lodash', true, true),
    makeEntry('ramda', false, true),
    makeEntry('@internal/utils', false, false),
  ];

  it('returns all entries with empty options', () => {
    expect(filterDependencies(entries, {})).toHaveLength(3);
  });

  it('returns empty array when given empty entries', () => {
    expect(filterDependencies([], { onlyBreaking: true })).toHaveLength(0);
  });

  it('filters by onlyBreaking', () => {
    const result = filterDependencies(entries, { onlyBreaking: true });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('lodash');
  });

  it('filters by onlyDirect', () => {
    const result = filterDependencies(entries, { onlyDirect: true });
    expect(result).toHaveLength(2);
  });

  it('filters by exclude pattern', () => {
    const result = filterDependencies(entries, { exclude: ['@internal/*'] });
    expect(result).toHaveLength(2);
  });

  it('filters by include pattern', () => {
    const result = filterDependencies(entries, { include: ['lodash', 'ramda'] });
    expect(result).toHaveLength(2);
  });

  it('combines multiple filter options', () => {
    const result = filterDependencies(entries, { onlyBreaking: true, exclude: ['lodash'] });
    expect(result).toHaveLength(0);
  });

  it('combines onlyDirect and onlyBreaking', () => {
    const result = filterDependencies(entries, { onlyDirect: true, onlyBreaking: true });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('lodash');
  });
});
