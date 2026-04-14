/**
 * dependency-volatility.ts
 *
 * Measures how frequently dependencies change versions across snapshots or
 * between two lock-file states. High volatility may indicate unstable
 * upstream packages that deserve extra scrutiny before merging.
 */

import { DependencyMap } from './index';

export type VolatilityLevel = 'stable' | 'moderate' | 'high' | 'extreme';

export interface VolatilityEntry {
  name: string;
  fromVersion: string;
  toVersion: string;
  /** Number of version segments that changed (patch=1, minor=2, major=3) */
  changeDepth: number;
  level: VolatilityLevel;
}

export interface VolatilityReport {
  entries: VolatilityEntry[];
  totalChanged: number;
  stable: number;
  moderate: number;
  high: number;
  extreme: number;
  /** 0-100 composite volatility score; higher = more volatile */
  score: number;
}

/** Classify how many semver segments differ between two version strings. */
function changeDepth(from: string, to: string): number {
  const parse = (v: string): [number, number, number] => {
    const clean = v.replace(/^[^\d]*/, '');
    const parts = clean.split('.').map((p) => parseInt(p, 10) || 0);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  };

  const [fMaj, fMin, fPat] = parse(from);
  const [tMaj, tMin, tPat] = parse(to);

  if (tMaj !== fMaj) return 3;
  if (tMin !== fMin) return 2;
  if (tPat !== fPat) return 1;
  return 0;
}

/** Map a change-depth value to a human-readable volatility level. */
function classifyVolatility(depth: number): VolatilityLevel {
  if (depth === 0) return 'stable';
  if (depth === 1) return 'moderate';
  if (depth === 2) return 'high';
  return 'extreme';
}

/**
 * Compare two dependency maps and build a volatility report describing
 * how much each changed dependency has shifted.
 */
export function buildVolatilityReport(
  base: DependencyMap,
  head: DependencyMap,
): VolatilityReport {
  const entries: VolatilityEntry[] = [];

  for (const [name, headEntry] of head) {
    const baseEntry = base.get(name);
    if (!baseEntry) continue; // new dependency – not a version change

    const fromVersion = baseEntry.version;
    const toVersion = headEntry.version;

    if (fromVersion === toVersion) continue;

    const depth = changeDepth(fromVersion, toVersion);
    entries.push({
      name,
      fromVersion,
      toVersion,
      changeDepth: depth,
      level: classifyVolatility(depth),
    });
  }

  // Sort by changeDepth descending, then alphabetically
  entries.sort((a, b) =>
    b.changeDepth !== a.changeDepth
      ? b.changeDepth - a.changeDepth
      : a.name.localeCompare(b.name),
  );

  const counts = { stable: 0, moderate: 0, high: 0, extreme: 0 };
  for (const e of entries) counts[e.level]++;

  const totalChanged = entries.length;
  const rawScore =
    totalChanged === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            ((counts.moderate * 1 +
              counts.high * 2 +
              counts.extreme * 4) /
              Math.max(1, totalChanged)) *
              25,
          ),
        );

  return {
    entries,
    totalChanged,
    ...counts,
    score: rawScore,
  };
}

/** Render the volatility report as human-readable text. */
export function formatVolatilityReportText(report: VolatilityReport): string {
  if (report.totalChanged === 0) {
    return 'Volatility report: no version changes detectedn  const lines: string[] = [
    `Volatility report — ${report.totalChanged} package(s) changed  [score: ${report.score}/  stable: ${report.stable}  moderate: ${report.moderate}  high: ${report.high}  extreme: ${report.extreme}`,
    '',
  ];

  for (const e of report.entries) {
    const badge = e.level.toUpperCase().padEnd(8);
    lines.push(`  [${badge}] ${e.name}  ${e.fromVersion} → ${e.toVersion}`);
  }

  return lines.join('\n');
}
