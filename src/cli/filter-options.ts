import { FilterOptions } from '../filter/dependency-filter';

export const filterOptionDescriptions = {
  include:
    'Comma-separated list of package names or patterns to include (e.g. lodash,@scope/*)',
  exclude:
    'Comma-separated list of package names or patterns to exclude (e.g. @internal/*)',
  onlyBreaking: 'Only report breaking (major) version changes',
  onlyDirect: 'Only report direct dependencies (ignore transitive)',
};

/**
 * Parses raw CLI flag values into a FilterOptions object.
 */
export function parseFilterOptions(flags: {
  include?: string;
  exclude?: string;
  onlyBreaking?: boolean;
  onlyDirect?: boolean;
}): FilterOptions {
  const opts: FilterOptions = {};

  if (flags.include) {
    opts.include = flags.include
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (flags.exclude) {
    opts.exclude = flags.exclude
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (flags.onlyBreaking) {
    opts.onlyBreaking = true;
  }

  if (flags.onlyDirect) {
    opts.onlyDirect = true;
  }

  return opts;
}
