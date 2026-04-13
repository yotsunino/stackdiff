export interface MaturityEntry {
  name: string;
  version: string;
  majorVersion: number;
  isPreRelease: boolean;
  maturityLevel: 'stable' | 'rc' | 'beta' | 'alpha' | 'experimental';
  score: number;
}

export interface MaturityReport {
  entries: MaturityEntry[];
  averageScore: number;
  unstableCount: number;
  preReleaseCount: number;
}

export type DepMap = Map<string, { version: string }>;

export function classifyMaturity(version: string): MaturityEntry['maturityLevel'] {
  const v = version.toLowerCase();
  if (v.includes('alpha')) return 'alpha';
  if (v.includes('beta')) return 'beta';
  if (v.includes('rc')) return 'rc';
  if (v.includes('experimental') || v.includes('canary') || v.includes('nightly')) return 'experimental';
  return 'stable';
}

export function scoreMaturity(level: MaturityEntry['maturityLevel'], major: number): number {
  const levelScore: Record<MaturityEntry['maturityLevel'], number> = {
    stable: 100,
    rc: 70,
    beta: 50,
    alpha: 30,
    experimental: 10,
  };
  const base = levelScore[level];
  // Penalize major version 0 as unstable
  return major === 0 ? Math.floor(base * 0.8) : base;
}

export function buildMaturityReport(deps: DepMap): MaturityReport {
  const entries: MaturityEntry[] = [];

  for (const [name, { version }] of deps) {
    const majorMatch = version.match(/^(\d+)/);
    const majorVersion = majorMatch ? parseInt(majorMatch[1], 10) : 0;
    const isPreRelease = /[.-](alpha|beta|rc|canary|experimental|nightly)/i.test(version) || majorVersion === 0;
    const maturityLevel = classifyMaturity(version);
    const score = scoreMaturity(maturityLevel, majorVersion);
    entries.push({ name, version, majorVersion, isPreRelease, maturityLevel, score });
  }

  entries.sort((a, b) => a.score - b.score);

  const averageScore = entries.length
    ? Math.round(entries.reduce((sum, e) => sum + e.score, 0) / entries.length)
    : 100;

  const unstableCount = entries.filter(e => e.majorVersion === 0).length;
  const preReleaseCount = entries.filter(e => e.isPreRelease).length;

  return { entries, averageScore, unstableCount, preReleaseCount };
}

export function formatMaturityReportText(report: MaturityReport): string {
  const lines: string[] = ['Dependency Maturity Report', '=========================='];
  lines.push(`Average Score: ${report.averageScore}/100`);
  lines.push(`Unstable (v0.x): ${report.unstableCount}  Pre-release: ${report.preReleaseCount}`);
  lines.push('');
  for (const e of report.entries) {
    const flag = e.isPreRelease ? ' ⚠' : '';
    lines.push(`  ${e.name}@${e.version} [${e.maturityLevel}] score=${e.score}${flag}`);
  }
  return lines.join('\n');
}
