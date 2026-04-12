import {
  classifyStability,
  buildStabilityReport,
  formatStabilityReportText,
  StabilityReport,
} from '../dependency-stability';
import { DepMap } from '../index';

function makeDepMap(entries: Record<string, string>): DepMap {
  const map: DepMap = new Map();
  for (const [name, version] of Object.entries(entries)) {
    map.set(name, { version, resolved: '', dependencies: {} });
  }
  return map;
}

describe('classifyStability', () => {
  it('marks 0.x versions as experimental', () => {
    expect(classifyStability('some-pkg', '0.5.3')).toBe('experimental');
  });

  it('marks alpha/beta pre-release versions as unstable', () => {
    expect(classifyStability('pkg', '1.0.0-alpha.1')).toBe('unstable');
    expect(classifyStability('pkg', '2.3.0-beta.4')).toBe('unstable');
    expect(classifyStability('pkg', '3.0.0-rc.1')).toBe('unstable');
  });

  it('marks packages with alpha/beta in name as unstable', () => {
    expect(classifyStability('@alpha/utils', '1.0.0')).toBe('unstable');
    expect(classifyStability('my-beta-lib', '1.0.0')).toBe('unstable');
  });

  it('marks normal 1.x+ versions as stable', () => {
    expect(classifyStability('react', '18.2.0')).toBe('stable');
    expect(classifyStability('lodash', '4.17.21')).toBe('stable');
  });
});

describe('buildStabilityReport', () => {
  it('returns empty entries when all deps are stable', () => {
    const deps = makeDepMap({ react: '18.0.0', lodash: '4.17.21' });
    const report = buildStabilityReport(deps);
    expect(report.entries).toHaveLength(0);
    expect(report.unstableCount).toBe(0);
    expect(report.experimentalCount).toBe(0);
    expect(report.deprecatedCount).toBe(0);
  });

  it('detects experimental packages', () => {
    const deps = makeDepMap({ 'new-thing': '0.1.0', stable: '2.0.0' });
    const report = buildStabilityReport(deps);
    expect(report.experimentalCount).toBe(1);
    expect(report.entries[0].name).toBe('new-thing');
    expect(report.entries[0].level).toBe('experimental');
  });

  it('detects deprecated packages from set', () => {
    const deps = makeDepMap({ 'old-pkg': '1.0.0' });
    const report = buildStabilityReport(deps, new Set(['old-pkg']));
    expect(report.deprecatedCount).toBe(1);
    expect(report.entries[0].level).toBe('deprecated');
  });

  it('detects unstable pre-release versions', () => {
    const deps = makeDepMap({ mylib: '2.0.0-beta.1' });
    const report = buildStabilityReport(deps);
    expect(report.unstableCount).toBe(1);
  });
});

describe('formatStabilityReportText', () => {
  it('returns clean message when no issues', () => {
    const report: StabilityReport = {
      entries: [],
      unstableCount: 0,
      experimentalCount: 0,
      deprecatedCount: 0,
    };
    expect(formatStabilityReportText(report)).toBe('All dependencies appear stable.');
  });

  it('includes summary counts in output', () => {
    const deps = makeDepMap({ 'alpha-pkg': '0.2.0', 'beta-lib': '1.0.0-beta.1' });
    const report = buildStabilityReport(deps);
    const text = formatStabilityReportText(report);
    expect(text).toContain('Dependency Stability Report');
    expect(text).toContain('Summary:');
    expect(text).toContain('experimental');
  });
});
