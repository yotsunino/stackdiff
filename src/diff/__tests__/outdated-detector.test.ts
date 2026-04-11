import {
  classifyOutdated,
  detectOutdated,
  formatOutdatedText,
} from '../outdated-detector';
import { DepMap } from '../dependency-differ';

function makeDepMap(entries: Record<string, string>): DepMap {
  return entries as DepMap;
}

describe('classifyOutdated', () => {
  it('returns major when major version bumps', () => {
    expect(classifyOutdated('1.2.3', '2.0.0')).toBe('major');
  });

  it('returns minor when minor version bumps', () => {
    expect(classifyOutdated('1.2.3', '1.4.0')).toBe('minor');
  });

  it('returns patch for patch-only bump', () => {
    expect(classifyOutdated('1.2.3', '1.2.9')).toBe('patch');
  });
});

describe('detectOutdated', () => {
  it('returns empty report when all up to date', () => {
    const current = makeDepMap({ react: '18.0.0' });
    const latest = makeDepMap({ react: '18.0.0' });
    const report = detectOutdated(current, latest);
    expect(report.total).toBe(0);
    expect(report.entries).toHaveLength(0);
  });

  it('detects a major outdated package', () => {
    const current = makeDepMap({ lodash: '3.10.1' });
    const latest = makeDepMap({ lodash: '4.17.21' });
    const report = detectOutdated(current, latest);
    expect(report.total).toBe(1);
    expect(report.byMajor).toBe(1);
    expect(report.entries[0].severity).toBe('major');
  });

  it('detects minor and patch outdated packages', () => {
    const current = makeDepMap({ axios: '1.2.0', express: '4.18.0' });
    const latest = makeDepMap({ axios: '1.4.0', express: '4.18.3' });
    const report = detectOutdated(current, latest);
    expect(report.byMinor).toBe(1);
    expect(report.byPatch).toBe(1);
  });

  it('ignores packages not in latest map', () => {
    const current = makeDepMap({ react: '17.0.0', legacy: '1.0.0' });
    const latest = makeDepMap({ react: '18.0.0' });
    const report = detectOutdated(current, latest);
    expect(report.total).toBe(1);
    expect(report.entries[0].name).toBe('react');
  });
});

describe('formatOutdatedText', () => {
  it('returns up-to-date message when no outdated entries', () => {
    const report = { entries: [], total: 0, byMajor: 0, byMinor: 0, byPatch: 0 };
    expect(formatOutdatedText(report)).toBe('All dependencies are up to date.');
  });

  it('formats report with entries', () => {
    const report = {
      entries: [{ name: 'lodash', current: '3.10.1', latest: '4.17.21', severity: 'major' as const }],
      total: 1, byMajor: 1, byMinor: 0, byPatch: 0,
    };
    const text = formatOutdatedText(report);
    expect(text).toContain('[MAJOR]');
    expect(text).toContain('lodash');
    expect(text).toContain('3.10.1 → 4.17.21');
  });
});
