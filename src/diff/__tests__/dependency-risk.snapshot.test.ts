import { buildRiskReport, formatRiskReportText } from '../dependency-risk';
import { DepMap } from '../index';

function makeDepMap(entries: Record<string, string>): DepMap {
  const map: DepMap = new Map();
  for (const [name, version] of Object.entries(entries)) {
    map.set(name, { version, resolved: '', integrity: '', dependencies: {} });
  }
  return map;
}

describe('dependency-risk snapshot', () => {
  it('matches snapshot for mixed risk deps', () => {
    const deps = makeDepMap({
      lodash: '4.17.21',
      'my-beta-lib': '1.0.0-beta.3',
      'zero-major': '0.2.5',
      'wild-dep': '*',
      'alpha-pkg': '0.0.1-alpha.0',
    });
    const report = buildRiskReport(deps);
    expect(report).toMatchSnapshot();
  });

  it('formatted text matches snapshot', () => {
    const deps = makeDepMap({
      'rc-component': '2.0.0-rc.1',
      stable: '3.1.4',
      'zero-lib': '0.9.0',
    });
    const report = buildRiskReport(deps);
    const text = formatRiskReportText(report);
    expect(text).toMatchSnapshot();
  });

  it('empty report matches snapshot', () => {
    const deps = makeDepMap({ react: '18.2.0', typescript: '5.4.2' });
    const report = buildRiskReport(deps);
    expect(formatRiskReportText(report)).toMatchSnapshot();
  });
});
