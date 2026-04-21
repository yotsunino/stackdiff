import { buildResilienceReport, formatResilienceReportText, DepMap } from '../dependency-resilience';

function makeDepMap(entries: Array<[string, string, Record<string, string>?]>): DepMap {
  const map: DepMap = new Map();
  for (const [name, version, dependencies] of entries) {
    map.set(name, { version, dependencies: dependencies ?? {} });
  }
  return map;
}

describe('dependency-resilience snapshots', () => {
  it('matches snapshot for a mixed-resilience tree', () => {
    const depMap = makeDepMap([
      ['app', '1.0.0', { lodash: '^4.0.0', axios: '^1.0.0', 'my-util': '^2.0.0' }],
      ['svc-a', '2.0.0', { 'my-util': '^2.0.0' }],
      ['svc-b', '1.5.0', { 'my-util': '^2.0.0' }],
      ['svc-c', '3.0.0', { 'my-util': '^2.0.0' }],
      ['svc-d', '1.0.0', { 'my-util': '^2.0.0' }],
      ['svc-e', '1.0.0', { 'my-util': '^2.0.0' }],
      ['lodash', '4.17.21'],
      ['axios', '1.6.0'],
      ['my-util', '2.3.1'],
    ]);
    const report = buildResilienceReport(depMap);
    expect(report).toMatchSnapshot();
    expect(formatResilienceReportText(report)).toMatchSnapshot();
  });
});
