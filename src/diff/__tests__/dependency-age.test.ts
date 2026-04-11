import {
  computeAgeInDays,
  buildAgeReport,
  formatAgeReportText,
} from '../dependency-age';
import { DepMap } from '../index';

function makeDepMap(entries: Record<string, string>): DepMap {
  const map: DepMap = {};
  for (const [name, version] of Object.entries(entries)) {
    map[name] = { version };
  }
  return map;
}

describe('computeAgeInDays', () => {
  it('returns 0 for same-day date', () => {
    const now = new Date('2024-06-01T12:00:00Z');
    expect(computeAgeInDays(now, now)).toBe(0);
  });

  it('returns correct number of days', () => {
    const published = new Date('2024-01-01T00:00:00Z');
    const now = new Date('2024-06-01T00:00:00Z');
    expect(computeAgeInDays(published, now)).toBe(152);
  });
});

describe('buildAgeReport', () => {
  it('builds entries for each dependency', () => {
    const deps = makeDepMap({ react: '18.0.0', lodash: '4.17.21' });
    const now = new Date('2024-06-01T00:00:00Z');
    const publishDates: Record<string, Date | null> = {
      react: new Date('2024-01-01T00:00:00Z'),
      lodash: new Date('2023-06-01T00:00:00Z'),
    };

    // Patch Date to control 'now'
    const spy = jest.spyOn(global, 'Date').mockImplementation(
      (arg?: any) => (arg !== undefined ? new (jest.requireActual('date-fns') as any) : now) as Date
    );

    const report = buildAgeReport(deps, publishDates);
    spy.mockRestore();

    expect(report.entries).toHaveLength(2);
    expect(report.entries.find((e) => e.name === 'react')).toBeDefined();
    expect(report.entries.find((e) => e.name === 'lodash')).toBeDefined();
  });

  it('handles null publish dates gracefully', () => {
    const deps = makeDepMap({ unknown: '1.0.0' });
    const report = buildAgeReport(deps, { unknown: null });
    expect(report.entries[0].ageInDays).toBeNull();
    expect(report.oldest).toBeNull();
    expect(report.averageAgeDays).toBeNull();
  });

  it('identifies the oldest package', () => {
    const deps = makeDepMap({ a: '1.0.0', b: '2.0.0' });
    const now = new Date('2024-06-01T00:00:00Z');
    const publishDates = {
      a: new Date('2020-01-01T00:00:00Z'),
      b: new Date('2023-01-01T00:00:00Z'),
    };
    jest.useFakeTimers().setSystemTime(now);
    const report = buildAgeReport(deps, publishDates);
    jest.useRealTimers();
    expect(report.oldest?.name).toBe('a');
  });
});

describe('formatAgeReportText', () => {
  it('returns fallback message for empty report', () => {
    const result = formatAgeReportText({ entries: [], oldest: null, averageAgeDays: null });
    expect(result).toBe('No dependency age data available.');
  });

  it('includes package names and ages in output', () => {
    const report = {
      entries: [{ name: 'react', version: '18.0.0', publishedAt: new Date(), ageInDays: 100 }],
      oldest: { name: 'react', version: '18.0.0', publishedAt: new Date(), ageInDays: 100 },
      averageAgeDays: 100,
    };
    const text = formatAgeReportText(report);
    expect(text).toContain('react@18.0.0');
    expect(text).toContain('100 days');
    expect(text).toContain('Average age: 100 days');
  });
});
