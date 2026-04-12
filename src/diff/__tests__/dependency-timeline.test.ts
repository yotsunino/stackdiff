import {
  buildTimeline,
  classifyTimelineChange,
  formatTimelineReportText,
} from '../dependency-timeline';
import { DependencyMap } from '../index';

function makeDepMap(entries: Record<string, string>): DependencyMap {
  const map: DependencyMap = {};
  for (const [name, version] of Object.entries(entries)) {
    map[name] = { version, resolved: '', integrity: '', dependencies: {} };
  }
  return map;
}

describe('classifyTimelineChange', () => {
  it('returns added when from is null', () => {
    expect(classifyTimelineChange(null, '1.0.0')).toBe('added');
  });

  it('returns removed when to is null', () => {
    expect(classifyTimelineChange('1.0.0', null)).toBe('removed');
  });

  it('returns upgraded for version bump', () => {
    expect(classifyTimelineChange('1.0.0', '2.0.0')).toBe('upgraded');
    expect(classifyTimelineChange('1.0.0', '1.1.0')).toBe('upgraded');
    expect(classifyTimelineChange('1.0.0', '1.0.1')).toBe('upgraded');
  });

  it('returns downgraded for version drop', () => {
    expect(classifyTimelineChange('2.0.0', '1.0.0')).toBe('downgraded');
  });

  it('returns unchanged for identical versions', () => {
    expect(classifyTimelineChange('1.2.3', '1.2.3')).toBe('unchanged');
  });
});

describe('buildTimeline', () => {
  it('detects added packages', () => {
    const base = makeDepMap({});
    const head = makeDepMap({ react: '18.0.0' });
    const report = buildTimeline(base, head);
    expect(report.addedCount).toBe(1);
    expect(report.entries[0].changeType).toBe('added');
  });

  it('detects removed packages', () => {
    const base = makeDepMap({ lodash: '4.0.0' });
    const head = makeDepMap({});
    const report = buildTimeline(base, head);
    expect(report.removedCount).toBe(1);
  });

  it('counts upgraded and downgraded correctly', () => {
    const base = makeDepMap({ a: '1.0.0', b: '2.0.0' });
    const head = makeDepMap({ a: '2.0.0', b: '1.0.0' });
    const report = buildTimeline(base, head);
    expect(report.upgradedCount).toBe(1);
    expect(report.downgradedCount).toBe(1);
    expect(report.totalChanged).toBe(2);
  });

  it('excludes unchanged packages from totalChanged', () => {
    const base = makeDepMap({ stable: '1.0.0' });
    const head = makeDepMap({ stable: '1.0.0' });
    const report = buildTimeline(base, head);
    expect(report.totalChanged).toBe(0);
  });
});

describe('formatTimelineReportText', () => {
  it('includes header and summary counts', () => {
    const base = makeDepMap({ pkg: '1.0.0' });
    const head = makeDepMap({ pkg: '2.0.0' });
    const report = buildTimeline(base, head);
    const text = formatTimelineReportText(report);
    expect(text).toContain('Dependency Timeline Report');
    expect(text).toContain('Total changed: 1');
    expect(text).toContain('UPGRADED');
    expect(text).toContain('pkg');
  });

  it('omits unchanged packages from output', () => {
    const base = makeDepMap({ quiet: '3.0.0' });
    const head = makeDepMap({ quiet: '3.0.0' });
    const report = buildTimeline(base, head);
    const text = formatTimelineReportText(report);
    expect(text).not.toContain('quiet');
  });
});
