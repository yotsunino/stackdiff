import {
  buildChangelog,
  classifyChangelogType,
  formatChangelogText,
} from '../changelog-builder';
import { DepMap } from '../index';

function makeDepMap(entries: Record<string, string>): DepMap {
  const result: DepMap = {};
  for (const [name, version] of Object.entries(entries)) {
    result[name] = { version, resolved: '', dev: false };
  }
  return result;
}

describe('classifyChangelogType', () => {
  it('returns added when from is undefined', () => {
    expect(classifyChangelogType(undefined, '1.0.0')).toBe('added');
  });

  it('returns removed when to is undefined', () => {
    expect(classifyChangelogType('1.0.0', undefined)).toBe('removed');
  });

  it('returns upgraded when version increases', () => {
    expect(classifyChangelogType('1.0.0', '2.0.0')).toBe('upgraded');
    expect(classifyChangelogType('1.0.0', '1.1.0')).toBe('upgraded');
    expect(classifyChangelogType('1.0.0', '1.0.1')).toBe('upgraded');
  });

  it('returns downgraded when version decreases', () => {
    expect(classifyChangelogType('2.0.0', '1.0.0')).toBe('downgraded');
  });

  it('returns unchanged when versions are equal', () => {
    expect(classifyChangelogType('1.2.3', '1.2.3')).toBe('unchanged');
  });
});

describe('buildChangelog', () => {
  it('detects added packages', () => {
    const base = makeDepMap({});
    const head = makeDepMap({ lodash: '4.17.21' });
    const result = buildChangelog(base, head);
    expect(result.added).toBe(1);
    expect(result.entries[0]).toMatchObject({ name: 'lodash', type: 'added', from: null, to: '4.17.21' });
  });

  it('detects removed packages', () => {
    const base = makeDepMap({ lodash: '4.17.21' });
    const head = makeDepMap({});
    const result = buildChangelog(base, head);
    expect(result.removed).toBe(1);
    expect(result.entries[0].type).toBe('removed');
  });

  it('detects upgraded and downgraded packages', () => {
    const base = makeDepMap({ react: '17.0.0', axios: '1.2.0' });
    const head = makeDepMap({ react: '18.0.0', axios: '1.1.0' });
    const result = buildChangelog(base, head);
    expect(result.upgraded).toBe(1);
    expect(result.downgraded).toBe(1);
  });

  it('ignores unchanged packages', () => {
    const base = makeDepMap({ lodash: '4.17.21' });
    const head = makeDepMap({ lodash: '4.17.21' });
    const result = buildChangelog(base, head);
    expect(result.entries).toHaveLength(0);
  });

  it('sorts entries by name', () => {
    const base = makeDepMap({ zlib: '1.0.0' });
    const head = makeDepMap({ zlib: '1.0.0', axios: '1.0.0', react: '18.0.0' });
    const result = buildChangelog(base, head);
    const names = result.entries.map(e => e.name);
    expect(names).toEqual([...names].sort());
  });
});

describe('formatChangelogText', () => {
  it('returns no-change message when empty', () => {
    const changelog = buildChangelog(makeDepMap({}), makeDepMap({}));
    expect(formatChangelogText(changelog)).toContain('No dependency changes');
  });

  it('includes section headers for each change type', () => {
    const base = makeDepMap({ axios: '0.21.0' });
    const head = makeDepMap({ axios: '1.0.0', lodash: '4.0.0' });
    const output = formatChangelogText(buildChangelog(base, head));
    expect(output).toContain('↑ Upgraded');
    expect(output).toContain('+ Added');
    expect(output).toContain('axios');
    expect(output).toContain('lodash');
  });
});
