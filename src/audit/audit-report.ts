import { AuditResult, Severity, rankSeverity } from './vulnerability-checker';

export interface AuditReport {
  total: number;
  bySeverity: Record<string, AuditResult[]>;
  summary: string;
}

export function buildAuditReport(results: AuditResult[]): AuditReport {
  const bySeverity: Record<string, AuditResult[]> = {};
  for (const result of results) {
    const sev = result.vulnerability.severity;
    if (!bySeverity[sev]) bySeverity[sev] = [];
    bySeverity[sev].push(result);
  }
  const summary = results.length === 0
    ? 'No vulnerabilities detected.'
    : `Found ${results.length} vulnerability(ies) across ${Object.keys(bySeverity).length} severity level(s).`;
  return { total: results.length, bySeverity, summary };
}

export function formatAuditReportText(report: AuditReport): string {
  if (report.total === 0) return report.summary;
  const lines: string[] = [report.summary, ''];
  const severities: Severity[] = ['critical', 'high', 'moderate', 'low', 'info'];
  for (const sev of severities) {
    const entries = report.bySeverity[sev];
    if (!entries || entries.length === 0) continue;
    lines.push(`[${sev.toUpperCase()}]`);
    for (const e of entries) {
      const patched = e.vulnerability.patchedVersion
        ? `patched in ${e.vulnerability.patchedVersion}`
        : 'no patch available';
      lines.push(`  ${e.package}@${e.currentVersion} — ${e.vulnerability.title} (${patched})`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

export function formatAuditReportJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}
