import {
  buildOwnershipReport,
  formatOwnershipReportText,
} from '../dependency-ownership';
import { DepMap } from '../index';

function makeDepMap(entries: Record<string, string>): DepMap {
  return new Map(Object.entries(entries));
}

describe('buildOwnershipReport', () => {
  it('classifies direct and transitive deps', () => {
    const direct = makeDepMap({ react: '18.0.0', lodash: '4.17.21' });
    const transitive = makeDepMap({
      react: '18.0.0',
      'object-assign': '4.1.1',
    });
    const parentMap = new Map([['object-assign', ['react']]]);

    const report = buildOwnershipReport(direct, transitive, parentMap);

    expect(report.totalDirect).toBe(2);
    expect(report.totalTransitive).toBe(1);

    const lodash = report.entries.find(e => e.name === 'lodash');
    expect(lodash?.scope).toBe('direct');
    expect(lodash?.introducedBy).toEqual([]);

    const oa = report.entries.find(e => e.name === 'object-assign');
    expect(oa?.scope).toBe('transitive');
    expect(oa?.introducedBy).toEqual(['react']);
  });

  it('returns empty report when no deps', () => {
    const report = buildOwnershipReport(new Map(), new Map());
    expect(report.entries).toHaveLength(0);
    expect(report.totalDirect).toBe(0);
    expect(report.totalTransitive).toBe(0);
  });

  it('sorts entries alphabetically', () => {
    const direct = makeDepMap({ zebra: '1.0.0', alpha: '2.0.0' });
    const report = buildOwnershipReport(direct, direct);
    expect(report.entries[0].name).toBe('alpha');
    expect(report.entries[1].name).toBe('zebra');
  });

  it('does not duplicate direct deps found in transitive map', () => {
    const direct = makeDepMap({ react: '18.0.0' });
    const transitive = makeDepMap({ react: '18.0.0', 'loose-envify': '1.4.0' });
    const report = buildOwnershipReport(direct, transitive);
    const reactEntries = report.entries.filter(e => e.name === 'react');
    expect(reactEntries).toHaveLength(1);
    expect(reactEntries[0].scope).toBe('direct');
  });
});

describe('formatOwnershipReportText', () => {
  it('returns message when no entries', () => {
    const report = buildOwnershipReport(new Map(), new Map());
    expect(formatOwnershipReportText(report)).toBe('No dependencies found.');
  });

  it('includes scope labels and parent info', () => {
    const direct = makeDepMap({ react: '18.0.0' });
    const transitive = makeDepMap({ 'object-assign': '4.1.1' });
    const parentMap = new Map([['object-assign', ['react']]]);
    const report = buildOwnershipReport(direct, transitive, parentMap);
    const text = formatOwnershipReportText(report);

    expect(text).toContain('[direct]');
    expect(text).toContain('react@18.0.0');
    expect(text).toContain('[transitive]');
    expect(text).toContain('object-assign@4.1.1');
    expect(text).toContain('via react');
  });
});
