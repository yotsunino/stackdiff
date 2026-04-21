export type ScopeCategory = 'production' | 'development' | 'optional' | 'peer' | 'unknown';

export interface ScopeEntry {
  name: string;
  version: string;
  scope: ScopeCategory;
  transitive: boolean;
}

export interface ScopeReport {
  entries: ScopeEntry[];
  totals: Record<ScopeCategory, number>;
  transitiveCount: number;
  directCount: number;
}

export type DepMap = Map<string, { version: string; scope?: ScopeCategory; transitive?: boolean }>;

export function classifyScope(scope?: string): ScopeCategory {
  if (!scope) return 'unknown';
  const s = scope.toLowerCase();
  if (s === 'prod' || s === 'production') return 'production';
  if (s === 'dev' || s === 'development') return 'development';
  if (s === 'optional') return 'optional';
  if (s === 'peer') return 'peer';
  return 'unknown';
}

export function buildScopeReport(deps: DepMap): ScopeReport {
  const entries: ScopeEntry[] = [];
  const totals: Record<ScopeCategory, number> = {
    production: 0,
    development: 0,
    optional: 0,
    peer: 0,
    unknown: 0,
  };
  let transitiveCount = 0;
  let directCount = 0;

  for (const [name, meta] of deps) {
    const scope = classifyScope(meta.scope);
    const transitive = meta.transitive ?? false;
    entries.push({ name, version: meta.version, scope, transitive });
    totals[scope]++;
    if (transitive) transitiveCount++;
    else directCount++;
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  return { entries, totals, transitiveCount, directCount };
}

export function formatScopeReportText(report: ScopeReport): string {
  const lines: string[] = ['Dependency Scope Report', '======================='];
  lines.push(`Total: ${report.entries.length} (direct: ${report.directCount}, transitive: ${report.transitiveCount})`);
  lines.push('');
  const categories: ScopeCategory[] = ['production', 'development', 'optional', 'peer', 'unknown'];
  for (const cat of categories) {
    if (report.totals[cat] === 0) continue;
    lines.push(`[${cat.toUpperCase()}] (${report.totals[cat]})`);
    for (const e of report.entries.filter(e => e.scope === cat)) {
      const tag = e.transitive ? ' (transitive)' : '';
      lines.push(`  ${e.name}@${e.version}${tag}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}
