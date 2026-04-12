import {
  assessHealth,
  buildHealthReport,
  formatHealthReportText,
} from '../dependency-health';
import { DependencyMap } from '../../parser';

function makeDepMap(entries: Record<string, string>): DependencyMap {
  return Object.fromEntries(
    Object.entries(entries).map(([name, version]) => [
      name,
      { version, resolved: '', integrity: '', dependencies: {} },
    ])
  );
}

describe('assessHealth', () => {
  it('returns healthy for a normal package', () => {
    const result = assessHealth('express', '4.18.2');
    expect(result.status).toBe('healthy');
    expect(result.reasons).toHaveLength(0);
  });

  it('marks known critical packages as critical', () => {
    const result = assessHealth('node-uuid', '1.4.8');
    expect(result.status).toBe('critical');
    expect(result.reasons.some(r => r.includes('abandoned'))).toBe(true);
  });

  it('marks deprecated packages as warning', () => {
    const result = assessHealth('request', '2.88.2');
    expect(result.status).toBe('warning');
    expect(result.reasons.some(r => r.includes('Deprecated'))).toBe(true);
  });

  it('marks pre-1.0 versions as warning', () => {
    const result = assessHealth('my-lib', '0.3.1');
    expect(result.status).toBe('warning');
    expect(result.reasons.some(r => r.includes('Pre-1.0'))).toBe(true);
  });

  it('marks unknown version as unknown status', () => {
    const result = assessHealth('some-pkg', 'unknown');
    expect(result.status).toBe('unknown');
  });

  it('critical takes precedence over deprecated warning', () => {
    const result = assessHealth('node-uuid', '0.1.0');
    expect(result.status).toBe('critical');
  });
});

describe('buildHealthReport', () => {
  it('summarises counts correctly', () => {
    const deps = makeDepMap({
      express: '4.18.2',
      request: '2.88.2',
      'node-uuid': '1.4.8',
      'my-lib': '0.2.0',
    });
    const report = buildHealthReport(deps);
    expect(report.summary.healthy).toBe(1);
    expect(report.summary.warning).toBe(2);
    expect(report.summary.critical).toBe(1);
    expect(report.entries).toHaveLength(4);
  });

  it('returns all healthy for clean deps', () => {
    const deps = makeDepMap({ lodash: '4.17.21', chalk: '5.3.0' });
    // lodash is deprecated → warning
    const report = buildHealthReport(deps);
    expect(report.summary.critical).toBe(0);
  });
});

describe('formatHealthReportText', () => {
  it('includes summary line', () => {
    const deps = makeDepMap({ express: '4.18.2' });
    const text = formatHealthReportText(buildHealthReport(deps));
    expect(text).toContain('Healthy: 1');
    expect(text).toContain('All dependencies appear healthy.');
  });

  it('lists non-healthy entries', () => {
    const deps = makeDepMap({ request: '2.88.2' });
    const text = formatHealthReportText(buildHealthReport(deps));
    expect(text).toContain('[WARNING]');
    expect(text).toContain('request@2.88.2');
  });
});
