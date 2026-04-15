import { buildVolatilityReport, formatVolatilityReportText } from '../dependency-volatility';

function makeDepMap(entries: Array<{ name: string; version: string }>) {
  const map = new Map<string, { version: string }>();
  for (const e of entries) {
    map.set(e.name, { version: e.version });
  }
  return map;
}

describe('dependency-volatility snapshot', () => {
  it('matches snapshot for mixed volatility report', () => {
    const base = makeDepMap([
      { name: 'react', version: '16.0.0' },
      { name: 'lodash', version: '4.17.0' },
      { name: 'axios', version: '0.21.0' },
    ]);
    const head = makeDepMap([
      { name: 'react', version: '18.2.0' },
      { name: 'lodash', version: '4.17.21' },
      { name: 'axios', version: '1.4.0' },
    ]);
    const report = buildVolatilityReport(base, head);
    expect(report).toMatchSnapshot();
  });

  it('matches text snapshot', () => {
    const base = makeDepMap([{ name: 'express', version: '4.17.0' }]);
    const head = makeDepMap([{ name: 'express', version: '5.0.0' }]);
    const report = buildVolatilityReport(base, head);
    expect(formatVolatilityReportText(report)).toMatchSnapshot();
  });
});
