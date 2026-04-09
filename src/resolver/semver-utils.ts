/**
 * Utility functions for semver range resolution and compatibility checks.
 */

export type SemverRange = {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
};

/**
 * Parses a semver string into its component parts.
 * Handles versions like "1.2.3", "1.2.3-alpha.1", "^1.2.3", "~1.2.3".
 */
export function parseSemver(version: string): SemverRange | null {
  const cleaned = version.replace(/^[\^~>=<v]+/, "").trim();
  const match = cleaned.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?/
  );
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
  };
}

/**
 * Returns true if versionB is compatible with the range implied by versionA.
 * Uses simplified caret (^) semantics: same major, minor >= original.
 */
export function isCompatible(versionA: string, versionB: string): boolean {
  const a = parseSemver(versionA);
  const b = parseSemver(versionB);
  if (!a || !b) return false;
  if (a.major !== b.major) return false;
  if (b.minor < a.minor) return false;
  if (b.minor === a.minor && b.patch < a.patch) return false;
  return true;
}

/**
 * Returns a human-readable description of the semver delta between two versions.
 */
export function describeDelta(from: string, to: string): string {
  const a = parseSemver(from);
  const b = parseSemver(to);
  if (!a || !b) return "unknown";
  if (b.major !== a.major) return `major (${a.major} → ${b.major})`;
  if (b.minor !== a.minor) return `minor (${a.minor} → ${b.minor})`;
  if (b.patch !== a.patch) return `patch (${a.patch} → ${b.patch})`;
  if (b.prerelease !== a.prerelease)
    return `prerelease (${a.prerelease ?? "stable"} → ${b.prerelease ?? "stable"})`;
  return "none";
}

/**
 * Sorts an array of version strings in ascending semver order.
 */
export function sortVersions(versions: string[]): string[] {
  return [...versions].sort((a, b) => {
    const pa = parseSemver(a);
    const pb = parseSemver(b);
    if (!pa || !pb) return 0;
    if (pa.major !== pb.major) return pa.major - pb.major;
    if (pa.minor !== pb.minor) return pa.minor - pb.minor;
    return pa.patch - pb.patch;
  });
}
