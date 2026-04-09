import { formatAsJson, formatAsMarkdown, buildOutput } from '../report-formatter';
import type { DiffResult } from '../../diff/dependency-differ';

const makeDiff = (overrides: Partial<DiffResult> = {}): DiffResult => ({
  name: 'lodash',
  type: 'updated',
  from: '3.10.0',
  to: '4.0.0',
  isBreaking: true,
  label: 'major',
  ...overrides,
});

describe('formatAsJson', () => {
  it('returns valid JSON with summary and changes', () => {
    const diffs = [makeDiff(), makeDiff({ name: 'express', isBreaking: false, label: 'patch', from: '4.18.0', to: '4.18.2' })];
    const result = JSON.parse(formatAsJson(diffs));
    expect(result.summary.total).toBe(2);
    expect(result.summary.breaking).toBe(1);
    expect(result.changes).toHaveLength(2);
    expect(result.changes[0].package).toBe('lodash');
  });

  it('handles empty diff list', () => {
    const result = JSON.parse(formatAsJson([]));
    expect(result.summary.total).toBe(0);
    expect(result.changes).toEqual([]);
  });
});

describe('formatAsMarkdown', () => {
  it('returns a markdown table with changes', () => {
    const diffs = [makeDiff()];
    const md = formatAsMarkdown(diffs);
    expect(md).toContain('## StackDiff Report');
    expect(md).toContain('| Package |');
    expect(md).toContain('`lodash`');
    expect(md).toContain('⚠️ Yes');
  });

  it('returns no-change message for empty diffs', () => {
    const md = formatAsMarkdown([]);
    expect(md).toContain('No dependency changes detected');
  });

  it('marks non-breaking changes correctly', () => {
    const diffs = [makeDiff({ isBreaking: false, label: 'patch' })];
    const md = formatAsMarkdown(diffs);
    expect(md).toContain('| No |');
  });
});

describe('buildOutput', () => {
  it('returns correct metadata for json format', () => {
    const diffs = [makeDiff()];
    const out = buildOutput(diffs, 'json');
    expect(out.format).toBe('json');
    expect(out.hasBreaking).toBe(true);
    expect(out.breakingCount).toBe(1);
    expect(out.totalChanged).toBe(1);
    expect(() => JSON.parse(out.content)).not.toThrow();
  });

  it('returns correct metadata for markdown format', () => {
    const diffs = [makeDiff({ isBreaking: false, label: 'minor' })];
    const out = buildOutput(diffs, 'markdown');
    expect(out.format).toBe('markdown');
    expect(out.hasBreaking).toBe(false);
    expect(out.content).toContain('## StackDiff Report');
  });
});
