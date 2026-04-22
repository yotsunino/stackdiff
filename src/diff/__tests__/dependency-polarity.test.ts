import {
  classifyPolarity,
  buildPolarityReport,
  formatPolarityReportText,
} from '../dependency-polarity';
import { DepMap } from '../../parser';

function makeDepMap(entries: Record<string, string>): DepMap {
  const m: DepMap = new Map();
  for (const [name, version] of Object.entries(entries)) {
    m.set(name, { version, resolved: '', integrity: '', dependencies: {} });
  }
  return m;
}

describe('classifyPolarity', () => {
  it('returns additive when only additions', () => {
    expect(classifyPolarity(3, 0)).toBe('additive');
  });

  it('returns reductive when only removals', () => {
    expect(classifyPolarity(0, 2)).toBe('reductive');
  });

  it('returns neutral when no changes', () => {
    expect(classifyPolarity(0, 0)).toBe('neutral');
  });

  it('returns mixed when both additions and removals', () => {
    expect(classifyPolarity(2, 1)).toBe('mixed');
  });
});

describe('buildPolarityReport', () => {
  it('reports added packages', () => {
    const base = makeDepMap({ lodash: '4.0.0' });
    const head = makeDepMap({ lodash: '4.0.0', axios: '1.0.0' });
    const report = buildPolarityReport(base, head);
    expect(report.totalAdded).toBe(1);
    expect(report.totalRemoved).toBe(0);
    expect(report.netChange).toBe(1);
    expect(report.overallPolarity).toBe('additive');
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0].name).toBe('axios');
  });

  it('reports removed packages', () => {
    const base = makeDepMap({ lodash: '4.0.0', moment: '2.0.0' });
    const head = makeDepMap({ lodash: '4.0.0' });
    const report = buildPolarityReport(base, head);
    expect(report.totalRemoved).toBe(1);
    expect(report.overallPolarity).toBe('reductive');
  });

  it('returns neutral when no adds or removes', () => {
    const base = makeDepMap({ lodash: '4.0.0' });
    const head = makeDepMap({ lodash: '4.17.0' });
    const report = buildPolarityReport(base, head);
    expect(report.overallPolarity).toBe('neutral');
    expect(report.entries).toHaveLength(0);
  });

  it('returns mixed when both adds and removes', () => {
    const base = makeDepMap({ a: '1.0.0', b: '1.0.0' });
    const head = makeDepMap({ a: '1.0.0', c: '1.0.0' });
    const report = buildPolarityReport(base, head);
    expect(report.overallPolarity).toBe('mixed');
    expect(report.totalAdded).toBe(1);
    expect(report.totalRemoved).toBe(1);
    expect(report.netChange).toBe(0);
  });
});

describe('formatPolarityReportText', () => {
  it('renders no-change message for neutral report', () => {
    const base = makeDepMap({ a: '1.0.0' });
    const report = buildPolarityReport(base, base);
    const text = formatPolarityReportText(report);
    expect(text).toContain('No changes detected');
  });

  it('includes package names and polarity labels', () => {
    const base = makeDepMap({ a: '1.0.0' });
    const head = makeDepMap({ a: '1.0.0', b: '2.0.0' });
    const report = buildPolarityReport(base, head);
    const text = formatPolarityReportText(report);
    expect(text).toContain('additive');
    expect(text).toContain('b');
  });
});
