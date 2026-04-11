import {
  buildDepGraph,
  detectCircular,
  formatCircularReportText,
  DepGraph,
} from '../circular-detector';

function makeGraph(entries: Record<string, string[]>): DepGraph {
  return new Map(Object.entries(entries));
}

describe('detectCircular', () => {
  it('returns no cycles for an empty graph', () => {
    const report = detectCircular(new Map());
    expect(report.hasCycles).toBe(false);
    expect(report.cycles).toHaveLength(0);
  });

  it('returns no cycles for a linear chain', () => {
    const graph = makeGraph({ a: ['b'], b: ['c'], c: [] });
    const report = detectCircular(graph);
    expect(report.hasCycles).toBe(false);
  });

  it('detects a simple two-node cycle', () => {
    const graph = makeGraph({ a: ['b'], b: ['a'] });
    const report = detectCircular(graph);
    expect(report.hasCycles).toBe(true);
    expect(report.cycles).toHaveLength(1);
    expect(report.cycles[0].chain).toContain('a');
    expect(report.cycles[0].chain).toContain('b');
  });

  it('detects a three-node cycle', () => {
    const graph = makeGraph({ a: ['b'], b: ['c'], c: ['a'] });
    const report = detectCircular(graph);
    expect(report.hasCycles).toBe(true);
    expect(report.cycles[0].chain).toEqual(['a', 'b', 'c', 'a']);
  });

  it('does not flag a diamond dependency as a cycle', () => {
    const graph = makeGraph({ a: ['b', 'c'], b: ['d'], c: ['d'], d: [] });
    const report = detectCircular(graph);
    expect(report.hasCycles).toBe(false);
  });
});

describe('buildDepGraph', () => {
  it('builds a graph from a dep map with requires', () => {
    const deps = new Map([
      ['express', { requires: { 'body-parser': '^1.0.0', 'qs': '^6.0.0' } }],
      ['body-parser', { requires: {} }],
      ['qs', {}],
    ]);
    const graph = buildDepGraph(deps);
    expect(graph.get('express')).toEqual(['body-parser', 'qs']);
    expect(graph.get('body-parser')).toEqual([]);
    expect(graph.get('qs')).toEqual([]);
  });
});

describe('formatCircularReportText', () => {
  it('returns a clean message when no cycles exist', () => {
    const text = formatCircularReportText({ cycles: [], hasCycles: false });
    expect(text).toBe('No circular dependencies detected.');
  });

  it('formats a report with cycles', () => {
    const text = formatCircularReportText({
      hasCycles: true,
      cycles: [{ chain: ['a', 'b', 'a'] }],
    });
    expect(text).toContain('1 circular dependency chain');
    expect(text).toContain('a → b → a');
  });
});
