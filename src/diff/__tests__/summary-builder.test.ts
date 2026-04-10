import {
  buildDiffSummary,
  formatSummaryText,
  formatSummaryJson,
  ChangeEntry,
} from '../summary-builder';

function makeEntry(
  name: string,
  changeType: ChangeEntry['changeType'],
  severity: ChangeEntry['severity'],
  from: string | null = null,
  to: string | null = null
): ChangeEntry {
  return { name, changeType, severity, from, to };
}

describe('buildDiffSummary', () => {
  it('returns zero counts for empty entries', () => {
    const summary = buildDiffSummary([]);
    expect(summary.totalChanged).toBe(0);
    expect(summary.added).toBe(0);
    expect(summary.removed).toBe(0);
    expect(summary.upgraded).toBe(0);
    expect(summary.downgraded).toBe(0);
    expect(summary.majorChanges).toBe(0);
    expect(summary.hasBreakingChanges).toBe(false);
    expect(summary.transitiveChanged).toBe(0);
  });

  it('counts added and removed entries correctly', () => {
    const entries: ChangeEntry[] = [
      makeEntry('lodash', 'added', 'none', null, '4.17.21'),
      makeEntry('express', 'removed', 'none', '4.18.0', null),
    ];
    const summary = buildDiffSummary(entries);
    expect(summary.added).toBe(1);
    expect(summary.removed).toBe(1);
    expect(summary.totalChanged).toBe(2);
  });

  it('detects breaking changes when major severity present', () => {
    const entries: ChangeEntry[] = [
      makeEntry('react', 'upgraded', 'major', '17.0.0', '18.0.0'),
    ];
    const summary = buildDiffSummary(entries);
    expect(summary.majorChanges).toBe(1);
    expect(summary.hasBreakingChanges).toBe(true);
  });

  it('counts minor and patch changes separately', () => {
    const entries: ChangeEntry[] = [
      makeEntry('axios', 'upgraded', 'minor', '1.0.0', '1.1.0'),
      makeEntry('chalk', 'upgraded', 'patch', '5.0.0', '5.0.1'),
      makeEntry('ts-node', 'downgraded', 'patch', '10.9.2', '10.9.1'),
    ];
    const summary = buildDiffSummary(entries);
    expect(summary.minorChanges).toBe(1);
    expect(summary.patchChanges).toBe(2);
    expect(summary.downgraded).toBe(1);
    expect(summary.hasBreakingChanges).toBe(false);
  });

  it('includes transitive count in summary', () => {
    const summary = buildDiffSummary([], 12);
    expect(summary.transitiveChanged).toBe(12);
  });
});

describe('formatSummaryText', () => {
  it('includes breaking changes warning when applicable', () => {
    const entries: ChangeEntry[] = [
      makeEntry('next', 'upgraded', 'major', '12.0.0', '13.0.0'),
    ];
    const text = formatSummaryText(buildDiffSummary(entries));
    expect(text).toContain('Breaking changes detected');
    expect(text).toContain('Major (breaking): 1');
  });

  it('shows no breaking changes message when safe', () => {
    const text = formatSummaryText(buildDiffSummary([]));
    expect(text).toContain('No breaking changes detected');
  });
});

describe('formatSummaryJson', () => {
  it('returns valid JSON with all summary fields', () => {
    const summary = buildDiffSummary([], 3);
    const json = JSON.parse(formatSummaryJson(summary));
    expect(json).toHaveProperty('totalChanged');
    expect(json).toHaveProperty('hasBreakingChanges');
    expect(json.transitiveChanged).toBe(3);
  });
});
