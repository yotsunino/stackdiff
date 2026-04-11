import {
  isDeprecated,
  detectDeprecated,
  diffDeprecated,
  formatDeprecatedReportText,
} from '../deprecated-detector';
import { DepMap } from '../index';

function makeDepMap(entries: Record<string, string>): DepMap {
  return entries as DepMap;
}

describe('isDeprecated', () => {
  it('returns false for a normal semver string', () => {
    expect(isDeprecated('1.2.3')).toEqual({ deprecated: false, message: null });
  });

  it('detects a deprecated marker without a message', () => {
    expect(isDeprecated('2.0.0deprecated:')).toEqual({ deprecated: true, message: null });
  });

  it('detects a deprecated marker with a message', () => {
    const result = isDeprecated('1.0.0deprecated:use newpkg instead');
    expect(result.deprecated).toBe(true);
    expect(result.message).toBe('use newpkg instead');
  });
});

describe('detectDeprecated', () => {
  it('returns empty report when no packages are deprecated', () => {
    const deps = makeDepMap({ lodash: '4.17.21', react: '18.0.0' });
    const report = detectDeprecated(deps);
    expect(report.count).toBe(0);
    expect(report.deprecated).toHaveLength(0);
  });

  it('detects a single deprecated package', () => {
    const deps = makeDepMap({
      lodash: '4.17.21',
      'old-pkg': '1.0.0deprecated:use new-pkg',
    });
    const report = detectDeprecated(deps);
    expect(report.count).toBe(1);
    expect(report.deprecated[0].name).toBe('old-pkg');
    expect(report.deprecated[0].message).toBe('use new-pkg');
  });

  it('detects multiple deprecated packages', () => {
    const deps = makeDepMap({
      alpha: '1.0.0deprecated:',
      beta: '2.0.0deprecated:replaced by gamma',
      gamma: '3.0.0',
    });
    const report = detectDeprecated(deps);
    expect(report.count).toBe(2);
  });
});

describe('diffDeprecated', () => {
  it('identifies newly deprecated packages', () => {
    const base = makeDepMap({ 'old-pkg': '1.0.0', other: '2.0.0' });
    const head = makeDepMap({ 'old-pkg': '1.0.0deprecated:use new-pkg', other: '2.0.0' });
    const { newlyDeprecated, resolved } = diffDeprecated(base, head);
    expect(newlyDeprecated).toHaveLength(1);
    expect(newlyDeprecated[0].name).toBe('old-pkg');
    expect(resolved).toHaveLength(0);
  });

  it('identifies resolved deprecations', () => {
    const base = makeDepMap({ 'old-pkg': '1.0.0deprecated:use new-pkg' });
    const head = makeDepMap({ 'old-pkg': '2.0.0' });
    const { newlyDeprecated, resolved } = diffDeprecated(base, head);
    expect(newlyDeprecated).toHaveLength(0);
    expect(resolved).toContain('old-pkg');
  });

  it('returns empty diff when nothing changed', () => {
    const deps = makeDepMap({ lodash: '4.17.21' });
    const { newlyDeprecated, resolved } = diffDeprecated(deps, deps);
    expect(newlyDeprecated).toHaveLength(0);
    expect(resolved).toHaveLength(0);
  });
});

describe('formatDeprecatedReportText', () => {
  it('returns a clean message when no deprecations exist', () => {
    expect(formatDeprecatedReportText({ deprecated: [], count: 0 })).toBe(
      'No deprecated packages detected.'
    );
  });

  it('lists deprecated packages with messages', () => {
    const report = {
      deprecated: [{ name: 'old-pkg', version: '1.0.0deprecated:use new-pkg', message: 'use new-pkg' }],
      count: 1,
    };
    const text = formatDeprecatedReportText(report);
    expect(text).toContain('old-pkg');
    expect(text).toContain('use new-pkg');
    expect(text).toContain('Deprecated packages (1)');
  });
});
