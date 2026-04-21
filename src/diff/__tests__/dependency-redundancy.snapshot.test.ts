import { detectRedundancy, formatRedundancyReportText } from '../dependency-redundancy';
import { DepMap } from '../index';

function makeDepMap(
  entries: Array<[string, { version: string; dependencies?: Record<string, string> }]>
): DepMap {
  const map: DepMap = new Map();
  for (const [name, info] of entries) {
    map.set(name, { version: info.version, dependencies: info.dependencies ?? {} });
  }
  return map;
}

describe('dependency-redundancy snapshot', () => {
  it('matches snapshot for mixed redundancy report', () => {
    const base = makeDepMap([
      ['react', { version: '18.2.0', dependencies: { 'loose-envify': '1.4.0', 'object-assign': '4.1.1' } }],
      ['lodash', { version: '4.17.21' }],
    ]);
    const head = makeDepMap([
      ['react', { version: '18.2.0', dependencies: { 'loose-envify': '1.4.0' } }],
      ['lodash', { version: '4.17.21' }],
      ['lodash-es', { version: '4.17.21' }],
    ]);
    const report = detectRedundancy(base, head);
    const text = formatRedundancyReportText(report);
    expect(text).toMatchSnapshot();
    expect(report).toMatchSnapshot();
  });

  it('matches snapshot for empty report', () => {
    const base = makeDepMap([['axios', { version: '1.4.0' }]]);
    const head = makeDepMap([['axios', { version: '1.4.0' }]]);
    const report = detectRedundancy(base, head);
    expect(formatRedundancyReportText(report)).toMatchSnapshot();
  });

  it('matches snapshot when head has no packages', () => {
    const base = makeDepMap([['react', { version: '18.2.0' }]]);
    const head = makeDepMap([]);
    const report = detectRedundancy(base, head);
    expect(formatRedundancyReportText(report)).toMatchSnapshot();
    expect(report).toMatchSnapshot();
  });
});
