import { classifyScope, buildScopeReport, formatScopeReportText, DepMap } from '../dependency-scope';

function makeDepMap(entries: Array<[string, string, string?, boolean?]>): DepMap {
  const m: DepMap = new Map();
  for (const [name, version, scope, transitive] of entries) {
    m.set(name, { version, scope, transitive });
  }
  return m;
}

describe('classifyScope', () => {
  it('maps prod/production to production', () => {
    expect(classifyScope('prod')).toBe('production');
    expect(classifyScope('production')).toBe('production');
  });

  it('maps dev/development to development', () => {
    expect(classifyScope('dev')).toBe('development');
    expect(classifyScope('development')).toBe('development');
  });

  it('handles optional and peer', () => {
    expect(classifyScope('optional')).toBe('optional');
    expect(classifyScope('peer')).toBe('peer');
  });

  it('returns unknown for unrecognized or undefined', () => {
    expect(classifyScope(undefined)).toBe('unknown');
    expect(classifyScope('bundled')).toBe('unknown');
  });
});

describe('buildScopeReport', () => {
  it('counts scopes and transitive correctly', () => {
    const deps = makeDepMap([
      ['react', '18.0.0', 'production', false],
      ['jest', '29.0.0', 'development', false],
      ['lodash', '4.0.0', 'production', true],
    ]);
    const report = buildScopeReport(deps);
    expect(report.totals.production).toBe(2);
    expect(report.totals.development).toBe(1);
    expect(report.directCount).toBe(2);
    expect(report.transitiveCount).toBe(1);
  });

  it('returns sorted entries', () => {
    const deps = makeDepMap([
      ['zod', '3.0.0', 'production'],
      ['axios', '1.0.0', 'production'],
    ]);
    const report = buildScopeReport(deps);
    expect(report.entries[0].name).toBe('axios');
    expect(report.entries[1].name).toBe('zod');
  });

  it('handles empty map', () => {
    const report = buildScopeReport(new Map());
    expect(report.entries).toHaveLength(0);
    expect(report.directCount).toBe(0);
    expect(report.transitiveCount).toBe(0);
  });
});

describe('formatScopeReportText', () => {
  it('includes header and totals', () => {
    const deps = makeDepMap([['react', '18.0.0', 'production', false]]);
    const text = formatScopeReportText(buildScopeReport(deps));
    expect(text).toContain('Dependency Scope Report');
    expect(text).toContain('PRODUCTION');
    expect(text).toContain('react@18.0.0');
  });

  it('marks transitive entries', () => {
    const deps = makeDepMap([['ms', '2.1.3', 'production', true]]);
    const text = formatScopeReportText(buildScopeReport(deps));
    expect(text).toContain('(transitive)');
  });

  it('omits categories with zero entries', () => {
    const deps = makeDepMap([['ts-node', '10.0.0', 'development', false]]);
    const text = formatScopeReportText(buildScopeReport(deps));
    expect(text).not.toContain('PRODUCTION');
    expect(text).toContain('DEVELOPMENT');
  });
});
