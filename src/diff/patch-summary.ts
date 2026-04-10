import { DependencyMap } from '../parser';
import { ChangeEntry } from './change-set-diff';

export interface PatchSummary {
  package: string;
  from: string;
  to: string;
  changeType: 'patch' | 'minor' | 'major' | 'added' | 'removed';
  isDirect: boolean;
}

export function buildPatchSummary(
  base: DependencyMap,
  head: DependencyMap,
  directDeps: Set<string> = new Set()
): PatchSummary[] {
  const summaries: PatchSummary[] = [];
  const allKeys = new Set([...Object.keys(base), ...Object.keys(head)]);

  for (const pkg of allKeys) {
    const fromEntry = base[pkg];
    const toEntry = head[pkg];

    if (!fromEntry && toEntry) {
      summaries.push({
        package: pkg,
        from: '',
        to: toEntry.version,
        changeType: 'added',
        isDirect: directDeps.has(pkg),
      });
      continue;
    }

    if (fromEntry && !toEntry) {
      summaries.push({
        package: pkg,
        from: fromEntry.version,
        to: '',
        changeType: 'removed',
        isDirect: directDeps.has(pkg),
      });
      continue;
    }

    if (fromEntry && toEntry && fromEntry.version !== toEntry.version) {
      summaries.push({
        package: pkg,
        from: fromEntry.version,
        to: toEntry.version,
        changeType: classifyVersionChange(fromEntry.version, toEntry.version),
        isDirect: directDeps.has(pkg),
      });
    }
  }

  return summaries.sort((a, b) => a.package.localeCompare(b.package));
}

function classifyVersionChange(
  from: string,
  to: string
): 'patch' | 'minor' | 'major' {
  const fromParts = from.replace(/^[^\d]*/, '').split('.').map(Number);
  const toParts = to.replace(/^[^\d]*/, '').split('.').map(Number);

  if ((toParts[0] ?? 0) !== (fromParts[0] ?? 0)) return 'major';
  if ((toParts[1] ?? 0) !== (fromParts[1] ?? 0)) return 'minor';
  return 'patch';
}

export function formatPatchSummaryText(summaries: PatchSummary[]): string {
  if (summaries.length === 0) return 'No dependency changes detected.';

  const lines: string[] = ['Dependency Patch Summary', '========================'];
  for (const s of summaries) {
    const scope = s.isDirect ? '[direct]' : '[transitive]';
    const change =
      s.changeType === 'added'
        ? `added @ ${s.to}`
        : s.changeType === 'removed'
        ? `removed (was ${s.from})`
        : `${s.from} → ${s.to} (${s.changeType})`;
    lines.push(`  ${scope} ${s.package}: ${change}`);
  }
  return lines.join('\n');
}
