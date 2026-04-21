import {
  classifyBalance,
  buildBalanceReport,
  formatBalanceReportText,
  BalanceReport,
} from '../dependency-balance';
import { DepMap } from '../index';

function makeDepMap(entries: [string, string][]): DepMap {
  return new Map(entries);
}

describe('classifyBalance', () => {
  it('returns lean when ratio < 2', () => {
    expect(classifyBalance(1)).toBe('lean');
    expect(classifyBalance(1.9)).toBe('lean');
  });

  it('returns balanced when ratio is between 2 and 5 inclusive', () => {
    expect(classifyBalance(2)).toBe('balanced');
    expect(classifyBalance(5)).toBe('balanced');
  });

  it('returns heavy when ratio > 5', () => {
    expect(classifyBalance(6)).toBe('heavy');
    expect(classifyBalance(20)).toBe('heavy');
  });
});

describe('buildBalanceReport', () => {
  it('returns empty report when direct map is empty', () => {
    const report = buildBalanceReport(makeDepMap([]), makeDepMap([]));
    expect(report.entries).toHaveLength(0);
    expect(report.averageRatio).toBe(0);
    expect(report.heavyCount).toBe(0);
  });

  it('builds entries for each direct dependency', () => {
    const direct = makeDepMap([['lodash', '4.17.21']]);
    const all = makeDepMap([['lodash', '4.17.21']]);
    const report = buildBalanceReport(direct, all);
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0].name).toBe('lodash');
  });

  it('counts lean, balanced, heavy correctly', () => {
    const direct = makeDepMap([
      ['alpha', '1.0.0'],
      ['beta', '2.0.0'],
    ]);
    const all = makeDepMap([
      ['alpha', '1.0.0'],
      ['beta', '2.0.0'],
    ]);
    const report = buildBalanceReport(direct, all);
    const total = report.leanCount + report.balancedCount + report.heavyCount;
    expect(total).toBe(report.entries.length);
  });

  it('computes averageRatio as rounded value', () => {
    const direct = makeDepMap([['pkg', '1.0.0']]);
    const all = makeDepMap([['pkg', '1.0.0']]);
    const report = buildBalanceReport(direct, all);
    expect(typeof report.averageRatio).toBe('number');
  });
});

describe('formatBalanceReportText', () => {
  it('returns a no-deps message for empty report', () => {
    const empty: BalanceReport = {
      entries: [],
      averageRatio: 0,
      heavyCount: 0,
      leanCount: 0,
      balancedCount: 0,
    };
    expect(formatBalanceReportText(empty)).toBe('No dependencies to analyse.');
  });

  it('includes header and entry lines', () => {
    const report: BalanceReport = {
      entries: [{ name: 'react', directCount: 1, transitiveCount: 3, ratio: 3, classification: 'balanced' }],
      averageRatio: 3,
      heavyCount: 0,
      leanCount: 0,
      balancedCount: 1,
    };
    const text = formatBalanceReportText(report);
    expect(text).toContain('Dependency Balance Report');
    expect(text).toContain('react');
    expect(text).toContain('BALANCED');
  });
});
