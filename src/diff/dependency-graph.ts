import { DependencyMap } from '../parser';

export interface GraphNode {
  name: string;
  version: string;
  dependents: string[];
  dependencies: string[];
}

export type DependencyGraph = Map<string, GraphNode>;

export function buildDependencyGraph(deps: DependencyMap): DependencyGraph {
  const graph: DependencyGraph = new Map();

  for (const [name, entry] of deps.entries()) {
    if (!graph.has(name)) {
      graph.set(name, {
        name,
        version: entry.version,
        dependents: [],
        dependencies: Object.keys(entry.requires ?? {}),
      });
    }
  }

  for (const [name, node] of graph.entries()) {
    for (const dep of node.dependencies) {
      const depNode = graph.get(dep);
      if (depNode && !depNode.dependents.includes(name)) {
        depNode.dependents.push(name);
      }
    }
  }

  return graph;
}

export function getImpactedPackages(
  graph: DependencyGraph,
  changedPackage: string
): string[] {
  const visited = new Set<string>();
  const queue = [changedPackage];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const node = graph.get(current);
    if (node) {
      for (const dependent of node.dependents) {
        if (!visited.has(dependent)) queue.push(dependent);
      }
    }
  }

  visited.delete(changedPackage);
  return Array.from(visited).sort();
}

export function formatGraphSummaryText(
  graph: DependencyGraph,
  impacted: Map<string, string[]>
): string {
  const lines: string[] = ['Dependency Impact Graph', '======================='];
  for (const [pkg, affected] of impacted.entries()) {
    lines.push(`\n${pkg} affects ${affected.length} package(s):`);
    for (const dep of affected) {
      const node = graph.get(dep);
      lines.push(`  - ${dep}@${node?.version ?? 'unknown'}`);
    }
  }
  return lines.join('\n');
}
