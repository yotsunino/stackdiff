/**
 * Computes a numeric "health score" for a dependency tree diff.
 * Score starts at 100 and is decremented based on severity of changes.
 */

import { DependencyEntry } from '../resolver/index';

export interface ScoreBreakdown {
  total: number;
  deductions: Array<{ reason: string; points: number }>;
}

export interface ScoredDiff {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: ScoreBreakdown;
}

const DEDUCTIONS = {
  majorUpgrade: 10,
  majorDowngrade: 15,
  minorDowngrade: 5,
  removed: 8,
  added: 2,
  patchDowngrade: 2,
} as const;

export function gradeScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

export function calculateScore(
  added: DependencyEntry[],
  removed: DependencyEntry[],
  majorUpgrades: DependencyEntry[],
  majorDowngrades: DependencyEntry[],
  minorDowngrades: DependencyEntry[],
  patchDowngrades: DependencyEntry[]
): ScoredDiff {
  const deductions: Array<{ reason: string; points: number }> = [];

  const push = (reason: string, count: number, pts: number) => {
    if (count > 0) deductions.push({ reason, points: count * pts });
  };

  push(`${added.length} package(s) added`, added.length, DEDUCTIONS.added);
  push(`${removed.length} package(s) removed`, removed.length, DEDUCTIONS.removed);
  push(`${majorUpgrades.length} major upgrade(s)`, majorUpgrades.length, DEDUCTIONS.majorUpgrade);
  push(`${majorDowngrades.length} major downgrade(s)`, majorDowngrades.length, DEDUCTIONS.majorDowngrade);
  push(`${minorDowngrades.length} minor downgrade(s)`, minorDowngrades.length, DEDUCTIONS.minorDowngrade);
  push(`${patchDowngrades.length} patch downgrade(s)`, patchDowngrades.length, DEDUCTIONS.patchDowngrade);

  const totalDeduction = deductions.reduce((sum, d) => sum + d.points, 0);
  const score = Math.max(0, 100 - totalDeduction);

  return {
    score,
    grade: gradeScore(score),
    breakdown: { total: score, deductions },
  };
}

export function formatScoreText(result: ScoredDiff): string {
  const lines: string[] = [
    `Health Score: ${result.score}/100 (Grade: ${result.grade})`,
    'Deductions:',
  ];
  if (result.breakdown.deductions.length === 0) {
    lines.push('  None — clean diff!');
  } else {
    for (const d of result.breakdown.deductions) {
      lines.push(`  -${d.points}  ${d.reason}`);
    }
  }
  return lines.join('\n');
}
