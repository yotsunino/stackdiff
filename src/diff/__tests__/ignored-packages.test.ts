import {
  isIgnored,
  applyIgnoreList,
  parseIgnorePatterns,
} from '../ignored-packages';

function makeDepMap(entries: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(entries));
}

describe('isIgnored', () => {
  it('returns false when pattern list is empty', () => {
    expect(isIgnored('lodash', [])).toBe(false);
  });

  it('matches exact package name', () => {
    expect(isIgnored('lodash', ['lodash'])).toBe(true);
  });

  it('does not match partial names without wildcard', () => {
    expect(isIgnored('lodash-fp', ['lodash'])).toBe(false);
  });

  it('matches wildcard scope pattern', () => {
    expect(isIgnored('@types/node', ['@types/*'])).toBe(true);
    expect(isIgnored('@types/react', ['@types/*'])).toBe(true);
  });

  it('does not match different scope with wildcard', () => {
    expect(isIgnored('@babel/core', ['@types/*'])).toBe(false);
  });

  it('matches first applicable pattern', () => {
    expect(isIgnored('react', ['lodash', 'react', '@types/*'])).toBe(true);
  });
});

describe('applyIgnoreList', () => {
  it('returns original map when patterns are empty', () => {
    const deps = makeDepMap({ lodash: '4.0.0', react: '18.0.0' });
    const result = applyIgnoreList(deps, []);
    expect(result).toEqual(deps);
  });

  it('removes exact-matched packages', () => {
    const deps = makeDepMap({ lodash: '4.0.0', react: '18.0.0' });
    const result = applyIgnoreList(deps, ['lodash']);
    expect(result.has('lodash')).toBe(false);
    expect(result.has('react')).toBe(true);
  });

  it('removes wildcard-matched packages', () => {
    const deps = makeDepMap({
      '@types/node': '18.0.0',
      '@types/react': '18.0.0',
      express: '4.18.0',
    });
    const result = applyIgnoreList(deps, ['@types/*']);
    expect(result.has('@types/node')).toBe(false);
    expect(result.has('@types/react')).toBe(false);
    expect(result.has('express')).toBe(true);
  });

  it('does not mutate the original map', () => {
    const deps = makeDepMap({ lodash: '4.0.0' });
    applyIgnoreList(deps, ['lodash']);
    expect(deps.has('lodash')).toBe(true);
  });
});

describe('parseIgnorePatterns', () => {
  it('returns empty array for undefined input', () => {
    expect(parseIgnorePatterns(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseIgnorePatterns('')).toEqual([]);
  });

  it('parses a single pattern', () => {
    expect(parseIgnorePatterns('lodash')).toEqual(['lodash']);
  });

  it('parses comma-separated patterns', () => {
    expect(parseIgnorePatterns('lodash,@types/*,react')).toEqual([
      'lodash',
      '@types/*',
      'react',
    ]);
  });

  it('trims whitespace around patterns', () => {
    expect(parseIgnorePatterns(' lodash , @types/* ')).toEqual([
      'lodash',
      '@types/*',
    ]);
  });
});
