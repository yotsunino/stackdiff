import { flattenTransitiveDeps, findTransitiveConflicts, TransitiveConflict } from '../resolver/transitive-resolver';
import { ParsedLockfile } from '../parser/package-lock-parser';

export interface TransitiveDiffResult {
  conflicts: TransitiveConflict[];
  breakingCount: number;
  nonBreakingCount: number;
  addedCount: number;
  removedCount: number;
}

/**
 * Produce a full transitive diff between two parsed lockfiles.
 */
export function diffTransitive(
  base: ParsedLockfile,
  head: ParsedLockfile
): TransitiveDiffResult {
  const baseFlat = flattenTransitiveDeps(base.dependencies ?? {});
  const headFlat = flattenTransitiveDeps(head.dependencies ?? {});

  const conflicts = findTransitiveConflicts(baseFlat, headFlat);

  const addedCount = [...headFlat.keys()].filter((k) => !baseFlat.has(k)).length;
  const removedCount = [...baseFlat.keys()].filter((k) => !headFlat.has(k)).length;
  const breakingCount = conflicts.filter((c) => c.breaking).length;
  const nonBreakingCount = conflicts.filter((c) => !c.breaking).length;

  return { conflicts, breakingCount, nonBreakingCount, addedCount, removedCount };
}

/**
 * Format the transitive diff result as a human-readable summary string.
 */
export function formatTransitiveSummary(result: TransitiveDiffResult): string {
  const lines: string[] = [
    `Transitive dependency diff:`,
    `  Added:       ${result.addedCount}`,
    `  Removed:     ${result.removedCount}`,
    `  Breaking:    ${result.breakingCount}`,
    `  Compatible:  ${result.nonBreakingCount}`,
  ];

  if (result.conflicts.length > 0) {
    lines.push('\nConflicts:');
    for (const c of result.conflicts) {
      const tag = c.breaking ? '[BREAKING]' : '[compat]';
      lines.push(
        `  ${tag} ${c.name}: ${c.baseVersion} → ${c.headVersion}  (via ${c.requiredBy.join(', ')})`
      );
    }
  }

  return lines.join('\n');
}
