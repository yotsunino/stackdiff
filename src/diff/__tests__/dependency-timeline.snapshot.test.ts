import { buildTimeline, formatTimelineReportText } from '../dependency-timeline';
import { DependencyMap } from '../index';

function makeDepMap(entries: Record<string, string>): DependencyMap {
  const map: DependencyMap = {};
  for (const [name, version] of Object.entries(entries)) {
    map[name] = { version, resolved: '', integrity: '', dependencies: {} };
  }
  return map;
}

describe('dependency-timeline snapshot', () => {
  it('matches snapshot for mixed changes', () => {
    const base = makeDepMap({
      react: '17.0.2',
      lodash: '4.17.21',
      axios: '1.3.0',
      removed: '2.0.0',
    });
    const head = makeDepMap({
      react: '18.2.0',
      lodash: '4.17.21',
      axios: '0.27.0',
      added: '1.0.0',
    });
    const report = buildTimeline(base, head);
    expect(report).toMatchSnapshot();
  });

  it('formats text output consistently', () => {
    const base = makeDepMap({ typescript: '4.9.0', eslint: '8.0.0' });
    const head = makeDepMap({ typescript: '5.0.0', eslint: '8.0.0', prettier: '3.0.0' });
    const report = buildTimeline(base, head);
    const text = formatTimelineReportText(report);
    expect(text).toMatchSnapshot();
  });

  it('produces empty changed list for identical maps', () => {
    const base = makeDepMap({ stable: '1.0.0', other: '2.3.4' });
    const head = makeDepMap({ stable: '1.0.0', other: '2.3.4' });
    const report = buildTimeline(base, head);
    expect(report.totalChanged).toBe(0);
    expect(report).toMatchSnapshot();
  });

  it('reports correct counts for added and removed packages', () => {
    const base = makeDepMap({ alpha: '1.0.0', beta: '2.0.0', gamma: '3.0.0' });
    const head = makeDepMap({ alpha: '1.0.0', delta: '4.0.0' });
    const report = buildTimeline(base, head);
    const added = report.changes.filter((c) => c.type === 'added');
    const removed = report.changes.filter((c) => c.type === 'removed');
    expect(added).toHaveLength(1);
    expect(removed).toHaveLength(2);
    expect(report.totalChanged).toBe(3);
  });
});
