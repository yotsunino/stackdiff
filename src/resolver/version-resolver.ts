/**
 * Resolves and compares semantic version strings,
 * providing utilities for range compatibility checks.
 */

export interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
  raw: string;
}

/**
 * Parses a version string (strips leading ^ ~ v) into its numeric components.
 */
export function parseVersion(version: string): VersionInfo | null {
  const cleaned = version.replace(/^[\^~v]/, "").trim();
  const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    raw: version,
  };
}

/**
 * Returns true if versionB is a breaking change relative to versionA.
 * Breaking = major bump, or major=0 and minor bump.
 */
export function isBreakingChange(versionA: string, versionB: string): boolean {
  const a = parseVersion(versionA);
  const b = parseVersion(versionB);
  if (!a || !b) return false;

  if (a.major === 0 && b.major === 0) {
    return b.minor > a.minor;
  }
  return b.major > a.major;
}

/**
 * Compares two versions.
 * Returns -1 if a < b, 0 if equal, 1 if a > b.
 */
export function compareVersions(versionA: string, versionB: string): -1 | 0 | 1 {
  const a = parseVersion(versionA);
  const b = parseVersion(versionB);
  if (!a || !b) return 0;

  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}

/**
 * Returns a human-readable change type label.
 */
export function changeLabel(versionA: string, versionB: string): string {
  const a = parseVersion(versionA);
  const b = parseVersion(versionB);
  if (!a || !b) return "unknown";
  if (b.major !== a.major) return "major";
  if (b.minor !== a.minor) return "minor";
  if (b.patch !== a.patch) return "patch";
  return "none";
}
