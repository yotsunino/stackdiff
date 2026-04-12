import * as fs from 'fs';
import * as path from 'path';
import { parsePackageLock } from '../parser';
import {
  buildDependencyGraph,
  getImpactedPackages,
  formatGraphSummaryText,
} from '../diff/dependency-graph';
import { diffDependencies } from '../diff';

export interface GraphCommandOptions {
  base: string;
  head: string;
  format?: 'text' | 'json';
}

export async function runGraphCommand(options: GraphCommandOptions): Promise<void> {
  const { base, head, format = 'text' } = options;

  if (!fs.existsSync(base)) {
    throw new Error(`Base lock file not found: ${base}`);
  }
  if (!fs.existsSync(head)) {
    throw new Error(`Head lock file not found: ${head}`);
  }

  const baseDeps = parsePackageLock(fs.readFileSync(base, 'utf-8'));
  const headDeps = parsePackageLock(fs.readFileSync(head, 'utf-8'));

  const diff = diffDependencies(baseDeps, headDeps);
  const changedPackages = [
    ...diff.added.map((e) => e.name),
    ...diff.changed.map((e) => e.name),
    ...diff.removed.map((e) => e.name),
  ];

  const headGraph = buildDependencyGraph(headDeps);
  const impacted = new Map<string, string[]>();

  for (const pkg of changedPackages) {
    const affected = getImpactedPackages(headGraph, pkg);
    if (affected.length > 0) {
      impacted.set(pkg, affected);
    }
  }

  if (format === 'json') {
    const output: Record<string, string[]> = {};
    for (const [pkg, affected] of impacted.entries()) {
      output[pkg] = affected;
    }
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  } else {
    if (impacted.size === 0) {
      process.stdout.write('No dependency impact detected.\n');
    } else {
      process.stdout.write(formatGraphSummaryText(headGraph, impacted) + '\n');
    }
  }
}
