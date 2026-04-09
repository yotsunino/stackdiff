import { diffTransitive, formatTransitiveSummary } from '../transitive-diff';
import { ParsedLockfile } from '../../parser/package-lock-parser';

const makeLock = (
  deps: Record<string, { version: string; dependencies?: Record<string, { version: string }> }>
): ParsedLockfile => ({
  name: 'test',
  version: '1.0.0',
  lockfileVersion: 2,
  dependencies: deps,
});

describe('diffTransitive', () => {
  it('returns zero counts for identical lockfiles', () => {
    const lock = makeLock({ lodash: { version: '4.17.21' } });
    const result = diffTransitive(lock, lock);
    expect(result.breakingCount).toBe(0);
    expect(result.nonBreakingCount).toBe(0);
    expect(result.addedCount).toBe(0);
    expect(result.removedCount).toBe(0);
  });

  it('counts added packages', () => {
    const base = makeLock({ a: { version: '1.0.0' } });
    const head = makeLock({ a: { version: '1.0.0' }, b: { version: '2.0.0' } });
    const result = diffTransitive(base, head);
    expect(result.addedCount).toBe(1);
  });

  it('counts removed packages', () => {
    const base = makeLock({ a: { version: '1.0.0' }, b: { version: '2.0.0' } });
    const head = makeLock({ a: { version: '1.0.0' } });
    const result = diffTransitive(base, head);
    expect(result.removedCount).toBe(1);
  });

  it('detects breaking transitive change', () => {
    const base = makeLock({ react: { version: '17.0.2' } });
    const head = makeLock({ react: { version: '18.0.0' } });
    const result = diffTransitive(base, head);
    expect(result.breakingCount).toBe(1);
    expect(result.nonBreakingCount).toBe(0);
  });

  it('detects compatible transitive change', () => {
    const base = makeLock({ lodash: { version: '4.17.20' } });
    const head = makeLock({ lodash: { version: '4.17.21' } });
    const result = diffTransitive(base, head);
    expect(result.nonBreakingCount).toBe(1);
    expect(result.breakingCount).toBe(0);
  });
});

describe('formatTransitiveSummary', () => {
  it('includes counts in output', () => {
    const base = makeLock({ react: { version: '17.0.2' } });
    const head = makeLock({ react: { version: '18.0.0' } });
    const result = diffTransitive(base, head);
    const text = formatTransitiveSummary(result);
    expect(text).toContain('Breaking:    1');
    expect(text).toContain('[BREAKING]');
    expect(text).toContain('react');
  });

  it('omits conflict section when no conflicts', () => {
    const lock = makeLock({ a: { version: '1.0.0' } });
    const result = diffTransitive(lock, lock);
    const text = formatTransitiveSummary(result);
    expect(text).not.toContain('Conflicts:');
  });
});
