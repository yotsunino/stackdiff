import { formatReport } from '../conflict-reporter';
import { DiffResult } from '../../diff/dependency-differ';

const makeDiff = (overrides: Partial<DiffResult>): DiffResult => ({
  name: 'some-pkg',
  fromVersion: '1.0.0',
  toVersion: '2.0.0',
  isMajorChange: true,
  ...overrides,
});

describe('formatReport', () => {
  it('returns no-conflict message when diffs is empty', () => {
    const result = formatReport([]);
    expect(result).toContain('No dependency conflicts detected');
  });

  it('labels major version bumps as breaking', () => {
    const diffs = [makeDiff({ name: 'react', fromVersion: '17.0.0', toVersion: '18.0.0', isMajorChange: true })];
    const result = formatReport(diffs);
    expect(result).toContain('Breaking changes');
    expect(result).toContain('react');
    expect(result).toContain('17.0.0');
    expect(result).toContain('18.0.0');
  });

  it('labels minor/patch bumps as non-breaking', () => {
    const diffs = [makeDiff({ name: 'lodash', fromVersion: '4.17.20', toVersion: '4.17.21', isMajorChange: false })];
    const result = formatReport(diffs);
    expect(result).toContain('Non-breaking changes');
    expect(result).toContain('lodash');
  });

  it('filters to only breaking changes when onlyBreaking is true', () => {
    const diffs = [
      makeDiff({ name: 'react', isMajorChange: true }),
      makeDiff({ name: 'lodash', isMajorChange: false }),
    ];
    const result = formatReport(diffs, { onlyBreaking: true });
    expect(result).toContain('react');
    expect(result).not.toContain('lodash');
  });

  it('returns valid JSON when format is json', () => {
    const diffs = [makeDiff({ name: 'axios' })];
    const result = formatReport(diffs, { format: 'json' });
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].name).toBe('axios');
  });

  it('shows NEW label when fromVersion is null', () => {
    const diffs = [makeDiff({ name: 'new-pkg', fromVersion: null, isMajorChange: false })];
    const result = formatReport(diffs);
    expect(result).toContain('NEW');
  });
});
