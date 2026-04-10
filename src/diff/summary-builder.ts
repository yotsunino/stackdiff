import { DependencyMap } from '../parser';
import { ChangeSetSummary } from './change-set-diff';
import { TransitiveSummary } from './transitive-diff';

export interface DiffSummary {
  totalChanged: number;
  added: number;
  removed: number;
  upgraded: number;
  downgraded: number;
  majorChanges: number;
  minorChanges: number;
  patchChanges: number;
  hasBreakingChanges: boolean;
  transitiveChanged: number;
}

export interface ChangeEntry {
  name: string;
  from: string | null;
  to: string | null;
  changeType: 'added' | 'removed' | 'upgraded' | 'downgraded' | 'changed';
  severity: 'major' | 'minor' | 'patch' | 'none';
}

export function buildDiffSummary(
  entries: ChangeEntry[],
  transitiveCount: number = 0
): DiffSummary {
  const added = entries.filter((e) => e.changeType === 'added').length;
  const removed = entries.filter((e) => e.changeType === 'removed').length;
  const upgraded = entries.filter((e) => e.changeType === 'upgraded').length;
  const downgraded = entries.filter((e) => e.changeType === 'downgraded').length;
  const majorChanges = entries.filter((e) => e.severity === 'major').length;
  const minorChanges = entries.filter((e) => e.severity === 'minor').length;
  const patchChanges = entries.filter((e) => e.severity === 'patch').length;

  return {
    totalChanged: entries.length,
    added,
    removed,
    upgraded,
    downgraded,
    majorChanges,
    minorChanges,
    patchChanges,
    hasBreakingChanges: majorChanges > 0,
    transitiveChanged: transitiveCount,
  };
}

export function formatSummaryText(summary: DiffSummary): string {
  const lines: string[] = [];
  lines.push('=== Diff Summary ===');
  lines.push(`Total changed:    ${summary.totalChanged}`);
  lines.push(`  Added:          ${summary.added}`);
  lines.push(`  Removed:        ${summary.removed}`);
  lines.push(`  Upgraded:       ${summary.upgraded}`);
  lines.push(`  Downgraded:     ${summary.downgraded}`);
  lines.push(`Severity breakdown:`);
  lines.push(`  Major (breaking): ${summary.majorChanges}`);
  lines.push(`  Minor:            ${summary.minorChanges}`);
  lines.push(`  Patch:            ${summary.patchChanges}`);
  lines.push(`Transitive changed: ${summary.transitiveChanged}`);
  if (summary.hasBreakingChanges) {
    lines.push('⚠️  Breaking changes detected!');
  } else {
    lines.push('✅  No breaking changes detected.');
  }
  return lines.join('\n');
}

export function formatSummaryJson(summary: DiffSummary): string {
  return JSON.stringify(summary, null, 2);
}
