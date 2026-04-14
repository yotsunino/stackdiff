import {
  classifyVisibility,
  extractScope,
  buildVisibilityReport,
  formatVisibilityReportText,
} from '../dependency-visibility';

function makeDepMap(entries: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(entries));
}

describe('classifyVisibility', () => {
  it('returns scoped for @-prefixed packages', () => {
    expect(classifyVisibility('@babel/core')).toBe('scoped');
    expect(classifyVisibility('@types/node')).toBe('scoped');
  });

  it('returns private for internal packages', () => {
    expect(classifyVisibility('_internal-pkg')).toBe('private');
    expect(classifyVisibility('my-internal-lib')).toBe('private');
  });

  it('returns public for normal packages', () => {
    expect(classifyVisibility('lodash')).toBe('public');
    expect(classifyVisibility('react')).toBe('public');
  });

  it('returns unknown for empty name', () => {
    expect(classifyVisibility('')).toBe('unknown');
    expect(classifyVisibility('unknown')).toBe('unknown');
  });
});

describe('extractScope', () => {
  it('extracts scope from scoped packages', () => {
    expect(extractScope('@babel/core')).toBe('@babel');
    expect(extractScope('@types/node')).toBe('@types');
  });

  it('returns undefined for non-scoped packages', () => {
    expect(extractScope('lodash')).toBeUndefined();
    expect(extractScope('react')).toBeUndefined();
  });
});

describe('buildVisibilityReport', () => {
  it('counts visibility levels correctly', () => {
    const deps = makeDepMap({
      lodash: '4.17.21',
      '@babel/core': '7.0.0',
      '@types/node': '18.0.0',
      '_private-util': '1.0.0',
    });
    const report = buildVisibilityReport(deps);
    expect(report.publicCount).toBe(1);
    expect(report.scopedCount).toBe(2);
    expect(report.privateCount).toBe(1);
    expect(report.unknownCount).toBe(0);
  });

  it('returns empty report for empty map', () => {
    const report = buildVisibilityReport(new Map());
    expect(report.entries).toHaveLength(0);
    expect(report.publicCount).toBe(0);
  });

  it('attaches scope to scoped entries', () => {
    const deps = makeDepMap({ '@myorg/utils': '2.0.0' });
    const report = buildVisibilityReport(deps);
    expect(report.entries[0].scope).toBe('@myorg');
  });
});

describe('formatVisibilityReportText', () => {
  it('returns no-deps message for empty report', () => {
    const report = buildVisibilityReport(new Map());
    expect(formatVisibilityReportText(report)).toBe('No dependencies found.');
  });

  it('includes counts and entries in output', () => {
    const deps = makeDepMap({ lodash: '4.0.0', '@scope/pkg': '1.0.0' });
    const report = buildVisibilityReport(deps);
    const text = formatVisibilityReportText(report);
    expect(text).toContain('Public:  1');
    expect(text).toContain('Scoped:  1');
    expect(text).toContain('lodash@4.0.0');
    expect(text).toContain('@scope/pkg@1.0.0');
  });
});
