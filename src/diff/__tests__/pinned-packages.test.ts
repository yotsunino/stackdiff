import {
  isExactPin,
  getPinnedPackages,
  diffPinnedPackages,
  formatPinnedSummaryText,
} from '../pinned-packages';
import { DependencyMap } from '../index';

function makeDepMap(entries: Record<string, string>): DependencyMap {
  const map: DependencyMap = {};
  for (const [name, version] of Object.entries(entries)) {
    map[name] = { version, resolved: '', integrity: '', dependencies: {} };
  }
  return map;
}

describe('isExactPin', () => {
  it('returns true for bare semver', () => {
    expect(isExactPin('1.2.3')).toBe(true);
  });
  it('returns false for caret range', () => {
    expect(isExactPin('^1.2.3')).toBe(false);
  });
  it('returns false for tilde range', () => {
    expect(isExactPin('~2.0.0')).toBe(false);
  });
  it('returns false for wildcard', () => {
    expect(isExactPin('*')).toBe(false);
  });
  it('returns false for empty string', () => {
    expect(isExactPin('')).toBe(false);
  });
});

describe('getPinnedPackages', () => {
  it('returns only exact-pinned packages', () => {
    const deps = makeDepMap({ react: '18.2.0', lodash: '^4.17.21', axios: '1.0.0' });
    expect(getPinnedPackages(deps).sort()).toEqual(['axios', 'react']);
  });

  it('returns empty array when no pins', () => {
    const deps = makeDepMap({ react: '^18.0.0' });
    expect(getPinnedPackages(deps)).toEqual([]);
  });
});

describe('diffPinnedPackages', () => {
  it('detects changed pinned version', () => {
    const base = makeDepMap({ react: '17.0.2', lodash: '^4.0.0' });
    const head = makeDepMap({ react: '18.2.0', lodash: '^4.0.0' });
    const result = diffPinnedPackages(base, head);
    expect(result.changed).toEqual([{ name: 'react', from: '17.0.2', to: '18.2.0' }]);
    expect(result.unpinned).toEqual([]);
    expect(result.newlyPinned).toEqual([]);
  });

  it('detects package that lost its pin', () => {
    const base = makeDepMap({ axios: '1.0.0' });
    const head = makeDepMap({ axios: '^1.0.0' });
    const result = diffPinnedPackages(base, head);
    expect(result.unpinned).toContain('axios');
  });

  it('detects newly pinned package', () => {
    const base = makeDepMap({ axios: '^1.0.0' });
    const head = makeDepMap({ axios: '1.4.0' });
    const result = diffPinnedPackages(base, head);
    expect(result.newlyPinned).toContain('axios');
  });

  it('returns no changes when pins are identical', () => {
    const base = makeDepMap({ react: '18.2.0' });
    const head = makeDepMap({ react: '18.2.0' });
    const result = diffPinnedPackages(base, head);
    expect(result.changed).toHaveLength(0);
    expect(result.unpinned).toHaveLength(0);
    expect(result.newlyPinned).toHaveLength(0);
  });
});

describe('formatPinnedSummaryText', () => {
  it('returns default message when no changes', () => {
    const result = { pinned: [], changed: [], unpinned: [], newlyPinned: [] };
    expect(formatPinnedSummaryText(result)).toBe('No pinned package changes.');
  });

  it('includes changed versions in output', () => {
    const result = {
      pinned: ['react'],
      changed: [{ name: 'react', from: '17.0.2', to: '18.2.0' }],
      unpinned: [],
      newlyPinned: [],
    };
    const text = formatPinnedSummaryText(result);
    expect(text).toContain('react: 17.0.2 → 18.2.0');
  });

  it('includes unpinned and newly pinned sections', () => {
    const result = {
      pinned: [],
      changed: [],
      unpinned: ['axios'],
      newlyPinned: ['lodash'],
    };
    const text = formatPinnedSummaryText(result);
    expect(text).toContain('Unpinned');
    expect(text).toContain('axios');
    expect(text).toContain('Newly pinned');
    expect(text).toContain('lodash');
  });
});
