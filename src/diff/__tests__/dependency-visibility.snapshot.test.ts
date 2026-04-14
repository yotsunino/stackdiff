import { buildVisibilityReport, formatVisibilityReportText } from '../dependency-visibility';

function makeDepMap(entries: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(entries));
}

describe('dependency-visibility snapshot', () => {
  it('matches snapshot for mixed visibility deps', () => {
    const deps = makeDepMap({
      react: '18.2.0',
      '@babel/core': '7.22.0',
      '@types/node': '20.0.0',
      '_internal-helper': '1.0.0',
      lodash: '4.17.21',
    });
    const report = buildVisibilityReport(deps);
    const text = formatVisibilityReportText(report);
    expect(text).toMatchSnapshot();
  });

  it('matches snapshot for scoped-only deps', () => {
    const deps = makeDepMap({
      '@myorg/utils': '2.1.0',
      '@myorg/core': '3.0.0',
    });
    const report = buildVisibilityReport(deps);
    expect(report).toMatchSnapshot();
  });
});
