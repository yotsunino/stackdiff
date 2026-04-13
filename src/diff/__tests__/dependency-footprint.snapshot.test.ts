import { buildFootprintReport, formatFootprintReportText } from '../dependency-footprint';

function makeDepMap(entries: [string, { version: string; requires?: Record<string, string> }][]) {
  return new Map(entries);
}

describe('dependency-footprint snapshot', () => {
  it('matches snapshot for multi-package report', () => {
    const direct = makeDepMap([
      ['axios', { version: '1.4.0', requires: { 'follow-redirects': '1.x', 'form-data': '4.x' } }],
      ['chalk', { version: '5.3.0' }],
    ]);
    const all = makeDepMap([
      ['axios', { version: '1.4.0', requires: { 'follow-redirects': '1.x', 'form-data': '4.x' } }],
      ['follow-redirects', { version: '1.15.2' }],
      ['form-data', { version: '4.0.0', requires: { 'mime-types': '2.x' } }],
      ['mime-types', { version: '2.1.35' }],
      ['chalk', { version: '5.3.0' }],
    ]);
    const report = buildFootprintReport(direct, all);
    const text = formatFootprintReportText(report);
    expect(text).toMatchSnapshot();
  });
});
