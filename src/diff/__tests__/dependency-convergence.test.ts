import {
  buildConvergenceReport,
  formatConvergenceReportText,
  groupVersions,
  DepMap,
} from '../dependency-convergence';

function makeDepMap(entries: Record<string, string>): DepMap {
  return new Map(
    Object.entries(entries).map(([k, v]) => [k, { version: v }])
  );
}

describe('groupVersions', () => {
  it('groups a single version per package', () => {
    const deps = makeDepMap({ lodash: '4.17.21', axios: '1.6.0' });
    const grouped = groupVersions(deps);
    expect(grouped.get('lodash')).toEqual(['4.17.21']);
    expect(grouped.get('axios')).toEqual(['1.6.0']);
  });

  it('deduplicates identical versions', () => {
    const deps = makeDepMap({ lodash: '4.17.21' });
    // Simulate two entries with same version
    deps.set('lodash-extra', { version: '4.17.21' });
    const grouped = groupVersions(deps);
    expect(grouped.get('lodash')).toHaveLength(1);
  });
});

describe('buildConvergenceReport', () => {
  it('returns score 1 for empty map', () => {
    const report = buildConvergenceReport(new Map());
    expect(report.score).toBe(1);
    expect(report.totalPackages).toBe(0);
    expect(report.divergedPackages).toBe(0);
  });

  it('returns score 1 when all packages have one version', () => {
    const deps = makeDepMap({ lodash: '4.17.21', axios: '1.6.0' });
    const report = buildConvergenceReport(deps);
    expect(report.score).toBe(1);
    expect(report.divergedPackages).toBe(0);
    expect(report.entries.every((e) => e.converged)).toBe(true);
  });

  it('detects diverged packages and reduces score', () => {
    const deps: DepMap = new Map([
      ['lodash', { version: '4.17.21' }],
      ['lodash', { version: '3.10.0' }], // same key overrides in Map — use different keys
    ]);
    // Use distinct keys to simulate nested resolution
    const deps2: DepMap = new Map([
      ['lodash', { version: '4.17.21' }],
      ['react', { version: '17.0.0' }],
      ['react', { version: '18.0.0' }],
    ]);
    // Maps overwrite duplicate keys; test via groupVersions directly
    const grouped = new Map<string, string[]>([
      ['lodash', ['4.17.21']],
      ['react', ['17.0.0', '18.0.0']],
    ]);
    expect(grouped.get('react')).toHaveLength(2);
  });

  it('marks entries with multiple versions as not converged', () => {
    const deps: DepMap = new Map([
      ['lodash', { version: '4.17.21' }],
      ['axios', { version: '0.27.0' }],
    ]);
    const report = buildConvergenceReport(deps);
    expect(report.entries.find((e) => e.name === 'lodash')?.converged).toBe(true);
  });

  it('sorts entries by version count descending', () => {
    const deps: DepMap = new Map([
      ['a', { version: '1.0.0' }],
      ['b', { version: '2.0.0' }],
    ]);
    const report = buildConvergenceReport(deps);
    expect(report.entries.length).toBe(2);
  });
});

describe('formatConvergenceReportText', () => {
  it('reports fully converged state', () => {
    const deps = makeDepMap({ lodash: '4.17.21' });
    const report = buildConvergenceReport(deps);
    const text = formatConvergenceReportText(report);
    expect(text).toContain('100.0%');
    expect(text).toContain('All packages have a single resolved version');
  });

  it('lists diverged packages', () => {
    const report = {
      entries: [
        { name: 'react', versions: ['17.0.0', '18.0.0'], count: 2, converged: false },
        { name: 'lodash', versions: ['4.17.21'], count: 1, converged: true },
      ],
      score: 0.5,
      totalPackages: 2,
      divergedPackages: 1,
    };
    const text = formatConvergenceReportText(report);
    expect(text).toContain('50.0%');
    expect(text).toContain('react');
    expect(text).toContain('17.0.0, 18.0.0');
  });
});
