import {
  classifyPortability,
  computePortabilityScore,
  buildPortabilityReport,
  formatPortabilityReportText,
} from '../dependency-portability';
import { DepMap } from '../../parser';

function makeDepMap(entries: Record<string, Partial<{ version: string; engines: Record<string, string>; os: string[] }>>): DepMap {
  const result: DepMap = {};
  for (const [name, info] of Object.entries(entries)) {
    result[name] = { version: info.version ?? '1.0.0', resolved: '', ...(info as any) };
  }
  return result;
}

describe('classifyPortability', () => {
  it('classifies known native packages as native', () => {
    expect(classifyPortability('sharp', {}, [])).toBe('native');
    expect(classifyPortability('bcrypt', {}, [])).toBe('native');
  });

  it('classifies known platform-restricted packages', () => {
    expect(classifyPortability('fsevents', {}, [])).toBe('native');
  });

  it('classifies packages with os restrictions as restricted', () => {
    expect(classifyPortability('my-pkg', {}, ['darwin'])).toBe('restricted');
  });

  it('classifies packages with engine constraints as restricted', () => {
    expect(classifyPortability('my-pkg', { node: '>=16' }, [])).toBe('restricted');
  });

  it('classifies unconstrained packages as portable', () => {
    expect(classifyPortability('lodash', {}, [])).toBe('portable');
  });
});

describe('computePortabilityScore', () => {
  it('returns 100 for portable packages with no constraints', () => {
    expect(computePortabilityScore('portable', {})).toBe(100);
  });

  it('returns 50 for restricted packages', () => {
    expect(computePortabilityScore('restricted', {})).toBe(50);
  });

  it('returns 20 for native packages', () => {
    expect(computePortabilityScore('native', {})).toBe(20);
  });

  it('reduces score per engine constraint', () => {
    expect(computePortabilityScore('restricted', { node: '>=16', npm: '>=8' })).toBe(30);
  });

  it('does not go below 0', () => {
    const engines = { node: '1', npm: '2', yarn: '3', pnpm: '4', bun: '5', deno: '6' };
    expect(computePortabilityScore('restricted', engines)).toBeGreaterThanOrEqual(0);
  });
});

describe('buildPortabilityReport', () => {
  it('counts portable and non-portable packages correctly', () => {
    const depMap = makeDepMap({
      lodash: { version: '4.17.21' },
      sharp: { version: '0.32.0' },
      express: { version: '4.18.0', engines: { node: '>=0.10.0' } },
    });
    const report = buildPortabilityReport(depMap);
    expect(report.portableCount).toBe(1);
    expect(report.nativeCount).toBe(1);
    expect(report.restrictedCount).toBe(1);
    expect(report.entries).toHaveLength(3);
  });

  it('returns overall score of 100 for empty map', () => {
    const report = buildPortabilityReport({});
    expect(report.overallScore).toBe(100);
  });

  it('computes a blended overall score', () => {
    const depMap = makeDepMap({
      lodash: { version: '4.17.21' },
      sharp: { version: '0.32.0' },
    });
    const report = buildPortabilityReport(depMap);
    expect(report.overallScore).toBeGreaterThan(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
  });
});

describe('formatPortabilityReportText', () => {
  it('includes header and score', () => {
    const depMap = makeDepMap({ lodash: { version: '4.17.21' } });
    const report = buildPortabilityReport(depMap);
    const text = formatPortabilityReportText(report);
    expect(text).toContain('Portability Report');
    expect(text).toContain('Overall Score');
  });

  it('shows all portable message when no issues', () => {
    const depMap = makeDepMap({ lodash: { version: '4.17.21' } });
    const report = buildPortabilityReport(depMap);
    const text = formatPortabilityReportText(report);
    expect(text).toContain('fully portable');
  });

  it('lists non-portable packages', () => {
    const depMap = makeDepMap({ sharp: { version: '0.32.0' } });
    const report = buildPortabilityReport(depMap);
    const text = formatPortabilityReportText(report);
    expect(text).toContain('NATIVE');
    expect(text).toContain('sharp');
  });
});
