import { DepMap } from './index';

export interface AgeEntry {
  name: string;
  version: string;
  publishedAt: Date | null;
  ageInDays: number | null;
}

export interface AgeReport {
  entries: AgeEntry[];
  oldest: AgeEntry | null;
  averageAgeDays: number | null;
}

export function computeAgeInDays(publishedAt: Date, now: Date = new Date()): number {
  const ms = now.getTime() - publishedAt.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function buildAgeReport(
  deps: DepMap,
  publishDates: Record<string, Date | null>
): AgeReport {
  const entries: AgeEntry[] = [];
  const now = new Date();

  for (const [name, info] of Object.entries(deps)) {
    const publishedAt = publishDates[name] ?? null;
    const ageInDays = publishedAt ? computeAgeInDays(publishedAt, now) : null;
    entries.push({ name, version: info.version, publishedAt, ageInDays });
  }

  const withAge = entries.filter((e) => e.ageInDays !== null) as (AgeEntry & { ageInDays: number })[];

  const oldest = withAge.length
    ? withAge.reduce((a, b) => (a.ageInDays > b.ageInDays ? a : b))
    : null;

  const averageAgeDays = withAge.length
    ? Math.round(withAge.reduce((sum, e) => sum + e.ageInDays, 0) / withAge.length)
    : null;

  return { entries, oldest, averageAgeDays };
}

export function formatAgeReportText(report: AgeReport): string {
  if (report.entries.length === 0) return 'No dependency age data available.';

  const lines: string[] = ['Dependency Age Report', '====================='];

  for (const e of report.entries) {
    const age = e.ageInDays !== null ? `${e.ageInDays} days` : 'unknown';
    lines.push(`  ${e.name}@${e.version} — age: ${age}`);
  }

  if (report.oldest) {
    lines.push('');
    lines.push(`Oldest: ${report.oldest.name}@${report.oldest.version} (${report.oldest.ageInDays} days)`);
  }

  if (report.averageAgeDays !== null) {
    lines.push(`Average age: ${report.averageAgeDays} days`);
  }

  return lines.join('\n');
}
