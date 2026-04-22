import {
  buildSymmetryScoreReport,
  formatSymmetryScoreText,
} from '../dependency-symmetry-score';
import { DepMap } from '../../parser';

function makeDepMap(entries: Record<string, string>): DepMap {
  const map: DepMap = {};
  for (const [name, version] of Object.entries(entries)) {
    map[name] = { version, resolved: '', dependencies: {} };
  }
  return map;
}

describe('buildSymmetryScoreReport', () => {
  it('returns score 100 when base and head are identical', () => {
    const base = makeDepMap({ react: '18.0.0', lodash: '4.17.21' });
    const head = makeDepMap({ react: '18.0.0', lodash: '4.17.21' });
    const report = buildSymmetryScoreReport(base, head);
    expect(report.score).toBe(100);
    expect(report.grade).toBe('A');
    expect(report.symmetricCount).toBe(2);
    expect(report.asymmetricCount).toBe(0);
  });

  it('detects version mismatch as asymmetric', () => {
    const base = makeDepMap({ react: '17.0.0', lodash: '4.17.21' });
    const head = makeDepMap({ react: '18.0.0', lodash: '4.17.21' });
    const report = buildSymmetryScoreReport(base, head);
    expect(report.asymmetricCount).toBe(1);
    expect(report.symmetricCount).toBe(1);
    expect(report.score).toBe(50);
    expect(report.grade).toBe('D');
  });

  it('treats packages only in base as asymmetric', () => {
    const base = makeDepMap({ react: '18.0.0', axios: '1.0.0' });
    const head = makeDepMap({ react: '18.0.0' });
    const report = buildSymmetryScoreReport(base, head);
    expect(report.asymmetricCount).toBe(1);
    const entry = report.entries.find((e) => e.name === 'axios');
    expect(entry?.headVersion).toBeNull();
  });

  it('treats packages only in head as asymmetric', () => {
    const base = makeDepMap({ react: '18.0.0' });
    const head = makeDepMap({ react: '18.0.0', axios: '1.0.0' });
    const report = buildSymmetryScoreReport(base, head);
    expect(report.asymmetricCount).toBe(1);
    const entry = report.entries.find((e) => e.name === 'axios');
    expect(entry?.baseVersion).toBeNull();
  });

  it('returns score 100 and grade A for empty maps', () => {
    const report = buildSymmetryScoreReport({}, {});
    expect(report.score).toBe(100);
    expect(report.totalPackages).toBe(0);
  });
});

describe('formatSymmetryScoreText', () => {
  it('includes score and grade in output', () => {
    const base = makeDepMap({ react: '17.0.0' });
    const head = makeDepMap({ react: '18.0.0' });
    const report = buildSymmetryScoreReport(base, head);
    const text = formatSymmetryScoreText(report);
    expect(text).toContain('Symmetry Score:');
    expect(text).toContain('react');
    expect(text).toContain('17.0.0');
    expect(text).toContain('18.0.0');
  });

  it('shows all-in-sync message when fully symmetric', () => {
    const base = makeDepMap({ lodash: '4.17.21' });
    const head = makeDepMap({ lodash: '4.17.21' });
    const report = buildSymmetryScoreReport(base, head);
    const text = formatSymmetryScoreText(report);
    expect(text).toContain('All packages are in sync');
  });
});
