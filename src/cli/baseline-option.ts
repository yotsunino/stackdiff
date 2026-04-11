import * as fs from 'fs';
import * as path from 'path';
import { loadSnapshot } from '../snapshot';
import { DependencyMap } from '../parser';

export interface BaselineOptions {
  baselineName: string | undefined;
  maxDrift: number;
}

/**
 * Parses --baseline and --max-drift CLI flags from argv.
 */
export function parseBaselineOptions(argv: string[]): BaselineOptions {
  let baselineName: string | undefined;
  let maxDrift = Infinity;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--baseline' && argv[i + 1]) {
      baselineName = argv[++i];
    } else if (argv[i].startsWith('--baseline=')) {
      baselineName = argv[i].split('=')[1];
    } else if (argv[i] === '--max-drift' && argv[i + 1]) {
      maxDrift = parseInt(argv[++i], 10);
    } else if (argv[i].startsWith('--max-drift=')) {
      maxDrift = parseInt(argv[i].split('=')[1], 10);
    }
  }

  return { baselineName, maxDrift };
}

/**
 * Loads a baseline dependency map from a named snapshot or a file path.
 * Returns undefined when no baseline is requested.
 */
export async function resolveBaseline(
  options: BaselineOptions,
  snapshotDir: string
): Promise<{ name: string; deps: DependencyMap } | undefined> {
  if (!options.baselineName) return undefined;

  const name = options.baselineName;

  // Try snapshot store first
  const snap = loadSnapshot(snapshotDir, name);
  if (snap) {
    return { name, deps: snap.dependencies };
  }

  // Fall back to treating it as a direct file path
  if (fs.existsSync(name)) {
    const { parsePackageLock } = await import('../parser');
    const content = fs.readFileSync(path.resolve(name), 'utf-8');
    const deps = parsePackageLock(content);
    return { name, deps };
  }

  throw new Error(`Baseline "${name}" not found as a snapshot or file path.`);
}

export const baselineOptionDescription =
  '--baseline <name|path>  Compare against a saved snapshot or lock file\n' +
  '--max-drift <n>         Fail when total package drift exceeds n (default: unlimited)';
