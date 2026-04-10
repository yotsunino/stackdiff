import { DependencyMap } from '../parser';
import { changeLabel, isBreakingChange } from '../resolver/version-resolver';

export interface DirectDiffEntry {
  name: string;
  from: string | null;
  to: string | null;
  change: 'added' | 'removed' | 'upgraded' | 'downgraded' | 'unchanged';
  label: string;
  breaking: boolean;
}

export function classifyChange(
  from: string | null,
  to: string | null
): DirectDiffEntry['change'] {
  if (from === null) return 'added';
  if (to === null) return 'removed';
  if (from === to) return 'unchanged';
  const [fMajor, fMinor, fPatch] = from.split('.').map(Number);
  const [tMajor, tMinor, tPatch] = to.split('.').map(Number);
  if (tMajor > fMajor || tMinor > fMinor || tPatch > fPatch) return 'upgraded';
  return 'downgraded';
}

export function diffDirect(
  base: DependencyMap,
  head: DependencyMap
): DirectDiffEntry[] {
  const names = new Set([...Object.keys(base), ...Object.keys(head)]);
  const results: DirectDiffEntry[] = [];

  for (const name of names) {
    const from = base[name]?.version ?? null;
    const to = head[name]?.version ?? null;

    if (from === to) continue;

    const change = classifyChange(from, to);
    const label =
      from && to
        ? changeLabel(from, to)
        : change === 'added'
        ? 'new'
        : 'removed';
    const breaking =
      from !== null && to !== null ? isBreakingChange(from, to) : false;

    results.push({ name, from, to, change, label, breaking });
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export function formatDirectSummary(entries: DirectDiffEntry[]): string {
  if (entries.length === 0) return 'No direct dependency changes.';

  const lines: string[] = ['Direct dependency changes:'];
  for (const e of entries) {
    const arrow =
      e.from && e.to
        ? `${e.from} → ${e.to}`
        : e.from
        ? `${e.from} (removed)`
        : `${e.to} (added)`;
    const flag = e.breaking ? ' ⚠ BREAKING' : '';
    lines.push(`  ${e.change.toUpperCase().padEnd(10)} ${e.name}@${arrow} [${e.label}]${flag}`);
  }
  return lines.join('\n');
}
