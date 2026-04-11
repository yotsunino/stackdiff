/**
 * pinned-packages.ts
 * Detects packages that are pinned to an exact version (no range) and flags
 * when a pinned version changes between two dependency maps.
 */

import { DependencyMap } from './index';

export interface PinnedChange {
  name: string;
  from: string;
  to: string;
}

export interface PinnedPackagesResult {
  pinned: string[];
  changed: PinnedChange[];
  unpinned: string[];
  newlyPinned: string[];
}

/** Returns true if the version string represents an exact pin (no range operators). */
export function isExactPin(version: string): boolean {
  if (!version) return false;
  const rangeChars = /[\^~><= *|]/;
  return !rangeChars.test(version.trim());
}

/** Collect all pinned package names from a dependency map. */
export function getPinnedPackages(deps: DependencyMap): string[] {
  return Object.entries(deps)
    .filter(([, entry]) => isExactPin(entry.version))
    .map(([name]) => name);
}

/**
 * Compare pinned packages between two snapshots.
 * Returns packages that were pinned in base, changed pinned versions,
 * packages that lost their pin, and packages newly pinned in head.
 */
export function diffPinnedPackages(
  base: DependencyMap,
  head: DependencyMap
): PinnedPackagesResult {
  const basePinned = new Set(getPinnedPackages(base));
  const headPinned = new Set(getPinnedPackages(head));

  const pinned = [...basePinned].filter((n) => headPinned.has(n));

  const changed: PinnedChange[] = pinned
    .filter((name) => base[name].version !== head[name].version)
    .map((name) => ({ name, from: base[name].version, to: head[name].version }));

  const unpinned = [...basePinned].filter((n) => !headPinned.has(n) && head[n]);
  const newlyPinned = [...headPinned].filter((n) => !basePinned.has(n) && base[n]);

  return { pinned, changed, unpinned, newlyPinned };
}

export function formatPinnedSummaryText(result: PinnedPackagesResult): string {
  const lines: string[] = [];
  if (result.changed.length) {
    lines.push('Pinned version changes:');
    for (const c of result.changed) {
      lines.push(`  ${c.name}: ${c.from} → ${c.to}`);
    }
  }
  if (result.unpinned.length) {
    lines.push(`Unpinned (range introduced): ${result.unpinned.join(', ')}`);
  }
  if (result.newlyPinned.length) {
    lines.push(`Newly pinned: ${result.newlyPinned.join(', ')}`);
  }
  if (!lines.length) return 'No pinned package changes.';
  return lines.join('\n');
}
