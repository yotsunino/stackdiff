import { DepMap } from './index';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface RiskEntry {
  name: string;
  version: string;
  riskLevel: RiskLevel;
  reasons: string[];
  score: number;
}

export interface RiskReport {
  entries: RiskEntry[];
  overallRisk: RiskLevel;
  totalScore: number;
}

const RISK_WEIGHTS = {
  majorVersion0: 30,
  prerelease: 25,
  noVersion: 40,
  knownRiskyPrefix: 20,
};

const RISKY_PREFIXES = ['beta', 'alpha', 'rc', 'canary', 'next', 'experimental'];

export function scoreRisk(name: string, version: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (!version || version === '*' || version === 'latest') {
    score += RISK_WEIGHTS.noVersion;
    reasons.push('Unresolved or wildcard version');
  }

  const major = parseInt(version.split('.')[0].replace(/[^\d]/g, ''), 10);
  if (!isNaN(major) && major === 0) {
    score += RISK_WEIGHTS.majorVersion0;
    reasons.push('Major version is 0 (unstable API)');
  }

  const lower = version.toLowerCase();
  for (const prefix of RISKY_PREFIXES) {
    if (lower.includes(prefix)) {
      score += RISK_WEIGHTS.prerelease;
      reasons.push(`Pre-release tag detected: ${prefix}`);
      break;
    }
  }

  if (/-/.test(version) && !RISKY_PREFIXES.some(p => lower.includes(p))) {
    score += RISK_WEIGHTS.knownRiskyPrefix;
    reasons.push('Version contains non-standard pre-release identifier');
  }

  return { score, reasons };
}

export function classifyRisk(score: number): RiskLevel {
  if (score >= 60) return 'critical';
  if (score >= 40) return 'high';
  if (score >= 20) return 'medium';
  if (score > 0) return 'low';
  return 'none';
}

export function buildRiskReport(deps: DepMap): RiskReport {
  const entries: RiskEntry[] = [];

  for (const [name, info] of deps.entries()) {
    const { score, reasons } = scoreRisk(name, info.version);
    const riskLevel = classifyRisk(score);
    if (riskLevel !== 'none') {
      entries.push({ name, version: info.version, riskLevel, reasons, score });
    }
  }

  entries.sort((a, b) => b.score - a.score);
  const totalScore = entries.reduce((sum, e) => sum + e.score, 0);
  const overallRisk = classifyRisk(entries.length > 0 ? Math.max(...entries.map(e => e.score)) : 0);

  return { entries, overallRisk, totalScore };
}

export function formatRiskReportText(report: RiskReport): string {
  if (report.entries.length === 0) return 'No dependency risk issues detected.';
  const lines = [`Dependency Risk Report (overall: ${report.overallRisk}, score: ${report.totalScore})`, ''];
  for (const e of report.entries) {
    lines.push(`  [${e.riskLevel.toUpperCase()}] ${e.name}@${e.version} (score: ${e.score})`);
    for (const r of e.reasons) lines.push(`    - ${r}`);
  }
  return lines.join('\n');
}
