import * as fs from 'fs';
import * as path from 'path';
import { parseLockFile } from '../parser/index';
import { diffDirect } from '../diff/direct-diff';
import { calculateScore, formatScoreText } from '../diff/score-calculator';
import { DependencyEntry } from '../resolver/index';

export interface ScoreCommandOptions {
  base: string;
  head: string;
  format?: 'text' | 'json';
}

function collectByChangeType(
  diffs: ReturnType<typeof diffDirect>
): {
  added: DependencyEntry[];
  removed: DependencyEntry[];
  majorUpgrades: DependencyEntry[];
  majorDowngrades: DependencyEntry[];
  minorDowngrades: DependencyEntry[];
  patchDowngrades: DependencyEntry[];
} {
  const added: DependencyEntry[] = [];
  const removed: DependencyEntry[] = [];
  const majorUpgrades: DependencyEntry[] = [];
  const majorDowngrades: DependencyEntry[] = [];
  const minorDowngrades: DependencyEntry[] = [];
  const patchDowngrades: DependencyEntry[] = [];

  for (const entry of diffs) {
    switch (entry.changeType) {
      case 'added': added.push(entry); break;
      case 'removed': removed.push(entry); break;
      case 'major-upgrade': majorUpgrades.push(entry); break;
      case 'major-downgrade': majorDowngrades.push(entry); break;
      case 'minor-downgrade': minorDowngrades.push(entry); break;
      case 'patch-downgrade': patchDowngrades.push(entry); break;
    }
  }

  return { added, removed, majorUpgrades, majorDowngrades, minorDowngrades, patchDowngrades };
}

export function runScoreCommand(options: ScoreCommandOptions): string {
  const baseContent = fs.readFileSync(path.resolve(options.base), 'utf-8');
  const headContent = fs.readFileSync(path.resolve(options.head), 'utf-8');

  const baseDeps = parseLockFile(baseContent);
  const headDeps = parseLockFile(headContent);

  const diffs = diffDirect(baseDeps, headDeps);
  const { added, removed, majorUpgrades, majorDowngrades, minorDowngrades, patchDowngrades } =
    collectByChangeType(diffs);

  const result = calculateScore(
    added, removed, majorUpgrades, majorDowngrades, minorDowngrades, patchDowngrades
  );

  if (options.format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  return formatScoreText(result);
}
