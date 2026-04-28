import {
  buildMomentumReport,
  classifyMomentum,
  computeVersionDelta,
  formatMomentumReportText,
  DepMap,
} from '../dependency-momentum';

function makeDepMap(entries: Record<string, { version: string; age?: number }>): DepMap {
  return new Map(Object.entries(entries));
}

describe('computeVersionDelta', () => {
  it('returns positive delta for patch bump', () => {
    expect(computeVersionDelta('1.0.0', '1.0.3')).toBe(3);
  });

  it('returns weighted delta for minor bump', () => {
    expect(computeVersionDelta('1.0.0', '1.2.0')).toBe(20);
  });

  it('returns weighted delta for major bump', () => {
    expect(computeVersionDelta('1.0.0', '3.0.0')).toBe(200);
  });

  it('returns negative delta for downgrade', () => {
    expect(computeVersionDelta('2.0.0', '1.0.0')).toBe(-100);
  });
});

describe('classifyMomentum', () => {
  it('classifies high score as accelerating', () => {
    expect(classifyMomentum(80)).toBe('accelerating');
  });

  it('classifies mid score as steady', () => {
    expect(classifyMomentum(50)).toBe('steady');
  });

  it('classifies low score as decelerating', () => {
    expect(classifyMomentum(15)).toBe('decelerating');
  });

  it('classifies zero as stalled', () => {
    expect(classifyMomentum(0)).toBe('stalled');
  });
});

describe('buildMomentumReport', () => {
  it('skips packages with no version change', () => {
    const base = makeDepMap({ lodash: { version: '4.17.21' } });
    const head = makeDepMap({ lodash: { version: '4.17.21' } });
    const report = buildMomentumReport(base, head);
    expect(report.entries).toHaveLength(0);
  });

  it('includes changed packages', () => {
    const base = makeDepMap({ react: { version: '17.0.0' } });
    const head = makeDepMap({ react: { version: '18.0.0' } });
    const report = buildMomentumReport(base, head);
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0].name).toBe('react');
    expect(report.entries[0].from).toBe('17.0.0');
    expect(report.entries[0].to).toBe('18.0.0');
  });

  it('computes a non-zero average score for major bumps', () => {
    const base = makeDepMap({ express: { version: '4.0.0' } });
    const head = makeDepMap({ express: { version: '5.0.0' } });
    const report = buildMomentumReport(base, head);
    expect(report.averageScore).toBeGreaterThan(0);
  });
});

describe('formatMomentumReportText', () => {
  it('returns fallback message when no entries', () => {
    const report = buildMomentumReport(new Map(), new Map());
    expect(formatMomentumReportText(report)).toContain('No momentum data');
  });

  it('formats entries with labels', () => {
    const base = makeDepMap({ axios: { version: '0.21.0' } });
    const head = makeDepMap({ axios: { version: '1.0.0' } });
    const report = buildMomentumReport(base, head);
    const text = formatMomentumReportText(report);
    expect(text).toContain('axios');
    expect(text).toContain('0.21.0');
    expect(text).toContain('1.0.0');
  });
});
