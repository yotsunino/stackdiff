import { buildImpactReport, formatImpactReportText } from '../dependency-impact';
import { DepMap } from '../index';

function makeDepMap(entries: Record<string, { version: string; requires?: Record<string, string> }>): DepMap {
  return entries as unknown as DepMap;
}

describe('dependency-impact snapshot', () => {
  it('matches snapshot for multi-package impact report', () => {
    const base = makeDepMap({
      lodash: { version: '3.10.1' },
      underscore: { version: '1.12.0' },
    });

    const head = makeDepMap({
      lodash: { version: '4.17.21' },
      underscore: { version: '1.13.6' },
      express: { version: '4.18.2', requires: { lodash: '^4.0.0' } },
      axios: { version: '1.4.0', requires: { lodash: '^4.0.0', underscore: '^1.13.0' } },
    });

    const report = buildImpactReport(base, head);
    expect(report).toMatchSnapshot();
  });

  it('matches text snapshot', () => {
    const base = makeDepMap({ react: { version: '17.0.2' } });
    const head = makeDepMap({
      react: { version: '18.2.0' },
      'react-dom': { version: '18.2.0', requires: { react: '^18.0.0' } },
    });
    const report = buildImpactReport(base, head);
    expect(formatImpactReportText(report)).toMatchSnapshot();
  });
});
