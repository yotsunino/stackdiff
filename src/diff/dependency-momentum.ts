export interface MomentumEntry {
  name: string;
  from: string;
  to: string;
  versionDelta: number;
  ageDays: number;
  score: number;
  label: 'accelerating' | 'steady' | 'decelerating' | 'stalled';
}

export interface MomentumReport {
  entries: MomentumEntry[];
  averageScore: number;
  summary: string;
}

export type DepMap = Map<string, { version: string; age?: number }>;

export function computeVersionDelta(from: string, to: string): number {
  const parse = (v: string) => v.replace(/^[^0-9]*/, '').split('.').map(Number);
  const [fMaj, fMin, fPat] = parse(from);
  const [tMaj, tMin, tPat] = parse(to);
  if (tMaj !== fMaj) return (tMaj - fMaj) * 100;
  if (tMin !== fMin) return (tMin - fMin) * 10;
  return (tPat ?? 0) - (fPat ?? 0);
}

export function classifyMomentum(score: number): MomentumEntry['label'] {
  if (score >= 70) return 'accelerating';
  if (score >= 40) return 'steady';
  if (score >= 10) return 'decelerating';
  return 'stalled';
}

export function buildMomentumReport(base: DepMap, head: DepMap): MomentumReport {
  const entries: MomentumEntry[] = [];

  for (const [name, headEntry] of head) {
    const baseEntry = base.get(name);
    if (!baseEntry || baseEntry.version === headEntry.version) continue;

    const versionDelta = computeVersionDelta(baseEntry.version, headEntry.version);
    const ageDays = headEntry.age ?? 0;
    const score = Math.min(100, Math.max(0, versionDelta * 5 + (ageDays > 0 ? Math.min(50, 365 / ageDays) * 10 : 0)));
    const label = classifyMomentum(score);

    entries.push({ name, from: baseEntry.version, to: headEntry.version, versionDelta, ageDays, score, label });
  }

  const averageScore = entries.length
    ? Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length)
    : 0;

  const summary = `${entries.length} changed packages; average momentum score: ${averageScore}`;
  return { entries, averageScore, summary };
}

export function formatMomentumReportText(report: MomentumReport): string {
  if (report.entries.length === 0) return 'No momentum data — no version changes detected.\n';
  const lines: string[] = ['Dependency Momentum Report', '=========================='];
  for (const e of report.entries) {
    lines.push(`  ${e.name}: ${e.from} → ${e.to}  score=${e.score}  [${e.label}]`);
  }
  lines.push('');
  lines.push(report.summary);
  return lines.join('\n') + '\n';
}
