import { diffDependencies } from '../dependency-differ';
import { ParsedDependency } from '../../parser';

function makeDepMap(entries: Record<string, string>): Map<string, ParsedDependency> {
  return new Map(
    Object.entries(entries).map(([name, version]) => [
      name,
      { name, version, resolved: '', integrity: '', dependencies: {} },
    ])
  );
}

describe('diffDependencies', () => {
  it('detects added dependencies', () => {
    const base = makeDepMap({ lodash: '4.17.21' });
    const target = makeDepMap({ lodash: '4.17.21', axios: '1.4.0' });
    const { changes } = diffDependencies(base, target);
    expect(changes).toContainEqual({ name: 'axios', type: 'added', to: '1.4.0' });
  });

  it('detects removed dependencies', () => {
    const base = makeDepMap({ lodash: '4.17.21', moment: '2.29.4' });
    const target = makeDepMap({ lodash: '4.17.21' });
    const { changes, breakingChanges } = diffDependencies(base, target);
    expect(changes).toContainEqual({ name: 'moment', type: 'removed', from: '2.29.4' });
    expect(breakingChanges).toHaveLength(1);
  });

  it('detects upgraded dependencies', () => {
    const base = makeDepMap({ lodash: '4.17.20' });
    const target = makeDepMap({ lodash: '4.17.21' });
    const { changes } = diffDependencies(base, target);
    expect(changes).toContainEqual({ name: 'lodash', type: 'upgraded', from: '4.17.20', to: '4.17.21' });
  });

  it('flags major version upgrades as breaking', () => {
    const base = makeDepMap({ react: '17.0.2' });
    const target = makeDepMap({ react: '18.2.0' });
    const { breakingChanges } = diffDependencies(base, target);
    expect(breakingChanges).toHaveLength(1);
    expect(breakingChanges[0].name).toBe('react');
  });

  it('returns empty diff for identical trees', () => {
    const base = makeDepMap({ lodash: '4.17.21' });
    const target = makeDepMap({ lodash: '4.17.21' });
    const { changes, breakingChanges } = diffDependencies(base, target);
    expect(changes).toHaveLength(0);
    expect(breakingChanges).toHaveLength(0);
  });
});
