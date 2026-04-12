/**
 * provenance-command.ts
 * CLI command for reporting dependency provenance changes between two lock files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseLockFile } from '../parser';
import {
  buildProvenanceMap,
  diffProvenance,
  formatProvenanceReportText,
} from '../diff/dependency-provenance';

interface ProvenanceCommandOptions {
  baseLock: string;
  headLock: string;
  basePackageJson?: string;
  headPackageJson?: string;
  format?: 'text' | 'json';
}

function loadPackageSets(pkgJsonPath?: string): {
  direct: Set<string>;
  dev: Set<string>;
  peer: Set<string>;
} {
  if (!pkgJsonPath || !fs.existsSync(pkgJsonPath)) {
    return { direct: new Set(), dev: new Set(), peer: new Set() };
  }
  const raw = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  return {
    direct: new Set(Object.keys(raw.dependencies ?? {})),
    dev: new Set(Object.keys(raw.devDependencies ?? {})),
    peer: new Set(Object.keys(raw.peerDependencies ?? {})),
  };
}

export async function runProvenanceCommand(options: ProvenanceCommandOptions): Promise<string> {
  const baseLockRaw = fs.readFileSync(path.resolve(options.baseLock), 'utf8');
  const headLockRaw = fs.readFileSync(path.resolve(options.headLock), 'utf8');

  const baseParsed = parseLockFile(baseLockRaw);
  const headParsed = parseLockFile(headLockRaw);

  const baseSets = loadPackageSets(options.basePackageJson);
  const headSets = loadPackageSets(options.headPackageJson);

  const baseMap = buildProvenanceMap(
    baseParsed.dependencies,
    baseSets.direct,
    baseSets.dev,
    baseSets.peer
  );

  const headMap = buildProvenanceMap(
    headParsed.dependencies,
    headSets.direct,
    headSets.dev,
    headSets.peer
  );

  const report = diffProvenance(baseMap, headMap);

  if (options.format === 'json') {
    return JSON.stringify(report, null, 2);
  }

  return formatProvenanceReportText(report);
}

export const provenanceCommandDescription =
  'Compare dependency provenance (direct/transitive/dev/peer) between two lock files';
