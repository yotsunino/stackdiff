export interface ChurnEntry {
  name: string;
  changeCount: number;
  versions: string[];
  churnScore: number;
}

export interface ChurnReport {
  entries: ChurnEntry[];
  totalChurn: number;
  highChurnPackages: ChurnEntry[];
}

export type DepMap = Map<string, { version: string; resolved?: string }>;

const HIGH_CHURN_THRESHOLD = 3;

export function computeChurnScore(changeCount: number, versionJumps: number): number {
  return changeCount * 1 + versionJumps * 2;
}

export function buildChurnReport(
  snapshots: DepMap[]
): ChurnReport {
  if (snapshots.length < 2) {
    return { entries: [], totalChurn: 0, highChurnPackages: [] };
  }

  const packageVersions = new Map<string, Set<string>>();
  const packageChanges = new Map<string, number>();

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];

    const allKeys = new Set([...prev.keys(), ...curr.keys()]);
    for (const name of allKeys) {
      const prevEntry = prev.get(name);
      const currEntry = curr.get(name);
      const prevVer = prevEntry?.version ?? null;
      const currVer = currEntry?.version ?? null;

      if (!packageVersions.has(name)) packageVersions.set(name, new Set());
      if (prevVer) packageVersions.get(name)!.add(prevVer);
      if (currVer) packageVersions.get(name)!.add(currVer);

      if (prevVer !== currVer) {
        packageChanges.set(name, (packageChanges.get(name) ?? 0) + 1);
      }
    }
  }

  const entries: ChurnEntry[] = [];
  for (const [name, changeCount] of packageChanges.entries()) {
    const versions = [...(packageVersions.get(name) ?? [])];
    const churnScore = computeChurnScore(changeCount, versions.length - 1);
    entries.push({ name, changeCount, versions, churnScore });
  }

  entries.sort((a, b) => b.churnScore - a.churnScore);

  const totalChurn = entries.reduce((sum, e) => sum + e.churnScore, 0);
  const highChurnPackages = entries.filter(e => e.changeCount >= HIGH_CHURN_THRESHOLD);

  return { entries, totalChurn, highChurnPackages };
}

export function formatChurnReportText(report: ChurnReport): string {
  if (report.entries.length === 0) return 'No churn detected across snapshots.';

  const lines: string[] = [`Dependency Churn Report (total score: ${report.totalChurn})`, ''];

  for (const entry of report.entries) {
    const flag = entry.changeCount >= HIGH_CHURN_THRESHOLD ? ' [HIGH]' : '';
    lines.push(`  ${entry.name}${flag}: ${entry.changeCount} change(s), versions seen: ${entry.versions.join(', ')} (score: ${entry.churnScore})`);
  }

  if (report.highChurnPackages.length > 0) {
    lines.push('');
    lines.push(`High-churn packages (>= ${HIGH_CHURN_THRESHOLD} changes): ${report.highChurnPackages.map(e => e.name).join(', ')}`);
  }

  return lines.join('\n');
}
