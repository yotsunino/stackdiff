/**
 * ignored-packages.ts
 * Manages a list of package patterns to ignore during diffing.
 */

export interface IgnoreConfig {
  patterns: string[];
}

/**
 * Returns true if the package name matches any ignore pattern.
 * Supports exact names and simple glob wildcards (e.g. "@types/*").
 */
export function isIgnored(packageName: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -1); // e.g. "@types/"
      if (packageName.startsWith(prefix)) return true;
    } else if (pattern === packageName) {
      return true;
    }
  }
  return false;
}

/**
 * Filters a dependency map, removing entries whose names match any ignore pattern.
 */
export function applyIgnoreList(
  deps: Map<string, string>,
  patterns: string[]
): Map<string, string> {
  if (patterns.length === 0) return deps;
  const result = new Map<string, string>();
  for (const [name, version] of deps) {
    if (!isIgnored(name, patterns)) {
      result.set(name, version);
    }
  }
  return result;
}

/**
 * Parses a comma-separated ignore string into a pattern array.
 * E.g. "lodash,@types/*" => ["lodash", "@types/*"]
 */
export function parseIgnorePatterns(raw: string | undefined): string[] {
  if (!raw || raw.trim() === '') return [];
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}
