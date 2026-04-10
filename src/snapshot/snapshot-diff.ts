import { Snapshot } from './snapshot-store';
import { diffDependencies, DiffResult } from '../diff/dependency-differ';

export interface SnapshotDiffResult {
  base: string;
  target: string;
  baseTimestamp: number;
  targetTimestamp: number;
  diff: DiffResult[];
}

export function diffSnapshots(
  base: Snapshot,
  target: Snapshot
): SnapshotDiffResult {
  const diff = diffDependencies(base.dependencies, target.dependencies);
  return {
    base: base.branch,
    target: target.branch,
    baseTimestamp: base.timestamp,
    targetTimestamp: target.timestamp,
    diff,
  };
}

export function formatSnapshotDiffSummary(result: SnapshotDiffResult): string {
  const lines: string[] = [
    `Snapshot diff: ${result.base} → ${result.target}`,
    `Base captured:   ${new Date(result.baseTimestamp).toISOString()}`,
    `Target captured: ${new Date(result.targetTimestamp).toISOString()}`,
    `Changes: ${result.diff.length}`,
    '',
  ];
  for (const entry of result.diff) {
    const from = entry.from ?? '(new)';
    const to = entry.to ?? '(removed)';
    lines.push(`  ${entry.name}: ${from} → ${to} [${entry.changeType}]`);
  }
  return lines.join('\n');
}
