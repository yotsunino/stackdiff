import { DependencyMap } from '../parser';
import { DiffEntry } from './index';
import { diffDirect } from './direct-diff';

export interface BaselineComparison {
  baselineName: string;
  added: DiffEntry[];
  removed: DiffEntry[];
  changed: DiffEntry[];
  totalDrift: number;
}

/**
 * Compares a current dependency map against a named baseline snapshot.
 */
export function compareToBaseline(
  baselineName: string,
  baseline: DependencyMap,
  current: DependencyMap
): BaselineComparison {
  const entries = diffDirect(baseline, current);

  const added = entries.filter((e) => e.type === 'added');
  const removed = entries.filter((e) => e.type === 'removed');
  const changed = entries.filter((e) => e.type === 'changed');

  return {
    baselineName,
    added,
    removed,
    changed,
    totalDrift: added.length + removed.length + changed.length,
  };
}

/**
 * Returns true when the current map has drifted beyond the allowed threshold.
 */
export function exceedsDriftThreshold(
  comparison: BaselineComparison,
  maxDrift: number
): boolean {
  return comparison.totalDrift > maxDrift;
}

/**
 * Formats a human-readable summary of baseline drift.
 */
export function formatBaselineSummary(comparison: BaselineComparison): string {
  const { baselineName, added, removed, changed, totalDrift } = comparison;
  const lines: string[] = [
    `Baseline: ${baselineName}`,
    `Total drift: ${totalDrift} package(s)`,
    `  Added:   ${added.length}`,
    `  Removed: ${removed.length}`,
    `  Changed: ${changed.length}`,
  ];

  if (changed.length > 0) {
    lines.push('\nChanged packages:');
    for (const entry of changed) {
      lines.push(`  ${entry.name}: ${entry.from} → ${entry.to}`);
    }
  }

  return lines.join('\n');
}
