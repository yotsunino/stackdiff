import {
  buildDependencyGraph,
  getImpactedPackages,
  formatGraphSummaryText,
} from '../dependency-graph';
import { DependencyMap } from '../../parser';

function makeDepMap(entries: Record<string, { version: string; requires?: Record<string, string> }>): DependencyMap {
  const map: DependencyMap = new Map();
  for (const [name, val] of Object.entries(entries)) {
    map.set(name, { version: val.version, resolved: '', integrity: '', requires: val.requires });
  }
  return map;
}

describe('buildDependencyGraph', () => {
  it('creates nodes for each dependency', () => {
    const deps = makeDepMap({
      react: { version: '18.0.0', requires: { 'loose-envify': '^1.0.0' } },
      'loose-envify': { version: '1.4.0' },
    });
    const graph = buildDependencyGraph(deps);
    expect(graph.has('react')).toBe(true);
    expect(graph.has('loose-envify')).toBe(true);
  });

  it('sets dependencies on nodes', () => {
    const deps = makeDepMap({
      react: { version: '18.0.0', requires: { 'loose-envify': '^1.0.0' } },
      'loose-envify': { version: '1.4.0' },
    });
    const graph = buildDependencyGraph(deps);
    expect(graph.get('react')?.dependencies).toContain('loose-envify');
  });

  it('sets dependents on nodes', () => {
    const deps = makeDepMap({
      react: { version: '18.0.0', requires: { 'loose-envify': '^1.0.0' } },
      'loose-envify': { version: '1.4.0' },
    });
    const graph = buildDependencyGraph(deps);
    expect(graph.get('loose-envify')?.dependents).toContain('react');
  });

  it('handles packages with no requires', () => {
    const deps = makeDepMap({ lodash: { version: '4.17.21' } });
    const graph = buildDependencyGraph(deps);
    expect(graph.get('lodash')?.dependencies).toEqual([]);
  });
});

describe('getImpactedPackages', () => {
  it('returns all transitive dependents', () => {
    const deps = makeDepMap({
      a: { version: '1.0.0', requires: { b: '1.0.0' } },
      b: { version: '1.0.0', requires: { c: '1.0.0' } },
      c: { version: '1.0.0' },
    });
    const graph = buildDependencyGraph(deps);
    const impacted = getImpactedPackages(graph, 'c');
    expect(impacted).toContain('b');
    expect(impacted).toContain('a');
    expect(impacted).not.toContain('c');
  });

  it('returns empty array for packages with no dependents', () => {
    const deps = makeDepMap({ standalone: { version: '1.0.0' } });
    const graph = buildDependencyGraph(deps);
    expect(getImpactedPackages(graph, 'standalone')).toEqual([]);
  });
});

describe('formatGraphSummaryText', () => {
  it('includes changed package and impacted count', () => {
    const deps = makeDepMap({
      a: { version: '2.0.0', requires: { b: '1.0.0' } },
      b: { version: '1.0.0' },
    });
    const graph = buildDependencyGraph(deps);
    const impacted = new Map([['b', ['a']]]);
    const text = formatGraphSummaryText(graph, impacted);
    expect(text).toContain('b affects 1 package(s)');
    expect(text).toContain('a@2.0.0');
  });
});
