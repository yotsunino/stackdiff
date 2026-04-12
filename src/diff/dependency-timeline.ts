import { DependencyMap } from './index';

export interface TimelineEntry {
  name: string;
  fromVersion: string | null;
  toVersion: string | null;
  changeType: 'added' | 'removed' | 'upgraded' | 'downgraded' | 'unchanged';
  versionHistory: string[];
}

export interface TimelineReport {
  entries: TimelineEntry[];
  totalChanged: number;
  addedCount: number;
  removedCount: number;
  upgradedCount: number;
  downgradedCount: number;
}

export function classifyTimelineChange(
  from: string | null,
  to: string | null
): TimelineEntry['changeType'] {
  if (!from && to) return 'added';
  if (from && !to) return 'removed';
  if (!from && !to) return 'unchanged';
  const [fMaj, fMin, fPatch] = (from as string).split('.').map(Number);
  const [tMaj, tMin, tPatch] = (to as string).split('.').map(Number);
  if (tMaj > fMaj || tMin > fMin || tPatch > fPatch) return 'upgraded';
  if (tMaj < fMaj || tMin < fMin || tPatch < fPatch) return 'downgraded';
  return 'unchanged';
}

export function buildTimeline(
  base: DependencyMap,
  head: DependencyMap
): TimelineReport {
  const allNames = new Set([...Object.keys(base), ...Object.keys(head)]);
  const entries: TimelineEntry[] = [];

  for (const name of allNames) {
    const fromVersion = base[name]?.version ?? null;
    const toVersion = head[name]?.version ?? null;
    const changeType = classifyTimelineChange(fromVersion, toVersion);
    const versionHistory = [...new Set([fromVersion, toVersion].filter(Boolean) as string[])];
    entries.push({ name, fromVersion, toVersion, changeType, versionHistory });
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  return {
    entries,
    totalChanged: entries.filter(e => e.changeType !== 'unchanged').length,
    addedCount: entries.filter(e => e.changeType === 'added').length,
    removedCount: entries.filter(e => e.changeType === 'removed').length,
    upgradedCount: entries.filter(e => e.changeType === 'upgraded').length,
    downgradedCount: entries.filter(e => e.changeType === 'downgraded').length,
  };
}

export function formatTimelineReportText(report: TimelineReport): string {
  const lines: string[] = ['Dependency Timeline Report', '=========================='];
  lines.push(`Total changed: ${report.totalChanged}`);
  lines.push(`  Added: ${report.addedCount}  Removed: ${report.removedCount}  Upgraded: ${report.upgradedCount}  Downgraded: ${report.downgradedCount}`);
  lines.push('');
  for (const e of report.entries) {
    if (e.changeType === 'unchanged') continue;
    const arrow = e.fromVersion && e.toVersion ? `${e.fromVersion} → ${e.toVersion}` : e.toVersion ?? e.fromVersion ?? '';
    lines.push(`  [${e.changeType.toUpperCase()}] ${e.name}: ${arrow}`);
  }
  return lines.join('\n');
}
