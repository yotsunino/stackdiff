import { classifyChange, diffDirect, formatDirectSummary, DirectDiffEntry } from '../direct-diff';
import { DependencyMap } from '../../parser';

function makeDepMap(entries: Record<string, string>): DependencyMap {
  const map: DependencyMap = {};
  for (const [name, version] of Object.entries(entries)) {
    map[name] = { version, resolved: '', integrity: '', dependencies: {} };
  }
  return map;
}

describe('classifyChange', () => {
  it('returns added when from is null', () => {
    expect(classifyChange(null, '1.0.0')).toBe('added');
  });

  it('returns removed when to is null', () => {
    expect(classifyChange('1.0.0', null)).toBe('removed');
  });

  it('returns unchanged when versions are equal', () => {
    expect(classifyChange('1.2.3', '1.2.3')).toBe('unchanged');
  });

  it('returns upgraded for a higher version', () => {
    expect(classifyChange('1.0.0', '2.0.0')).toBe('upgraded');
  });

  it('returns downgraded for a lower version', () => {
    expect(classifyChange('2.0.0', '1.0.0')).toBe('downgraded');
  });
});

describe('diffDirect', () => {
  const base = makeDepMap({ react: '17.0.0', lodash: '4.17.21', axios: '0.21.0' });
  const head = makeDepMap({ react: '18.0.0', lodash: '4.17.21', express: '4.18.0' });

  it('detects upgrades', () => {
    const result = diffDirect(base, head);
    const entry = result.find(e => e.name === 'react');
    expect(entry?.change).toBe('upgraded');
    expect(entry?.breaking).toBe(true);
  });

  it('detects additions', () => {
    const result = diffDirect(base, head);
    const entry = result.find(e => e.name === 'express');
    expect(entry?.change).toBe('added');
    expect(entry?.from).toBeNull();
  });

  it('detects removals', () => {
    const result = diffDirect(base, head);
    const entry = result.find(e => e.name === 'axios');
    expect(entry?.change).toBe('removed');
    expect(entry?.to).toBeNull();
  });

  it('excludes unchanged packages', () => {
    const result = diffDirect(base, head);
    expect(result.find(e => e.name === 'lodash')).toBeUndefined();
  });

  it('returns results sorted by name', () => {
    const result = diffDirect(base, head);
    const names = result.map(e => e.name);
    expect(names).toEqual([...names].sort());
  });
});

describe('formatDirectSummary', () => {
  it('returns a no-change message for empty input', () => {
    expect(formatDirectSummary([])).toBe('No direct dependency changes.');
  });

  it('includes package names and labels in output', () => {
    const entries: DirectDiffEntry[] = [
      { name: 'react', from: '17.0.0', to: '18.0.0', change: 'upgraded', label: 'major', breaking: true },
    ];
    const output = formatDirectSummary(entries);
    expect(output).toContain('react');
    expect(output).toContain('BREAKING');
    expect(output).toContain('major');
  });
});
