import { DiffEntry } from '../diff/dependency-differ';

export type FilterOptions = {
  include?: string[];
  exclude?: string[];
  onlyBreaking?: boolean;
  onlyDirect?: boolean;
};

/**
 * Returns true if the package name matches any of the given glob-like patterns.
 * Supports simple wildcard prefix/suffix (e.g. "@scope/*").
 */
export function matchesPattern(name: string, pattern: string): boolean {
  if (pattern.endsWith('*')) {
    return name.startsWith(pattern.slice(0, -1));
  }
  if (pattern.startsWith('*')) {
    return name.endsWith(pattern.slice(1));
  }
  return name === pattern;
}

/**
 * Returns true if the package should be included based on include/exclude lists.
 */
export function isIncluded(name: string, include?: string[], exclude?: string[]): boolean {
  if (exclude && exclude.some((p) => matchesPattern(name, p))) {
    return false;
  }
  if (include && include.length > 0) {
    return include.some((p) => matchesPattern(name, p));
  }
  return true;
}

/**
 * Filters a list of diff entries according to the provided FilterOptions.
 */
export function filterDependencies(
  entries: DiffEntry[],
  options: FilterOptions
): DiffEntry[] {
  return entries.filter((entry) => {
    if (!isIncluded(entry.name, options.include, options.exclude)) {
      return false;
    }
    if (options.onlyBreaking && !entry.breaking) {
      return false;
    }
    if (options.onlyDirect && !entry.direct) {
      return false;
    }
    return true;
  });
}
