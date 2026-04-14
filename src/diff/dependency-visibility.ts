export type VisibilityLevel = 'public' | 'private' | 'scoped' | 'unknown';

export interface VisibilityEntry {
  name: string;
  version: string;
  visibility: VisibilityLevel;
  scope?: string;
}

export interface VisibilityReport {
  entries: VisibilityEntry[];
  publicCount: number;
  privateCount: number;
  scopedCount: number;
  unknownCount: number;
}

export function classifyVisibility(name: string): VisibilityLevel {
  if (name.startsWith('@')) {
    return 'scoped';
  }
  if (name.startsWith('_') || name.includes('internal')) {
    return 'private';
  }
  if (name === '' || name === 'unknown') {
    return 'unknown';
  }
  return 'public';
}

export function extractScope(name: string): string | undefined {
  if (name.startsWith('@')) {
    const parts = name.split('/');
    return parts[0];
  }
  return undefined;
}

export function buildVisibilityReport(
  deps: Map<string, string>
): VisibilityReport {
  const entries: VisibilityEntry[] = [];

  for (const [name, version] of deps.entries()) {
    const visibility = classifyVisibility(name);
    const scope = extractScope(name);
    entries.push({ name, version, visibility, scope });
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  return {
    entries,
    publicCount: entries.filter((e) => e.visibility === 'public').length,
    privateCount: entries.filter((e) => e.visibility === 'private').length,
    scopedCount: entries.filter((e) => e.visibility === 'scoped').length,
    unknownCount: entries.filter((e) => e.visibility === 'unknown').length,
  };
}

export function formatVisibilityReportText(report: VisibilityReport): string {
  if (report.entries.length === 0) {
    return 'No dependencies found.';
  }

  const lines: string[] = [
    `Dependency Visibility Report`,
    `  Public:  ${report.publicCount}`,
    `  Scoped:  ${report.scopedCount}`,
    `  Private: ${report.privateCount}`,
    `  Unknown: ${report.unknownCount}`,
    '',
  ];

  for (const entry of report.entries) {
    const scopeTag = entry.scope ? ` [${entry.scope}]` : '';
    lines.push(`  ${entry.name}@${entry.version} — ${entry.visibility}${scopeTag}`);
  }

  return lines.join('\n');
}
