import {
  detectDuplicates,
  buildDuplicateReport,
  formatDuplicateReportText,
} from '../duplicate-detector';
import { DependencyMap } from '../index';

function makeDepMap(entries: Record<string, { version: string; name?: string }>): DependencyMap {
  const result: DependencyMap = {};
  for (const [key, val] of Object.entries(entries)) {
    result[key] = { version: val.version, name: val.name ?? key } as any;
  }
  return result;
}

describe('detectDuplicates', () => {
  it('returns empty array when no duplicates exist', () => {
    const deps = makeDepMap({
      react: { version: '18.0.0' },
      lodash: { version: '4.17.21' },
    });
    expect(detectDuplicates(deps)).toEqual([]);
  });

  it('detects a package with two different versions', () => {
    const deps = makeDepMap({
      'lodash@4.17.21': { version: '4.17.21', name: 'lodash' },
      'lodash@3.10.0': { version: '3.10.0', name: 'lodash' },
    });
    const result = detectDuplicates(deps);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('lodash');
    expect(result[0].versions).toEqual(['3.10.0', '4.17.21']);
  });

  it('returns results sorted by package name', () => {
    const deps = makeDepMap({
      'zlib@1.0.0': { version: '1.0.0', name: 'zlib' },
      'zlib@2.0.0': { version: '2.0.0', name: 'zlib' },
      'async@2.0.0': { version: '2.0.0', name: 'async' },
      'async@3.0.0': { version: '3.0.0', name: 'async' },
    });
    const result = detectDuplicates(deps);
    expect(result[0].name).toBe('async');
    expect(result[1].name).toBe('zlib');
  });
});

describe('buildDuplicateReport', () => {
  it('returns zero counts for clean deps', () => {
    const deps = makeDepMap({ react: { version: '18.0.0' } });
    const report = buildDuplicateReport(deps);
    expect(report.affectedPackages).toBe(0);
    expect(report.totalDuplicates).toBe(0);
  });

  it('counts total duplicate version entries', () => {
    const deps = makeDepMap({
      'lodash@4.17.21': { version: '4.17.21', name: 'lodash' },
      'lodash@3.10.0': { version: '3.10.0', name: 'lodash' },
    });
    const report = buildDuplicateReport(deps);
    expect(report.affectedPackages).toBe(1);
    expect(report.totalDuplicates).toBe(2);
  });
});

describe('formatDuplicateReportText', () => {
  it('returns clean message when no duplicates', () => {
    const report = { duplicates: [], totalDuplicates: 0, affectedPackages: 0 };
    expect(formatDuplicateReportText(report)).toBe('No duplicate packages detected.');
  });

  it('lists duplicates in output', () => {
    const report = {
      duplicates: [{ name: 'lodash', versions: ['3.10.0', '4.17.21'], locations: [] }],
      totalDuplicates: 2,
      affectedPackages: 1,
    };
    const text = formatDuplicateReportText(report);
    expect(text).toContain('lodash');
    expect(text).toContain('3.10.0');
    expect(text).toContain('4.17.21');
  });
});
