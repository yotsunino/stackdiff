import { diffSnapshots, formatSnapshotDiffSummary } from '../snapshot-diff';
import { Snapshot } from '../snapshot-store';
import { DependencyMap } from '../../parser';

function makeSnap(branch: string, entries: [string, string][], ts = 0): Snapshot {
  const dependencies: DependencyMap = new Map(
    entries.map(([name, version]) => [
      name,
      { name, version, resolved: '', dependencies: {} },
    ])
  );
  return { branch, timestamp: ts, dependencies };
}

describe('diffSnapshots', () => {
  it('detects added packages', () => {
    const base = makeSnap('main', [['lodash', '4.0.0']]);
    const target = makeSnap('feature', [['lodash', '4.0.0'], ['axios', '1.0.0']]);
    const result = diffSnapshots(base, target);
    expect(result.diff.some(d => d.name === 'axios' && d.changeType === 'added')).toBe(true);
  });

  it('detects removed packages', () => {
    const base = makeSnap('main', [['lodash', '4.0.0'], ['moment', '2.0.0']]);
    const target = makeSnap('feature', [['lodash', '4.0.0']]);
    const result = diffSnapshots(base, target);
    expect(result.diff.some(d => d.name === 'moment' && d.changeType === 'removed')).toBe(true);
  });

  it('detects version changes', () => {
    const base = makeSnap('main', [['react', '17.0.0']]);
    const target = makeSnap('feature', [['react', '18.0.0']]);
    const result = diffSnapshots(base, target);
    expect(result.diff.some(d => d.name === 'react')).toBe(true);
  });

  it('includes branch and timestamp metadata', () => {
    const base = makeSnap('main', [], 1000);
    const target = makeSnap('feature', [], 2000);
    const result = diffSnapshots(base, target);
    expect(result.base).toBe('main');
    expect(result.target).toBe('feature');
    expect(result.baseTimestamp).toBe(1000);
    expect(result.targetTimestamp).toBe(2000);
  });
});

describe('formatSnapshotDiffSummary', () => {
  it('includes branch names and change count', () => {
    const base = makeSnap('main', [['react', '17.0.0']], Date.now());
    const target = makeSnap('feature', [['react', '18.0.0']], Date.now());
    const result = diffSnapshots(base, target);
    const summary = formatSnapshotDiffSummary(result);
    expect(summary).toContain('main');
    expect(summary).toContain('feature');
    expect(summary).toContain('react');
  });
});
