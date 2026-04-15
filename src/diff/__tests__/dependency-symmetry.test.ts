import {
  buildSymmetryReport,
  formatSymmetryReportText,
  DepMap,
} from '../dependency-symmetry';

function makeDepMap(entries: Record<string, string>): DepMap {
  const map: DepMap = new Map();
  for (const [name, version] of Object.entries(entries)) {
    map.set(name, { version });
  }
  return map;
}

describe('buildSymmetryReport', () => {
  it('returns 100 score when both maps are identical', () => {
    const base = makeDepMap({ react: '18.0.0', lodash: '4.17.21' });
    const head = makeDepMap({ react: '18.0.0', lodash: '4.17.21' });
    const report = buildSymmetryReport(base, head);
    expect(report.symmetryScore).toBe(100);
    expect(report.commonCount).toBe(2);
    expect(report.onlyInBase).toHaveLength(0);
    expect(report.onlyInHead).toHaveLength(0);
  });

  it('detects packages only in base', () => {
    const base = makeDepMap({ react: '18.0.0', lodash: '4.17.21' });
    const head = makeDepMap({ react: '18.0.0' });
    const report = buildSymmetryReport(base, head);
    expect(report.onlyInBase).toHaveLength(1);
    expect(report.onlyInBase[0].name).toBe('lodash');
    expect(report.onlyInBase[0].side).toBe('base');
  });

  it('detects packages only in head', () => {
    const base = makeDepMap({ react: '18.0.0' });
    const head = makeDepMap({ react: '18.0.0', axios: '1.4.0' });
    const report = buildSymmetryReport(base, head);
    expect(report.onlyInHead).toHaveLength(1);
    expect(report.onlyInHead[0].name).toBe('axios');
    expect(report.onlyInHead[0].side).toBe('head');
  });

  it('computes symmetry score correctly for partial overlap', () => {
    const base = makeDepMap({ a: '1.0.0', b: '2.0.0', c: '3.0.0' });
    const head = makeDepMap({ a: '1.0.0', d: '4.0.0' });
    // common: a (1), onlyBase: b,c (2), onlyHead: d (1) => total=4, score=25
    const report = buildSymmetryReport(base, head);
    expect(report.symmetryScore).toBe(25);
    expect(report.commonCount).toBe(1);
  });

  it('returns 100 for two empty maps', () => {
    const report = buildSymmetryReport(new Map(), new Map());
    expect(report.symmetryScore).toBe(100);
    expect(report.commonCount).toBe(0);
  });
});

describe('formatSymmetryReportText', () => {
  it('includes symmetry score in output', () => {
    const base = makeDepMap({ react: '18.0.0' });
    const head = makeDepMap({ react: '18.0.0' });
    const report = buildSymmetryReport(base, head);
    const text = formatSymmetryReportText(report);
    expect(text).toContain('Symmetry Score: 100/100');
    expect(text).toContain('perfectly symmetric');
  });

  it('lists packages only in base and head', () => {
    const base = makeDepMap({ lodash: '4.17.21', react: '18.0.0' });
    const head = makeDepMap({ react: '18.0.0', axios: '1.4.0' });
    const report = buildSymmetryReport(base, head);
    const text = formatSymmetryReportText(report);
    expect(text).toContain('Only in base');
    expect(text).toContain('lodash@4.17.21');
    expect(text).toContain('Only in head');
    expect(text).toContain('axios@1.4.0');
  });
});
