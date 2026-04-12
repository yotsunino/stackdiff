import {
  classifyProvenance,
  buildProvenanceMap,
  diffProvenance,
  formatProvenanceReportText,
  ProvenanceEntry,
} from '../dependency-provenance';

function makeEntry(name: string, version: string, provenance: ProvenanceEntry['provenance']): ProvenanceEntry {
  return { name, version, provenance };
}

function makeMap(entries: ProvenanceEntry[]): Map<string, ProvenanceEntry> {
  return new Map(entries.map((e) => [e.name, e]));
}

describe('classifyProvenance', () => {
  const direct = new Set(['react', 'lodash']);
  const dev = new Set(['jest', 'typescript']);
  const peer = new Set(['react-dom']);

  it('classifies peer deps first', () => {
    expect(classifyProvenance('react-dom', direct, dev, peer)).toBe('peer');
  });

  it('classifies dev deps', () => {
    expect(classifyProvenance('jest', direct, dev, peer)).toBe('dev');
  });

  it('classifies direct deps', () => {
    expect(classifyProvenance('react', direct, dev, peer)).toBe('direct');
  });

  it('falls back to transitive', () => {
    expect(classifyProvenance('semver', direct, dev, peer)).toBe('transitive');
  });
});

describe('buildProvenanceMap', () => {
  it('builds a map with correct provenance types', () => {
    const packages = { react: '18.0.0', jest: '29.0.0', semver: '7.0.0' };
    const direct = new Set(['react']);
    const dev = new Set(['jest']);
    const peer = new Set<string>();
    const map = buildProvenanceMap(packages, direct, dev, peer);
    expect(map.get('react')?.provenance).toBe('direct');
    expect(map.get('jest')?.provenance).toBe('dev');
    expect(map.get('semver')?.provenance).toBe('transitive');
  });
});

describe('diffProvenance', () => {
  it('detects provenance changes', () => {
    const base = makeMap([makeEntry('lodash', '4.0.0', 'transitive')]);
    const head = makeMap([makeEntry('lodash', '4.0.0', 'direct')]);
    const report = diffProvenance(base, head);
    expect(report.changes).toHaveLength(1);
    expect(report.changes[0]).toMatchObject({ name: 'lodash', from: 'transitive', to: 'direct' });
  });

  it('detects added packages', () => {
    const base = makeMap([]);
    const head = makeMap([makeEntry('axios', '1.0.0', 'direct')]);
    const report = diffProvenance(base, head);
    expect(report.added).toHaveLength(1);
    expect(report.added[0].name).toBe('axios');
  });

  it('detects removed packages', () => {
    const base = makeMap([makeEntry('moment', '2.0.0', 'direct')]);
    const head = makeMap([]);
    const report = diffProvenance(base, head);
    expect(report.removed).toHaveLength(1);
    expect(report.removed[0].name).toBe('moment');
  });

  it('returns empty report when nothing changes', () => {
    const base = makeMap([makeEntry('react', '18.0.0', 'direct')]);
    const head = makeMap([makeEntry('react', '18.0.0', 'direct')]);
    const report = diffProvenance(base, head);
    expect(report.changes).toHaveLength(0);
    expect(report.added).toHaveLength(0);
    expect(report.removed).toHaveLength(0);
  });
});

describe('formatProvenanceReportText', () => {
  it('formats a full report', () => {
    const report = {
      changes: [{ name: 'lodash', from: 'transitive' as const, to: 'direct' as const, version: '4.0.0' }],
      added: [makeEntry('axios', '1.0.0', 'direct')],
      removed: [makeEntry('moment', '2.0.0', 'dev')],
    };
    const text = formatProvenanceReportText(report);
    expect(text).toContain('Provenance Changes');
    expect(text).toContain('lodash@4.0.0: transitive → direct');
    expect(text).toContain('axios@1.0.0 (direct)');
    expect(text).toContain('moment@2.0.0 (dev)');
  });

  it('shows no-change message when empty', () => {
    const text = formatProvenanceReportText({ changes: [], added: [], removed: [] });
    expect(text).toContain('No provenance changes detected.');
  });
});
