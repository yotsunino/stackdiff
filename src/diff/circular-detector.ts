/**
 * Detects circular dependencies within a resolved dependency tree.
 */

export interface CircularChain {
  chain: string[];
}

export interface CircularReport {
  cycles: CircularChain[];
  hasCycles: boolean;
}

export type DepGraph = Map<string, string[]>;

/**
 * Build a directed graph from a flat dependency map where each key
 * maps to a list of its direct dependency names.
 */
export function buildDepGraph(
  deps: Map<string, { requires?: Record<string, string> }>
): DepGraph {
  const graph: DepGraph = new Map();
  for (const [name, meta] of deps.entries()) {
    graph.set(name, Object.keys(meta.requires ?? {}));
  }
  return graph;
}

/**
 * Detect all cycles in a directed dependency graph using DFS.
 */
export function detectCircular(graph: DepGraph): CircularReport {
  const cycles: CircularChain[] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (stack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push({ chain: [...path.slice(cycleStart), node] });
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    stack.add(node);

    for (const neighbor of graph.get(node) ?? []) {
      dfs(neighbor, [...path, node]);
    }

    stack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return { cycles, hasCycles: cycles.length > 0 };
}

/**
 * Format a circular dependency report as human-readable text.
 */
export function formatCircularReportText(report: CircularReport): string {
  if (!report.hasCycles) {
    return 'No circular dependencies detected.';
  }
  const lines: string[] = [`Found ${report.cycles.length} circular dependency chain(s):\n`];
  for (const { chain } of report.cycles) {
    lines.push('  ' + chain.join(' → '));
  }
  return lines.join('\n');
}
