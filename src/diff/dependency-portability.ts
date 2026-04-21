import { DepMap } from '../parser';

export interface PortabilityEntry {
  name: string;
  version: string;
  hasNativeAddons: boolean;
  platformRestrictions: string[];
  engineConstraints: Record<string, string>;
  portabilityScore: number;
  classification: 'portable' | 'restricted' | 'native' | 'unknown';
}

export interface PortabilityReport {
  entries: PortabilityEntry[];
  portableCount: number;
  restrictedCount: number;
  nativeCount: number;
  overallScore: number;
}

const KNOWN_NATIVE_PACKAGES = new Set([
  'node-gyp', 'bcrypt', 'sharp', 'canvas', 'sqlite3',
  'fsevents', 'kerberos', 'cpu-features', 'node-sass',
]);

const KNOWN_PLATFORM_RESTRICTED = new Set([
  'fsevents', 'win32-api', 'windows-registry', 'node-mac-permissions',
]);

export function classifyPortability(
  name: string,
  engines: Record<string, string> = {},
  os: string[] = [],
): 'portable' | 'restricted' | 'native' | 'unknown' {
  if (KNOWN_NATIVE_PACKAGES.has(name)) return 'native';
  if (KNOWN_PLATFORM_RESTRICTED.has(name) || os.length > 0) return 'restricted';
  if (Object.keys(engines).length > 0) return 'restricted';
  return 'portable';
}

export function computePortabilityScore(
  classification: 'portable' | 'restricted' | 'native' | 'unknown',
  engineConstraints: Record<string, string>,
): number {
  const base: Record<string, number> = { portable: 100, restricted: 50, native: 20, unknown: 70 };
  let score = base[classification];
  const constraintCount = Object.keys(engineConstraints).length;
  score = Math.max(0, score - constraintCount * 10);
  return score;
}

export function buildPortabilityReport(depMap: DepMap): PortabilityReport {
  const entries: PortabilityEntry[] = [];

  for (const [name, info] of Object.entries(depMap)) {
    const engines = (info as any).engines ?? {};
    const os: string[] = (info as any).os ?? [];
    const hasNativeAddons = KNOWN_NATIVE_PACKAGES.has(name);
    const platformRestrictions = KNOWN_PLATFORM_RESTRICTED.has(name) ? [name] : os;
    const classification = classifyPortability(name, engines, os);
    const portabilityScore = computePortabilityScore(classification, engines);

    entries.push({
      name,
      version: info.version,
      hasNativeAddons,
      platformRestrictions,
      engineConstraints: engines,
      portabilityScore,
      classification,
    });
  }

  const portableCount = entries.filter(e => e.classification === 'portable').length;
  const restrictedCount = entries.filter(e => e.classification === 'restricted').length;
  const nativeCount = entries.filter(e => e.classification === 'native').length;
  const overallScore = entries.length > 0
    ? Math.round(entries.reduce((s, e) => s + e.portabilityScore, 0) / entries.length)
    : 100;

  return { entries, portableCount, restrictedCount, nativeCount, overallScore };
}

export function formatPortabilityReportText(report: PortabilityReport): string {
  const lines: string[] = ['Dependency Portability Report', '='.repeat(30)];
  lines.push(`Overall Score: ${report.overallScore}/100`);
  lines.push(`Portable: ${report.portableCount} | Restricted: ${report.restrictedCount} | Native: ${report.nativeCount}`);
  lines.push('');

  const nonPortable = report.entries.filter(e => e.classification !== 'portable');
  if (nonPortable.length === 0) {
    lines.push('All dependencies are fully portable.');
  } else {
    for (const e of nonPortable) {
      const tag = `[${e.classification.toUpperCase()}]`;
      lines.push(`${tag} ${e.name}@${e.version} (score: ${e.portabilityScore})`);
      if (e.platformRestrictions.length > 0) {
        lines.push(`  Platforms: ${e.platformRestrictions.join(', ')}`);
      }
      if (Object.keys(e.engineConstraints).length > 0) {
        const eng = Object.entries(e.engineConstraints).map(([k, v]) => `${k}: ${v}`).join(', ');
        lines.push(`  Engines: ${eng}`);
      }
    }
  }

  return lines.join('\n');
}
