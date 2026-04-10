import { diffChangeSets, formatChangeSetSummary } from '../change-set-diff';
import { DependencyMap } from '../../parser';

function makeDepMap(entries: Record<string, string>): DependencyMap {
  const map: DependencyMap = new Map();
  for (const [name, version] of Object.entries(entries)) {
    map.set(name, { name, version, resolved: '', dependencies: {} });
  }
  return map;
}

describe('diffChangeSets', () => {
  it('counts added, removed, and updated packages', () => {
    const base = makeDepMap({ lodash: '4.17.20', axios: '0.21.0' });
    const head = makeDepMap({ lodash: '4.17.21', express: '4.18.0' });

    const cs = diffChangeSets(base, head);

    expect(cs.totalAdded).toBe(1);
    expect(cs.totalRemoved).toBe(1);
    expect(cs.totalUpdated).toBe(1);
  });

  it('detects breaking changes in direct deps', () => {
    const base = makeDepMap({ react: '17.0.2' });
    const head = makeDepMap({ react: '18.0.0' });

    const cs = diffChangeSets(base, head);

    expect(cs.breakingCount).toBeGreaterThan(0);
  });

  it('returns zero counts for identical maps', () => {
    const base = makeDepMap({ lodash: '4.17.21' });
    const head = makeDepMap({ lodash: '4.17.21' });

    const cs = diffChangeSets(base, head);

    expect(cs.totalAdded).toBe(0);
    expect(cs.totalRemoved).toBe(0);
    expect(cs.totalUpdated).toBe(0);
    expect(cs.breakingCount).toBe(0);
  });

  it('includes transitive changes in the result', () => {
    const base = makeDepMap({ lodash: '4.17.20' });
    const head = makeDepMap({ lodash: '4.17.21' });

    const cs = diffChangeSets(base, head);

    expect(Array.isArray(cs.transitive)).toBe(true);
  });
});

describe('formatChangeSetSummary', () => {
  it('shows no breaking changes message when clean', () => {
    const base = makeDepMap({ lodash: '4.17.21' });
    const head = makeDepMap({ lodash: '4.17.21' });
    const cs = diffChangeSets(base, head);

    const output = formatChangeSetSummary(cs);

    expect(output).toContain('No breaking changes detected');
  });

  it('shows breaking changes warning when present', () => {
    const base = makeDepMap({ react: '17.0.2' });
    const head = makeDepMap({ react: '18.0.0' });
    const cs = diffChangeSets(base, head);

    const output = formatChangeSetSummary(cs);

    expect(output).toContain('Breaking changes detected');
  });

  it('lists added packages with + prefix', () => {
    const base = makeDepMap({});
    const head = makeDepMap({ express: '4.18.0' });
    const cs = diffChangeSets(base, head);

    const output = formatChangeSetSummary(cs);

    expect(output).toContain('+ express@4.18.0');
  });

  it('lists removed packages with - prefix', () => {
    const base = makeDepMap({ axios: '0.21.0' });
    const head = makeDepMap({});
    const cs = diffChangeSets(base, head);

    const output = formatChangeSetSummary(cs);

    expect(output).toContain('- axios@0.21.0');
  });
});
