/**
 * Utilities for checking whether a resolved version satisfies
 * a semver range expression (e.g. "^1.2.3", "~2.0.0", ">=3.1.0").
 */

import { parseSemver } from './semver-utils';

export type RangeOperator = '^' | '~' | '>=' | '<=' | '>' | '<' | '=';

export interface ParsedRange {
  operator: RangeOperator;
  major: number;
  minor: number;
  patch: number;
}

/**
 * Parse a range string like "^1.2.3" into its operator and numeric parts.
 * Returns null if the range cannot be parsed.
 */
export function parseRange(range: string): ParsedRange | null {
  const match = range.match(/^(\^|~|>=|<=|>|<|=)?([\d]+)\.([\d]+)\.([\d]+)/);
  if (!match) return null;
  return {
    operator: (match[1] as RangeOperator) || '=',
    major: parseInt(match[2], 10),
    minor: parseInt(match[3], 10),
    patch: parseInt(match[4], 10),
  };
}

/**
 * Returns true when `version` satisfies the given `range` string.
 */
export function satisfiesRange(version: string, range: string): boolean {
  const parsed = parseSemver(version);
  const r = parseRange(range);
  if (!parsed || !r) return false;

  const { major: vMaj, minor: vMin, patch: vPat } = parsed;
  const { operator, major: rMaj, minor: rMin, patch: rPat } = r;

  const cmp = compareTuples(vMaj, vMin, vPat, rMaj, rMin, rPat);

  switch (operator) {
    case '^':
      // Compatible with: same major, version >= range version
      return vMaj === rMaj && cmp >= 0;
    case '~':
      // Approximately equivalent: same major+minor, patch >= range patch
      return vMaj === rMaj && vMin === rMin && vPat >= rPat;
    case '>=':
      return cmp >= 0;
    case '<=':
      return cmp <= 0;
    case '>':
      return cmp > 0;
    case '<':
      return cmp < 0;
    case '=':
    default:
      return cmp === 0;
  }
}

function compareTuples(
  aMaj: number, aMin: number, aPat: number,
  bMaj: number, bMin: number, bPat: number,
): number {
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPat - bPat;
}
