import { buildScopeReport, formatScopeReportText, DepMap } from '../dependency-scope';

function makeDepMap(entries: Array<[string, string, string?, boolean?]>): DepMap {
  const m: DepMap = new Map();
  for (const [name, version, scope, transitive] of entries) {
    m.set(name, { version, scope, transitive });
  }
  return m;
}

describe('dependency-scope snapshot', () => {
  it('matches full report snapshot', () => {
    const deps = makeDepMap([
      ['react', '18.2.0', 'production', false],
      ['react-dom', '18.2.0', 'production', false],
      ['lodash', '4.17.21', 'production', true],
      ['jest', '29.5.0', 'development', false],
      ['ts-jest', '29.0.0', 'development', false],
      ['react-is', '18.2.0', 'peer', true],
    ]);
    const report = buildScopeReport(deps);
    const text = formatScopeReportText(report);
    expect(text).toMatchSnapshot();
  });
});
