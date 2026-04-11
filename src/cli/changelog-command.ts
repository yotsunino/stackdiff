import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import { buildChangelog, formatChangelogText } from '../diff/changelog-builder';
import { formatAsJson } from '../output/report-formatter';

export interface ChangelogCommandOptions {
  base: string;
  head: string;
  format?: 'text' | 'json';
  output?: string;
}

export async function runChangelogCommand(opts: ChangelogCommandOptions): Promise<void> {
  const baseContent = fs.readFileSync(path.resolve(opts.base), 'utf-8');
  const headContent = fs.readFileSync(path.resolve(opts.head), 'utf-8');

  const baseDeps = parsePackageLock(baseContent);
  const headDeps = parsePackageLock(headContent);

  const changelog = buildChangelog(baseDeps, headDeps);

  let result: string;
  if (opts.format === 'json') {
    result = formatAsJson({
      added: changelog.added,
      removed: changelog.removed,
      upgraded: changelog.upgraded,
      downgraded: changelog.downgraded,
      entries: changelog.entries,
    });
  } else {
    result = formatChangelogText(changelog);
  }

  if (opts.output) {
    fs.writeFileSync(path.resolve(opts.output), result, 'utf-8');
    console.log(`Changelog written to ${opts.output}`);
  } else {
    process.stdout.write(result);
  }
}

export const changelogCommandDescription =
  'Generate a changelog of dependency changes between two lock files';
