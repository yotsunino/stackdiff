import {
  flattenTransitiveDeps,
  findTransitiveConflicts,
  TransitiveDep,
} from '../transitive-resolver';

const makeDeps = (entries: Record<string, string>): Map<string, TransitiveDep> =>
  new Map(
    Object.entries(entries).map(([name, version]) => [
      name,
      { name, version, requiredBy: ['root'] },
    ])
  );

describe('flattenTransitiveDeps', () => {
  it('flattens top-level deps', () => {
    const deps = { lodash: { version: '4.17.21' }, axios: { version: '1.2.0' } };
    const result = flattenTransitiveDeps(deps);
    expect(result.get('lodash')?.version).toBe('4.17.21');
    expect(result.get('axios')?.version).toBe('1.2.0');
  });

  it('flattens nested deps and tracks requiredBy', () => {
    const deps = {
      express: {
        version: '4.18.0',
        dependencies: { 'qs': { version: '6.11.0' } },
      },
    };
    const result = flattenTransitiveDeps(deps);
    expect(result.get('qs')?.version).toBe('6.11.0');
    expect(result.get('qs')?.requiredBy).toContain('express');
  });

  it('merges requiredBy for shared transitive deps', () => {
    const deps = {
      pkgA: { version: '1.0.0', dependencies: { shared: { version: '2.0.0' } } },
      pkgB: { version: '1.0.0', dependencies: { shared: { version: '2.0.0' } } },
    };
    const result = flattenTransitiveDeps(deps);
    const shared = result.get('shared');
    expect(shared?.requiredBy).toContain('pkgA');
    expect(shared?.requiredBy).toContain('pkgB');
  });
});

describe('findTransitiveConflicts', () => {
  it('returns empty when no changes', () => {
    const base = makeDeps({ lodash: '4.17.21' });
    const head = makeDeps({ lodash: '4.17.21' });
    expect(findTransitiveConflicts(base, head)).toHaveLength(0);
  });

  it('detects a breaking major version change', () => {
    const base = makeDeps({ react: '17.0.2' });
    const head = makeDeps({ react: '18.0.0' });
    const conflicts = findTransitiveConflicts(base, head);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].breaking).toBe(true);
    expect(conflicts[0].name).toBe('react');
  });

  it('detects a non-breaking patch change', () => {
    const base = makeDeps({ lodash: '4.17.20' });
    const head = makeDeps({ lodash: '4.17.21' });
    const conflicts = findTransitiveConflicts(base, head);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].breaking).toBe(false);
  });

  it('ignores packages only in base (removed)', () => {
    const base = makeDeps({ removed: '1.0.0', kept: '2.0.0' });
    const head = makeDeps({ kept: '3.0.0' });
    const conflicts = findTransitiveConflicts(base, head);
    expect(conflicts.map((c) => c.name)).not.toContain('removed');
  });
});
