import {
  scoreRisk,
  classifyRisk,
  buildRiskReport,
  formatRiskReportText,
} from '../dependency-risk';
import { DepMap } from '../index';

function makeDepMap(entries: Record<string, string>): DepMap {
  const map: DepMap = new Map();
  for (const [name, version] of Object.entries(entries)) {
    map.set(name, { version, resolved: '', integrity: '', dependencies: {} });
  }
  return map;
}

describe('scoreRisk', () => {
  it('returns zero score for a stable version', () => {
    const { score, reasons } = scoreRisk('lodash', '4.17.21');
    expect(score).toBe(0);
    expect(reasons).toHaveLength(0);
  });

  it('penalizes major version 0', () => {
    const { score, reasons } = scoreRisk('mylib', '0.3.1');
    expect(score).toBeGreaterThanOrEqual(30);
    expect(reasons.some(r => r.includes('Major version is 0'))).toBe(true);
  });

  it('penalizes pre-release tags', () => {
    const { score, reasons } = scoreRisk('react', '19.0.0-beta.1');
    expect(score).toBeGreaterThanOrEqual(25);
    expect(reasons.some(r => r.includes('Pre-release'))).toBe(true);
  });

  it('penalizes wildcard versions', () => {
    const { score, reasons } = scoreRisk('foo', '*');
    expect(score).toBeGreaterThanOrEqual(40);
    expect(reasons.some(r => r.includes('wildcard'))).toBe(true);
  });

  it('accumulates score for multiple risk factors', () => {
    const { score } = scoreRisk('unstable', '0.1.0-alpha.0');
    expect(score).toBeGreaterThanOrEqual(55);
  });

  it('returns reasons as an array of strings', () => {
    const { reasons } = scoreRisk('mylib', '0.1.0-alpha.0');
    expect(Array.isArray(reasons)).toBe(true);
    reasons.forEach(r => expect(typeof r).toBe('string'));
  });
});

describe('classifyRisk', () => {
  it('returns none for score 0', () => expect(classifyRisk(0)).toBe('none'));
  it('returns low for score 10', () => expect(classifyRisk(10)).toBe('low'));
  it('returns medium for score 20', () => expect(classifyRisk(20)).toBe('medium'));
  it('returns high for score 40', () => expect(classifyRisk(40)).toBe('high'));
  it('returns critical for score 60', () => expect(classifyRisk(60)).toBe('critical'));
});

describe('buildRiskReport', () => {
  it('returns empty entries for all-stable deps', () => {
    const deps = makeDepMap({ lodash: '4.17.21', express: '4.18.2' });
    const report = buildRiskReport(deps);
    expect(report.entries).toHaveLength(0);
    expect(report.overallRisk).toBe('none');
  });

  it('flags risky packages and sorts by score descending', () => {
    const deps = makeDepMap({ safe: '2.0.0', risky: '0.1.0-alpha.0', mid: '0.5.0' });
    const report = buildRiskReport(deps);
    expect(report.entries.length).toBeGreaterThanOrEqual(2);
    expect(report.entries[0].score).toBeGreaterThanOrEqual(report.entries[1].score);
  });

  it('includes totalScore in the report', () => {
    const deps = makeDepMap({ risky: '0.1.0-alpha.0' });
    const report = buildRiskReport(deps);
    expect(typeof report.totalScore).toBe('number');
    expect(report.totalScore).toBeGreaterThan(0);
  });
});

describe('formatRiskReportText', () => {
  it('returns no-issue message when entries are empty', () => {
    const text = formatRiskReportText({ entries: [], overallRisk: 'none', totalScore: 0 });
    expect(text).toContain('No dependency risk issues detected');
  });

  it('includes package name and risk level in output', () => {
    const deps = makeDepMap({ unstable: '0.1.0-beta.1' });
    const report = buildRiskReport(deps);
    const text = formatRiskReportText(report);
    expect(text).toContain('unstable');
    expect(text).toMatch(/high|critical|medium/i);
  });
});
