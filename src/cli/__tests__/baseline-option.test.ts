import { parseBaselineOptions, baselineOptionDescription } from '../baseline-option';

describe('parseBaselineOptions', () => {
  it('returns undefined baseline and Infinity drift by default', () => {
    const opts = parseBaselineOptions([]);
    expect(opts.baselineName).toBeUndefined();
    expect(opts.maxDrift).toBe(Infinity);
  });

  it('parses --baseline flag with a space-separated value', () => {
    const opts = parseBaselineOptions(['--baseline', 'main']);
    expect(opts.baselineName).toBe('main');
  });

  it('parses --baseline= assignment form', () => {
    const opts = parseBaselineOptions(['--baseline=release-1.0']);
    expect(opts.baselineName).toBe('release-1.0');
  });

  it('parses --max-drift flag', () => {
    const opts = parseBaselineOptions(['--max-drift', '5']);
    expect(opts.maxDrift).toBe(5);
  });

  it('parses --max-drift= assignment form', () => {
    const opts = parseBaselineOptions(['--max-drift=10']);
    expect(opts.maxDrift).toBe(10);
  });

  it('parses both flags together', () => {
    const opts = parseBaselineOptions(['--baseline', 'v2', '--max-drift', '3']);
    expect(opts.baselineName).toBe('v2');
    expect(opts.maxDrift).toBe(3);
  });

  it('ignores unrelated flags', () => {
    const opts = parseBaselineOptions(['--severity', 'major', '--json']);
    expect(opts.baselineName).toBeUndefined();
    expect(opts.maxDrift).toBe(Infinity);
  });
});

describe('baselineOptionDescription', () => {
  it('mentions --baseline', () => {
    expect(baselineOptionDescription).toContain('--baseline');
  });

  it('mentions --max-drift', () => {
    expect(baselineOptionDescription).toContain('--max-drift');
  });
});
