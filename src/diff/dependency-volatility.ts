export type VolatilityLevel = 'stable' | 'moderate' | 'volatile' | 'highly-volatile';

export interface VolatilityEntry {
  name: string;
  from: string;
  to: string;
  score: number;
  volatility: VolatilityLevel;
}

export interface VolatilityReport {
  entries: VolatilityEntry[];
  totalScore: number;
  overall: VolatilityLevel;
}

type DepMap = Map<string, { version: string; dependencies?: Record<string, string> }>;

export function changeDepth(from: string, to: string): number {
  const parse = (v: string) => v.replace(/^[^\d]*/, '').split('.').map(Number);
  const [fMaj, fMin, fPat] = parse(from);
  const [tMaj, tMin, tPat] = parse(to);
  if (tMaj !== fMaj) return 3;
  if (tMin !== fMin) return 2;
  if (tPat !== fPat) return 1;
  return 0;
}

export function classifyVolatility(score: number): VolatilityLevel {
  if (score >= 50) return 'highly-volatile';
  if (score >= 25) return 'volatile';
  if (score >= 10) return 'moderate';
  return 'stable';
}

function computeScore(from: string, to: string): number {
  const depth = changeDepth(from, to);
  const weights: Record<number, number> = { 0: 0, 1: 5, 2: 15, 3: 30 };
  const parse = (v: string) => v.replace(/^[^\d]*/, '').split('.').map(Number);
  const [fMaj] = parse(from);
  const preReleasePenalty = fMaj === 0 ? 10 : 0;
  return (weights[depth] ?? 0) + preReleasePenalty;
}

export function buildVolatilityReport(base: DepMap, head: DepMap): VolatilityReport {
  const entries: VolatilityEntry[] = [];

  for (const [name, headPkg] of head) {
    const basePkg = base.get(name);
    if (!basePkg) continue;
    if (basePkg.version === headPkg.version) continue;

    const score = computeScore(basePkg.version, headPkg.version);
    if (score === 0) continue;

    entries.push({
      name,
      from: basePkg.version,
      to: headPkg.version,
      score,
      volatility: classifyVolatility(score),
    });
  }

  entries.sort((a, b) => b.score - a.score);

  const totalScore = entries.reduce((sum, e) => sum + e.score, 0);
  const overall = classifyVolatility(entries.length > 0 ? totalScore / entries.length : 0);

  return { entries, totalScore, overall };
}

export function formatVolatilityReportText(report: VolatilityReport): string {
  if (report.entries.length === 0) {
    return 'No volatility detected across dependency versions.';
  }

  const lines: string[] = [
    `Dependency Volatility Report (overall: ${report.overall}, score: ${report.totalScore})`,
    '─'.repeat(60),
  ];

  for (const entry of report.entries) {
    lines.push(
      `  ${entry.name.padEnd(30)} ${entry.from} → ${entry.to}  [${entry.volatility}] score=${entry.score}`
    );
  }

  lines.push('─'.repeat(60));
  lines.push(`Total packages analysed: ${report.entries.length}`);

  return lines.join('\n');
}
