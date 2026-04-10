import { parseVersion, changeLabel } from '../resolver/version-resolver';

export interface UpgradePath {
  name: string;
  from: string;
  to: string;
  label: 'major' | 'minor' | 'patch' | 'unknown';
  breaking: boolean;
}

export interface UpgradePathSummary {
  paths: UpgradePath[];
  breakingCount: number;
  safeCount: number;
}

export function buildUpgradePath(
  name: string,
  from: string,
  to: string
): UpgradePath {
  const fromVer = parseVersion(from);
  const toVer = parseVersion(to);
  const label = changeLabel(fromVer, toVer);
  const breaking = label === 'major';
  return { name, from, to, label, breaking };
}

export function buildUpgradePaths(
  changes: Array<{ name: string; from: string; to: string }>
): UpgradePathSummary {
  const paths = changes.map(({ name, from, to }) =>
    buildUpgradePath(name, from, to)
  );
  const breakingCount = paths.filter((p) => p.breaking).length;
  const safeCount = paths.length - breakingCount;
  return { paths, breakingCount, safeCount };
}

export function formatUpgradePathText(summary: UpgradePathSummary): string {
  if (summary.paths.length === 0) return 'No upgrades detected.';
  const lines: string[] = [
    `Upgrade Paths (${summary.breakingCount} breaking, ${summary.safeCount} safe):`,
  ];
  for (const p of summary.paths) {
    const tag = p.breaking ? '[BREAKING]' : '[safe]';
    lines.push(`  ${tag} ${p.name}: ${p.from} → ${p.to} (${p.label})`);
  }
  return lines.join('\n');
}
