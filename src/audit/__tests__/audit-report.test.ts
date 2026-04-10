import { buildAuditReport, formatAuditReportText, formatAuditReportJson } from '../audit-report';
import { AuditResult, Vulnerability } from '../vulnerability-checker';

const makeResult = (pkg: string, severity: Vulnerability['severity']): AuditResult => ({
  package: pkg,
  currentVersion: '1.0.0',
  vulnerability: {
    package: pkg,
    severity,
    title: `${pkg} vulnerability`,
    affectedVersions: '<2.0.0',
    patchedVersion: '2.0.0',
  },
});

describe('buildAuditReport', () => {
  it('returns zero total for empty results', () => {
    const report = buildAuditReport([]);
    expect(report.total).toBe(0);
    expect(report.summary).toContain('No vulnerabilities');
  });

  it('groups results by severity', () => {
    const results = [makeResult('a', 'high'), makeResult('b', 'critical'), makeResult('c', 'high')];
    const report = buildAuditReport(results);
    expect(report.total).toBe(3);
    expect(report.bySeverity['high']).toHaveLength(2);
    expect(report.bySeverity['critical']).toHaveLength(1);
  });
});

describe('formatAuditReportText', () => {
  it('returns summary for empty report', () => {
    const report = buildAuditReport([]);
    expect(formatAuditReportText(report)).toBe('No vulnerabilities detected.');
  });

  it('includes severity headers and package details', () => {
    const results = [makeResult('lodash', 'high'), makeResult('moment', 'low')];
    const report = buildAuditReport(results);
    const text = formatAuditReportText(report);
    expect(text).toContain('[HIGH]');
    expect(text).toContain('[LOW]');
    expect(text).toContain('lodash@1.0.0');
    expect(text).toContain('moment@1.0.0');
    expect(text).toContain('patched in 2.0.0');
  });
});

describe('formatAuditReportJson', () => {
  it('returns valid JSON', () => {
    const results = [makeResult('axios', 'moderate')];
    const report = buildAuditReport(results);
    const json = formatAuditReportJson(report);
    const parsed = JSON.parse(json);
    expect(parsed.total).toBe(1);
    expect(parsed.bySeverity.moderate).toHaveLength(1);
  });
});
