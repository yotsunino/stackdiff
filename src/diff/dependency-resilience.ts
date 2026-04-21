export interface ResilienceEntry {
  name: string;
  version: string;
  singlePointOfFailure: boolean;
  dependentCount: number;
  hasAlternatives: boolean;
  score: number;
  classification: 'critical' | 'fragile' | 'stable' | 'robust';
}

export interface ResilienceReport {
  entries: ResilienceEntry[];
  criticalCount: number;
  fragileCount: number;
  overallScore: number;
}

export type DepMap = Map<string, { version: string; dependencies?: Record<string, string> }>;

export function computeResilienceScore(
  name: string,
  dependentCount: number,
  hasAlternatives: boolean
): number {
  let score = 100;
  if (dependentCount > 10) score -= 40;
  else if (dependentCount > 5) score -= 20;
  else if (dependentCount > 2) score -= 10;
  if (!hasAlternatives && dependentCount > 3) score -= 20;
  return Math.max(0, score);
}

export function classifyResilience(score: number, dependentCount: number): ResilienceEntry['classification'] {
  if (score < 40 || dependentCount > 10) return 'critical';
  if (score < 60 || dependentCount > 5) return 'fragile';
  if (score < 80) return 'stable';
  return 'robust';
}

const KNOWN_ALTERNATIVES: Record<string, boolean> = {
  lodash: true,
  underscore: true,
  axios: true,
  'node-fetch': true,
  moment: true,
  dayjs: true,
  express: true,
  fastify: true,
};

export function buildResilienceReport(depMap: DepMap): ResilienceReport {
  const dependentCounts = new Map<string, number>();
  for (const [, entry] of depMap) {
    for (const dep of Object.keys(entry.dependencies ?? {})) {
      dependentCounts.set(dep, (dependentCounts.get(dep) ?? 0) + 1);
    }
  }

  const entries: ResilienceEntry[] = [];
  for (const [name, entry] of depMap) {
    const dependentCount = dependentCounts.get(name) ?? 0;
    const hasAlternatives = KNOWN_ALTERNATIVES[name] ?? false;
    const singlePointOfFailure = dependentCount > 5 && !hasAlternatives;
    const score = computeResilienceScore(name, dependentCount, hasAlternatives);
    const classification = classifyResilience(score, dependentCount);
    entries.push({ name, version: entry.version, singlePointOfFailure, dependentCount, hasAlternatives, score, classification });
  }

  entries.sort((a, b) => a.score - b.score);
  const criticalCount = entries.filter(e => e.classification === 'critical').length;
  const fragileCount = entries.filter(e => e.classification === 'fragile').length;
  const overallScore = entries.length
    ? Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length)
    : 100;

  return { entries, criticalCount, fragileCount, overallScore };
}

export function formatResilienceReportText(report: ResilienceReport): string {
  const lines: string[] = ['Dependency Resilience Report', '============================'];
  lines.push(`Overall Score: ${report.overallScore}/100`);
  lines.push(`Critical: ${report.criticalCount}  Fragile: ${report.fragileCount}\n`);
  for (const e of report.entries) {
    const spof = e.singlePointOfFailure ? ' [SPOF]' : '';
    lines.push(`  ${e.name}@${e.version} — ${e.classification} (score: ${e.score}, dependents: ${e.dependentCount})${spof}`);
  }
  return lines.join('\n');
}
