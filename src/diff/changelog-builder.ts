import { DepMap } from './index';

export interface ChangelogEntry {
  name: string;
  from: string | null;
  to: string | null;
  type: 'added' | 'removed' | 'upgraded' | 'downgraded' | 'unchanged';
}

export interface Changelog {
  entries: ChangelogEntry[];
  added: number;
  removed: number;
  upgraded: number;
  downgraded: number;
}

export function classifyChangelogType(
  from: string | undefined,
  to: string | undefined
): ChangelogEntry['type'] {
  if (!from && to) return 'added';
  if (from && !to) return 'removed';
  if (!from || !to) return 'unchanged';
  const [fMaj, fMin, fPat] = from.split('.').map(Number);
  const [tMaj, tMin, tPat] = to.split('.').map(Number);
  if (tMaj > fMaj || tMin > fMin || tPat > fPat) return 'upgraded';
  if (tMaj < fMaj || tMin < fMin || tPat < fPat) return 'downgraded';
  return 'unchanged';
}

export function buildChangelog(base: DepMap, head: DepMap): Changelog {
  const names = new Set([...Object.keys(base), ...Object.keys(head)]);
  const entries: ChangelogEntry[] = [];

  for (const name of names) {
    const from = base[name]?.version ?? null;
    const to = head[name]?.version ?? null;
    const type = classifyChangelogType(from ?? undefined, to ?? undefined);
    if (type !== 'unchanged') {
      entries.push({ name, from, to, type });
    }
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  return {
    entries,
    added: entries.filter(e => e.type === 'added').length,
    removed: entries.filter(e => e.type === 'removed').length,
    upgraded: entries.filter(e => e.type === 'upgraded').length,
    downgraded: entries.filter(e => e.type === 'downgraded').length,
  };
}

export function formatChangelogText(changelog: Changelog): string {
  if (changelog.entries.length === 0) return 'No dependency changes detected.\n';

  const lines: string[] = ['Dependency Changelog', '===================='];
  const groups: Record<ChangelogEntry['type'], ChangelogEntry[]> = {
    added: [], removed: [], upgraded: [], downgraded: [], unchanged: []
  };

  for (const entry of changelog.entries) {
    groups[entry.type].push(entry);
  }

  const sections: Array<[ChangelogEntry['type'], string]> = [
    ['added', '+ Added'],
    ['removed', '- Removed'],
    ['upgraded', '↑ Upgraded'],
    ['downgraded', '↓ Downgraded'],
  ];

  for (const [type, label] of sections) {
    const group = groups[type];
    if (group.length === 0) continue;
    lines.push(`\n${label} (${group.length})`);
    for (const e of group) {
      const fromStr = e.from ?? 'none';
      const toStr = e.to ?? 'none';
      lines.push(`  ${e.name}: ${fromStr} → ${toStr}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
