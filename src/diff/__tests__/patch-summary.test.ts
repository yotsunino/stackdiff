import { buildPatchSummary, formatPatchSummaryText } from '../patch-summary';
import { DependencyMap } from '../../parser';

function makeDepMap(entries: Record<string, string>): DependencyMap {
  const map: DependencyMap = {};
  for (const [name, version] of Object.entries(entries)) {
    map[name] = { version, resolved: '', integrity: '', dependencies: {} };
  }
  return map;
}

describe('buildPatchSummary', () => {
  it('returns empty array when maps are identical', () => {
    const base = makeDepMap({ lodash: '4.17.21' });
    const head = makeDepMap({ lodash: '4.17.21' });
    expect(buildPatchSummary(base, head)).toHaveLength(0);
  });

  it('detects added packages', () => {
    const base = makeDepMap({});
    const head = makeDepMap({ express: '4.18.0' });
    const result = buildPatchSummary(base, head);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ package: 'express', changeType: 'added', from: '', to: '4.18.0' });
  });

  it('detects removed packages', () => {
    const base = makeDepMap({ express: '4.18.0' });
    const head = makeDepMap({});
    const result = buildPatchSummary(base, head);
    expect(result[0]).toMatchObject({ package: 'express', changeType: 'removed', from: '4.18.0', to: '' });
  });

  it('classifies patch change', () => {
    const base = makeDepMap({ lodash: '4.17.20' });
    const head = makeDepMap({ lodash: '4.17.21' });
    const result = buildPatchSummary(base, head);
    expect(result[0].changeType).toBe('patch');
  });

  it('classifies minor change', () => {
    const base = makeDepMap({ lodash: '4.16.0' });
    const head = makeDepMap({ lodash: '4.17.0' });
    const result = buildPatchSummary(base, head);
    expect(result[0].changeType).toBe('minor');
  });

  it('classifies major change', () => {
    const base = makeDepMap({ react: '16.14.0' });
    const head = makeDepMap({ react: '17.0.0' });
    const result = buildPatchSummary(base, head);
    expect(result[0].changeType).toBe('major');
  });

  it('marks direct deps correctly', () => {
    const base = makeDepMap({ lodash: '4.17.20' });
    const head = makeDepMap({ lodash: '4.17.21' });
    const result = buildPatchSummary(base, head, new Set(['lodash']));
    expect(result[0].isDirect).toBe(true);
  });

  it('marks transitive deps correctly', () => {
    const base = makeDepMap({ lodash: '4.17.20' });
    const head = makeDepMap({ lodash: '4.17.21' });
    const result = buildPatchSummary(base, head, new Set());
    expect(result[0].isDirect).toBe(false);
  });

  it('returns results sorted by package name', () => {
    const base = makeDepMap({ zod: '3.0.0', axios: '1.0.0' });
    const head = makeDepMap({ zod: '3.1.0', axios: '1.1.0' });
    const result = buildPatchSummary(base, head);
    expect(result.map(r => r.package)).toEqual(['axios', 'zod']);
  });
});

describe('formatPatchSummaryText', () => {
  it('returns no-change message for empty summaries', () => {
    expect(formatPatchSummaryText([])).toBe('No dependency changes detected.');
  });

  it('formats added package', () => {
    const summaries = [{ package: 'express', from: '', to: '4.18.0', changeType: 'added' as const, isDirect: true }];
    const output = formatPatchSummaryText(summaries);
    expect(output).toContain('[direct] express: added @ 4.18.0');
  });

  it('formats removed package', () => {
    const summaries = [{ package: 'express', from: '4.18.0', to: '', changeType: 'removed' as const, isDirect: false }];
    const output = formatPatchSummaryText(summaries);
    expect(output).toContain('[transitive] express: removed (was 4.18.0)');
  });

  it('formats version bump', () => {
    const summaries = [{ package: 'lodash', from: '4.17.20', to: '4.17.21', changeType: 'patch' as const, isDirect: true }];
    const output = formatPatchSummaryText(summaries);
    expect(output).toContain('4.17.20 → 4.17.21 (patch)');
  });
});
