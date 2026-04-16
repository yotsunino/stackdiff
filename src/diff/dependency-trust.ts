export interface TrustEntry {
  name: string;
  version: string;
  publishedAt?: string;
  downloadsPerWeek?: number;
  hasTypes?: boolean;
  maintainerCount?: number;
}

export type TrustLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface TrustResult {
  name: string;
  version: string;
  trustLevel: TrustLevel;
  score: number;
  reasons: string[];
}

export interface TrustReport {
  entries: TrustResult[];
  averageScore: number;
  lowTrustCount: number;
}

export function scoreTrust(entry: TrustEntry): TrustResult {
  let score = 0;
  const reasons: string[] = [];

  if (entry.downloadsPerWeek !== undefined) {
    if (entry.downloadsPerWeek >= 100_000) { score += 40; reasons.push('high download volume'); }
    else if (entry.downloadsPerWeek >= 10_000) { score += 25; reasons.push('moderate download volume'); }
    else { reasons.push('low download volume'); }
  }

  if (entry.maintainerCount !== undefined) {
    if (entry.maintainerCount >= 3) { score += 30; reasons.push('multiple maintainers'); }
    else if (entry.maintainerCount === 2) { score += 15; reasons.push('two maintainers'); }
    else { reasons.push('single maintainer'); }
  }

  if (entry.hasTypes) { score += 20; reasons.push('ships TypeScript types'); }

  if (entry.publishedAt) {
    const ageMs = Date.now() - new Date(entry.publishedAt).getTime();
    const ageDays = ageMs / 86_400_000;
    if (ageDays > 180) { score += 10; reasons.push('established release'); }
  }

  const trustLevel: TrustLevel =
    score >= 70 ? 'high' : score >= 40 ? 'medium' : score > 0 ? 'low' : 'unknown';

  return { name: entry.name, version: entry.version, trustLevel, score, reasons };
}

export function buildTrustReport(entries: TrustEntry[]): TrustReport {
  const results = entries.map(scoreTrust);
  const averageScore = results.length
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 0;
  const lowTrustCount = results.filter(r => r.trustLevel === 'low' || r.trustLevel === 'unknown').length;
  return { entries: results, averageScore, lowTrustCount };
}

export function formatTrustReportText(report: TrustReport): string {
  const lines: string[] = ['Dependency Trust Report', '======================='];
  for (const e of report.entries) {
    lines.push(`${e.name}@${e.version}  [${e.trustLevel.toUpperCase()}] score=${e.score}`);
    for (const r of e.reasons) lines.push(`  • ${r}`);
  }
  lines.push('');
  lines.push(`Average score: ${report.averageScore}  Low-trust packages: ${report.lowTrustCount}`);
  return lines.join('\n');
}
