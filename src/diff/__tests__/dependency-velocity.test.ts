import {
  computeVelocityScore,
  classifyVelocity,
  buildVelocityReport,
  formatVelocityReportText,
} from '../dependency-velocity';
import { DepMap } from '../index';

function makeDepMap(entries: Record<string, string>): DepMap {
  const map: DepMap = {};
  for (const [name, version] of Object.entries(entries)) {
    map[name] = { version, resolved: '', integrity: '', dependencies: {} };
  }
  return map;
}

describe('computeVelocityScore', () => {
  it('returns 0 for identical versions', () => {
    expect(computeVelocityScore('1.2.3', '1.2.3')).toBe(0);
  });

  it('scores major bumps heavily', () => {
    expect(computeVelocityScore('1.0.0', '2.0.0')).toBe(10);
  });

  it('scores minor bumps moderately', () => {
    expect(computeVelocityScore('1.0.0', '1.3.0')).toBe(6);
  });

  it('scores patch bumps lightly', () => {
    expect(computeVelocityScore('1.0.0', '1.0.4')).toBe(2);
  });

  it('combines multiple bump types', () => {
    expect(computeVelocityScore('1.0.0', '2.1.2')).toBe(10 + 2 + 1);
  });

  it('ignores downgrade deltas (returns 0 for each dimension)', () => {
    expect(computeVelocityScore('2.0.0', '1.0.0')).toBe(0);
  });
});

describe('classifyVelocity', () => {
  it('labels score 0 as stale', () => expect(classifyVelocity(0)).toBe('stale'));
  it('labels score 1 as stable', () => expect(classifyVelocity(1)).toBe('stable'));
  it('labels score 3 as moderate', () => expect(classifyVelocity(3)).toBe('moderate'));
  it('labels score 10 as rapid', () => expect(classifyVelocity(10)).toBe('rapid'));
  it('labels score 20 as rapid', () => expect(classifyVelocity(20)).toBe('rapid'));
});

describe('buildVelocityReport', () => {
  it('returns empty report when no shared packages changed', () => {
    const base = makeDepMap({ react: '17.0.0' });
    const head = makeDepMap({ react: '17.0.0' });
    const report = buildVelocityReport(base, head);
    expect(report.entries).toHaveLength(0);
    expect(report.averageVelocity).toBe(0);
  });

  it('detects a rapid upgrade', () => {
    const base = makeDepMap({ lodash: '3.0.0' });
    const head = makeDepMap({ lodash: '4.0.0' });
    const report = buildVelocityReport(base, head);
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0].label).toBe('rapid');
    expect(report.rapidCount).toBe(1);
  });

  it('skips packages only in head (new additions)', () => {
    const base = makeDepMap({});
    const head = makeDepMap({ axios: '1.0.0' });
    const report = buildVelocityReport(base, head);
    expect(report.entries).toHaveLength(0);
  });

  it('computes average velocity across multiple packages', () => {
    const base = makeDepMap({ a: '1.0.0', b: '1.0.0' });
    const head = makeDepMap({ a: '2.0.0', b: '1.1.0' });
    const report = buildVelocityReport(base, head);
    expect(report.entries).toHaveLength(2);
    expect(report.averageVelocity).toBe((10 + 2) / 2);
  });

  it('sorts entries by velocity score descending', () => {
    const base = makeDepMap({ a: '1.0.0', b: '1.0.0' });
    const head = makeDepMap({ a: '1.0.1', b: '2.0.0' });
    const report = buildVelocityReport(base, head);
    expect(report.entries[0].name).toBe('b');
  });
});

describe('formatVelocityReportText', () => {
  it('returns no-change message when empty', () => {
    const report = buildVelocityReport(makeDepMap({}), makeDepMap({}));
    expect(formatVelocityReportText(report)).toBe('No version changes detected.');
  });

  it('includes package name and versions in output', () => {
    const base = makeDepMap({ express: '4.0.0' });
    const head = makeDepMap({ express: '5.0.0' });
    const report = buildVelocityReport(base, head);
    const text = formatVelocityReportText(report);
    expect(text).toContain('express');
    expect(text).toContain('4.0.0');
    expect(text).toContain('5.0.0');
    expect(text).toContain('RAPID');
  });
});
