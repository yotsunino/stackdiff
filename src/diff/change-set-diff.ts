import { DependencyMap } from '../parser';
import { diffDirect, DirectChange } from './direct-diff';
import { diffTransitive, TransitiveChange } from './transitive-diff';

export interface ChangeSet {
  direct: DirectChange[];
  transitive: TransitiveChange[];
  totalAdded: number;
  totalRemoved: number;
  totalUpdated: number;
  breakingCount: number;
}

/**
 * Combines direct and transitive diffs into a unified change set.
 */
export function diffChangeSets(
  base: DependencyMap,
  head: DependencyMap
): ChangeSet {
  const direct = diffDirect(base, head);
  const transitive = diffTransitive(base, head);

  const totalAdded = direct.filter((c) => c.type === 'added').length;
  const totalRemoved = direct.filter((c) => c.type === 'removed').length;
  const totalUpdated = direct.filter((c) => c.type === 'updated').length;
  const breakingCount = [
    ...direct.filter((c) => c.breaking),
    ...transitive.filter((c) => c.breaking),
  ].length;

  return { direct, transitive, totalAdded, totalRemoved, totalUpdated, breakingCount };
}

/**
 * Formats a ChangeSet into a human-readable summary string.
 */
export function formatChangeSetSummary(cs: ChangeSet): string {
  const lines: string[] = [];

  lines.push(
    `Direct changes: +${cs.totalAdded} added, -${cs.totalRemoved} removed, ~${cs.totalUpdated} updated`
  );
  lines.push(`Transitive changes: ${cs.transitive.length}`);

  if (cs.breakingCount > 0) {
    lines.push(`⚠️  Breaking changes detected: ${cs.breakingCount}`);
  } else {
    lines.push('✅  No breaking changes detected');
  }

  if (cs.direct.length > 0) {
    lines.push('');
    lines.push('Direct:');
    for (const c of cs.direct) {
      const breaking = c.breaking ? ' [BREAKING]' : '';
      if (c.type === 'added') {
        lines.push(`  + ${c.name}@${c.headVersion}${breaking}`);
      } else if (c.type === 'removed') {
        lines.push(`  - ${c.name}@${c.baseVersion}${breaking}`);
      } else {
        lines.push(`  ~ ${c.name}: ${c.baseVersion} → ${c.headVersion}${breaking}`);
      }
    }
  }

  return lines.join('\n');
}
