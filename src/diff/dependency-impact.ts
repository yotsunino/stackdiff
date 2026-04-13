import { DepMap } from './index';

export interface ImpactEntry {
  name: string;
  fromVersion: string;
  toVersion: string;
  directlyChanged: boolean;
  impactedDependents: string[];
  impactScore: number;
}

export interface ImpactReport {
  entries: ImpactEntry[];
  totalImpactScore: number;
  highImpactCount: number;
}

export function findDependents(name: string, depMap: DepMap): string[] {
  const dependents: string[] = [];
  for (const [pkg, info] of Object.entries(depMap)) {
    const deps = (info as any).requires ?? {};
    if (name in deps) {
      dependents.push(pkg);
    }
  }
  return dependents;
}

export function computeImpactScore(dependents: number, direct: boolean): number {
  const base = direct ? 2 : 1;
  return base + dependents;
}

export function buildImpactReport(base: DepMap, head: DepMap): ImpactReport {
  const entries: ImpactEntry[] = [];

  for (const [name, headInfo] of Object.entries(head)) {
    const baseInfo = base[name];
    const fromVersion = baseInfo ? (baseInfo as any).version : '';
    const toVersion = (headInfo as any).version ?? '';

    if (!baseInfo || fromVersion === toVersion) continue;

    const impactedDependents = findDependents(name, head);
    const directlyChanged = !!baseInfo;
    const impactScore = computeImpactScore(impactedDependents.length, directlyChanged);

    entries.push({ name, fromVersion, toVersion, directlyChanged, impactedDependents, impactScore });
  }

  entries.sort((a, b) => b.impactScore - a.impactScore);

  const totalImpactScore = entries.reduce((sum, e) => sum + e.impactScore, 0);
  const highImpactCount = entries.filter(e => e.impactScore >= 4).length;

  return { entries, totalImpactScore, highImpactCount };
}

export function formatImpactReportText(report: ImpactReport): string {
  if (report.entries.length === 0) return 'No impactful dependency changes detected.';

  const lines: string[] = [
    `Dependency Impact Report (total score: ${report.totalImpactScore}, high-impact: ${report.highImpactCount})`,
    '',
  ];

  for (const e of report.entries) {
    const tag = e.impactScore >= 4 ? '[HIGH]' : '[LOW] ';
    lines.push(`${tag} ${e.name}: ${e.fromVersion} → ${e.toVersion} (score: ${e.impactScore})`);
    if (e.impactedDependents.length > 0) {
      lines.push(`       affects: ${e.impactedDependents.join(', ')}`);
    }
  }

  return lines.join('\n');
}
