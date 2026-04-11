import {
  computeSizeImpact,
  buildSizeImpactReport,
  formatSizeImpactText,
  DepMap,
} from '../size-impact';

function makeDepMap(entries: Record<string, string>): DepMap {
  return new Map(Object.entries(entries));
}

describe('computeSizeImpact', () => {
  it('detects added packages', () => {
    const base = makeDepMap({ react: '17.0.0' });
    const head = makeDepMap({ react: '17.0.0', lodash: '4.17.21' });
    const result = computeSizeImpact(base, head);
    expect(result.added).toBe(1);
    expect(result.removed).toBe(0);
    expect(result.changed).toBe(0);
    expect(result.net).toBe(1);
  });

  it('detects removed packages', () => {
    const base = makeDepMap({ react: '17.0.0', lodash: '4.17.21' });
    const head = makeDepMap({ react: '17.0.0' });
    const result = computeSizeImpact(base, head);
    expect(result.removed).toBe(1);
    expect(result.added).toBe(0);
    expect(result.net).toBe(-1);
  });

  it('detects changed packages', () => {
    const base = makeDepMap({ react: '17.0.0' });
    const head = makeDepMap({ react: '18.0.0' });
    const result = computeSizeImpact(base, head);
    expect(result.changed).toBe(1);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.net).toBe(0);
  });

  it('returns zeros for identical maps', () => {
    const base = makeDepMap({ react: '17.0.0' });
    const head = makeDepMap({ react: '17.0.0' });
    const result = computeSizeImpact(base, head);
    expect(result).toEqual({ added: 0, removed: 0, changed: 0, net: 0 });
  });
});

describe('buildSizeImpactReport', () => {
  it('aggregates direct and transitive impacts', () => {
    const baseDirect = makeDepMap({ react: '17.0.0' });
    const headDirect = makeDepMap({ react: '18.0.0', axios: '1.0.0' });
    const baseTransitive = makeDepMap({ 'loose-envify': '1.4.0' });
    const headTransitive = makeDepMap({ 'loose-envify': '1.4.0', scheduler: '0.23.0' });

    const report = buildSizeImpactReport(baseDirect, headDirect, baseTransitive, headTransitive);
    expect(report.direct.added).toBe(1);
    expect(report.direct.changed).toBe(1);
    expect(report.transitive.added).toBe(1);
    expect(report.total.added).toBe(2);
    expect(report.total.changed).toBe(1);
  });
});

describe('formatSizeImpactText', () => {
  it('returns a formatted string', () => {
    const report = buildSizeImpactReport(
      makeDepMap({ a: '1.0.0' }),
      makeDepMap({ a: '2.0.0', b: '1.0.0' }),
      makeDepMap({}),
      makeDepMap({ c: '1.0.0' })
    );
    const text = formatSizeImpactText(report);
    expect(text).toContain('Size Impact Report');
    expect(text).toContain('+1 added');
    expect(text).toContain('~1 changed');
  });
});
