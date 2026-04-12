import { DepMap } from './index';

export interface FreshnessEntry {
  name: string;
  current: string;
  latest: string;
  behindMajor: number;
  behindMinor: number;
  behindPatch: number;
  freshnessScore: number; // 0-100, higher is fresher
}

export interface FreshnessReport {
  entries: FreshnessEntry[];
  averageScore: number;
  staleCount: number;
  freshCount: number;
}

export function parseTuple(version: string): [number, number, number] {
  const clean = version.replace(/^[^\d]*/, '');
  const parts = clean.split('.').map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function computeFreshnessScore(
  current: string,
  latest: string
): { score: number; behindMajor: number; behindMinor: number; behindPatch: number } {
  const [cMaj, cMin, cPat] = parseTuple(current);
  const [lMaj, lMin, lPat] = parseTuple(latest);

  const behindMajor = Math.max(0, lMaj - cMaj);
  const behindMinor = cMaj === lMaj ? Math.max(0, lMin - cMin) : 0;
  const behindPatch = cMaj === lMaj && cMin === lMin ? Math.max(0, lPat - cPat) : 0;

  let score = 100;
  score -= behindMajor * 30;
  score -= behindMinor * 10;
  score -= behindPatch * 2;
  score = Math.max(0, Math.min(100, score));

  return { score, behindMajor, behindMinor, behindPatch };
}

export function buildFreshnessReport(
  current: DepMap,
  latest: DepMap
): FreshnessReport {
  const entries: FreshnessEntry[] = [];

  for (const [name, currentEntry] of current.entries()) {
    const latestEntry = latest.get(name);
    if (!latestEntry) continue;

    const { score, behindMajor, behindMinor, behindPatch } = computeFreshnessScore(
      currentEntry.version,
      latestEntry.version
    );

    entries.push({
      name,
      current: currentEntry.version,
      latest: latestEntry.version,
      behindMajor,
      behindMinor,
      behindPatch,
      freshnessScore: score,
    });
  }

  entries.sort((a, b) => a.freshnessScore - b.freshnessScore);

  const averageScore =
    entries.length > 0
      ? Math.round(entries.reduce((sum, e) => sum + e.freshnessScore, 0) / entries.length)
      : 100;

  const staleCount = entries.filter(e => e.freshnessScore < 70).length;
  const freshCount = entries.filter(e => e.freshnessScore >= 90).length;

  return { entries, averageScore, staleCount, freshCount };
}

export function formatFreshnessReportText(report: FreshnessReport): string {
  const lines: string[] = [];
  lines.push(`Dependency Freshness Report`);
  lines.push(`Average Score: ${report.averageScore}/100 | Fresh: ${report.freshCount} | Stale: ${report.staleCount}`);
  lines.push('');

  for (const e of report.entries) {
    const delta = [];
    if (e.behindMajor > 0) delta.push(`${e.behindMajor} major`);
    if (e.behindMinor > 0) delta.push(`${e.behindMinor} minor`);
    if (e.behindPatch > 0) delta.push(`${e.behindPatch} patch`);
    const behind = delta.length > 0 ? `behind by ${delta.join(', ')}` : 'up to date';
    lines.push(`  ${e.name}: ${e.current} → ${e.latest} (${behind}) [score: ${e.freshnessScore}]`);
  }

  return lines.join('\n');
}
