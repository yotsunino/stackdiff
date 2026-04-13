import { DepMap } from './index';

export interface VelocityEntry {
  name: string;
  fromVersion: string;
  toVersion: string;
  majorBumps: number;
  minorBumps: number;
  patchBumps: number;
  velocityScore: number;
  label: 'rapid' | 'moderate' | 'stable' | 'stale';
}

export interface VelocityReport {
  entries: VelocityEntry[];
  averageVelocity: number;
  rapidCount: number;
  staleCount: number;
}

function parseTuple(version: string): [number, number, number] {
  const parts = version.replace(/^[^\d]*/, '').split('.').map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function computeVelocityScore(from: string, to: string): number {
  const [fMaj, fMin, fPat] = parseTuple(from);
  const [tMaj, tMin, tPat] = parseTuple(to);
  const majorDelta = Math.max(0, tMaj - fMaj);
  const minorDelta = Math.max(0, tMin - fMin);
  const patchDelta = Math.max(0, tPat - fPat);
  return majorDelta * 10 + minorDelta * 2 + patchDelta * 0.5;
}

export function classifyVelocity(score: number): VelocityEntry['label'] {
  if (score === 0) return 'stale';
  if (score >= 10) return 'rapid';
  if (score >= 3) return 'moderate';
  return 'stable';
}

export function buildVelocityReport(base: DepMap, head: DepMap): VelocityReport {
  const entries: VelocityEntry[] = [];

  for (const [name, headEntry] of Object.entries(head)) {
    const baseEntry = base[name];
    if (!baseEntry) continue;
    const from = baseEntry.version;
    const to = headEntry.version;
    if (from === to) continue;

    const [fMaj, fMin, fPat] = parseTuple(from);
    const [tMaj, tMin, tPat] = parseTuple(to);
    const score = computeVelocityScore(from, to);

    entries.push({
      name,
      fromVersion: from,
      toVersion: to,
      majorBumps: Math.max(0, tMaj - fMaj),
      minorBumps: Math.max(0, tMin - fMin),
      patchBumps: Math.max(0, tPat - fPat),
      velocityScore: score,
      label: classifyVelocity(score),
    });
  }

  entries.sort((a, b) => b.velocityScore - a.velocityScore);
  const averageVelocity =
    entries.length > 0
      ? entries.reduce((sum, e) => sum + e.velocityScore, 0) / entries.length
      : 0;

  return {
    entries,
    averageVelocity: Math.round(averageVelocity * 100) / 100,
    rapidCount: entries.filter(e => e.label === 'rapid').length,
    staleCount: entries.filter(e => e.label === 'stale').length,
  };
}

export function formatVelocityReportText(report: VelocityReport): string {
  if (report.entries.length === 0) return 'No version changes detected.';
  const lines: string[] = [
    `Dependency Velocity Report`,
    `Average velocity score: ${report.averageVelocity}`,
    `Rapid: ${report.rapidCount}  Stale: ${report.staleCount}`,
    '',
  ];
  for (const e of report.entries) {
    lines.push(`  [${e.label.toUpperCase()}] ${e.name}: ${e.fromVersion} → ${e.toVersion} (score: ${e.velocityScore})`);
  }
  return lines.join('\n');
}
