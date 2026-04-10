/**
 * ignore-option.ts
 * CLI option parsing for --ignore flag used to skip packages during diff.
 */

import { parseIgnorePatterns } from '../diff/ignored-packages';

export const ignoreOptionDescription =
  'Comma-separated list of package names or scope globs to ignore (e.g. "lodash,@types/*")';

export interface IgnoreOptions {
  ignore: string[];
}

/**
 * Parses the --ignore CLI argument into a structured IgnoreOptions object.
 * Accepts either a single string or an array of strings (when flag is repeated).
 */
export function parseIgnoreOption(
  raw: string | string[] | undefined
): IgnoreOptions {
  if (!raw) return { ignore: [] };

  if (Array.isArray(raw)) {
    const patterns = raw.flatMap((entry) => parseIgnorePatterns(entry));
    return { ignore: patterns };
  }

  return { ignore: parseIgnorePatterns(raw) };
}

/**
 * Formats the active ignore patterns for display in CLI output.
 */
export function formatIgnoreSummary(patterns: string[]): string {
  if (patterns.length === 0) return 'No packages ignored.';
  return `Ignoring ${patterns.length} pattern(s): ${patterns.join(', ')}`;
}
