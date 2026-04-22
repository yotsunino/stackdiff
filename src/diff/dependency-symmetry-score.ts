import { DepMap } from '../parser';

export interface SymmetryScoreEntry {
  name: string;
  baseVersion: string | null;
  headVersion: string | null;
  symmetric: boolean;
}

export interface SymmetryScoreReport {
  entries: SymmetryScoreEntry[];
  totalPackages: number;
  symmetricCount: number;
  asymmetricCount: number;
  score: number; // 0-100
  grade: string;
}

export function buildSymmetryScoreReport(
  base: DepMap,
  head: DepMap
): SymmetryScoreReport {
  const allNames = new Set([...Object.keys(base), ...Object.keys(head)]);
  const entries: SymmetryScoreEntry[] = [];

  for (const name of allNames) {
    const baseVersion = base[name]?.version ?? null;
    const headVersion = head[name]?.version ?? null;
    entries.push({
      name,
      baseVersion,
      headVersion,
      symmetric: baseVersion === headVersion,
    });
  }

  const total = entries.length;
  const symmetricCount = entries.filter((e) => e.symmetric).length;
  const asymmetricCount = total - symmetricCount;
  const score = total === 0 ? 100 : Math.round((symmetricCount / total) * 100);
  const grade = gradeSymmetry(score);

  return { entries, totalPackages: total, symmetricCount, asymmetricCount, score, grade };
}

function gradeSymmetry(score: number): string {
  if (score >= 95) return 'A';
  if (score >= 80) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function formatSymmetryScoreText(report: SymmetryScoreReport): string {
  const lines: string[] = [
    `Symmetry Score: ${report.score}/100 (${report.grade})`,
    `Total: ${report.totalPackages} | Symmetric: ${report.symmetricCount} | Asymmetric: ${report.asymmetricCount}`,
    '',
  ];

  const asymmetric = report.entries.filter((e) => !e.symmetric);
  if (asymmetric.length === 0) {
    lines.push('All packages are in sync between base and head.');
  } else {
    lines.push('Asymmetric packages:');
    for (const e of asymmetric) {
      const base = e.baseVersion ?? '(missing)';
      const head = e.headVersion ?? '(missing)';
      lines.push(`  ${e.name}: ${base} → ${head}`);
    }
  }

  return lines.join('\n');
}
