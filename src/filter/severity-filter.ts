export type SeverityLevel = 'major' | 'minor' | 'patch' | 'all';

export interface ConflictEntry {
  name: string;
  fromVersion: string;
  toVersion: string;
  changeType: 'major' | 'minor' | 'patch';
  isPeerIssue?: boolean;
  isTransitive?: boolean;
}

export function meetsThreshold(
  entry: ConflictEntry,
  threshold: SeverityLevel
): boolean {
  if (threshold === 'all') return true;

  const order: Record<string, number> = { patch: 0, minor: 1, major: 2 };
  const entryLevel = order[entry.changeType] ?? 0;
  const thresholdLevel = order[threshold] ?? 0;

  return entryLevel >= thresholdLevel;
}

export function filterBySeverity(
  entries: ConflictEntry[],
  threshold: SeverityLevel
): ConflictEntry[] {
  return entries.filter((e) => meetsThreshold(e, threshold));
}

export function groupBySeverity(
  entries: ConflictEntry[]
): Record<SeverityLevel, ConflictEntry[]> {
  return {
    major: entries.filter((e) => e.changeType === 'major'),
    minor: entries.filter((e) => e.changeType === 'minor'),
    patch: entries.filter((e) => e.changeType === 'patch'),
    all: entries,
  };
}
