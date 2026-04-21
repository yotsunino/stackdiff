export interface ComplexityEntry {
  name: string;
  version: string;
  directDeps: number;
  transitiveDeps: number;
  depth: number;
  score: number;
  grade: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComplexityReport {
  entries: ComplexityEntry[];
  totalScore: number;
  averageScore: number;
  highComplexityCount: number;
}

export type DepMap = Map<string, { version: string; requires?: Record<string, string>; dependencies?: Record<string, { version: string }> }>;

export function computeComplexityScore(
  directDeps: number,
  transitiveDeps: number,
  depth: number
): number {
  return Math.round(directDeps * 1 + transitiveDeps * 0.5 + depth * 2);
}

export function classifyComplexity(score: number): ComplexityEntry['grade'] {
  if (score >= 50) return 'critical';
  if (score >= 25) return 'high';
  if (score >= 10) return 'medium';
  return 'low';
}

export function buildComplexityReport(depMap: DepMap): ComplexityReport {
  const entries: ComplexityEntry[] = [];

  for (const [name, meta] of depMap.entries()) {
    const directDeps = Object.keys(meta.requires ?? {}).length;
    const transitiveDeps = Object.keys(meta.dependencies ?? {}).length;
    const depth = transitiveDeps > 0 ? Math.ceil(Math.log2(transitiveDeps + 1)) : 0;
    const score = computeComplexityScore(directDeps, transitiveDeps, depth);
    const grade = classifyComplexity(score);
    entries.push({ name, version: meta.version, directDeps, transitiveDeps, depth, score, grade });
  }

  entries.sort((a, b) => b.score - a.score);

  const totalScore = entries.reduce((sum, e) => sum + e.score, 0);
  const averageScore = entries.length > 0 ? Math.round(totalScore / entries.length) : 0;
  const highComplexityCount = entries.filter(e => e.grade === 'high' || e.grade === 'critical').length;

  return { entries, totalScore, averageScore, highComplexityCount };
}

export function formatComplexityReportText(report: ComplexityReport): string {
  if (report.entries.length === 0) return 'No dependencies found.\n';

  const lines: string[] = [
    `Dependency Complexity Report`,
    `Total Score: ${report.totalScore}  Average: ${report.averageScore}  High/Critical: ${report.highComplexityCount}`,
    '',
  ];

  for (const e of report.entries) {
    lines.push(
      `  [${e.grade.toUpperCase().padEnd(8)}] ${e.name}@${e.version}  score=${e.score}  direct=${e.directDeps}  transitive=${e.transitiveDeps}  depth=${e.depth}`
    );
  }

  return lines.join('\n') + '\n';
}
