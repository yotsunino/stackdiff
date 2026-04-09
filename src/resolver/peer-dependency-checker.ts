/**
 * Checks peer dependency compatibility between packages.
 */

import { parseVersion, isBreakingChange } from './version-resolver';
import { satisfiesRange } from './range-checker';

export interface PeerDepIssue {
  package: string;
  peerDep: string;
  requiredRange: string;
  resolvedVersion: string;
  breaking: boolean;
}

export interface PeerDepMap {
  [packageName: string]: {
    [peerName: string]: string; // semver range
  };
}

export interface ResolvedDepMap {
  [packageName: string]: string; // resolved version
}

/**
 * Given a map of peer dependency requirements and a map of resolved versions,
 * returns a list of peer dependency issues.
 */
export function checkPeerDependencies(
  peerDeps: PeerDepMap,
  resolved: ResolvedDepMap
): PeerDepIssue[] {
  const issues: PeerDepIssue[] = [];

  for (const [pkg, peers] of Object.entries(peerDeps)) {
    for (const [peerName, requiredRange] of Object.entries(peers)) {
      const resolvedVersion = resolved[peerName];

      if (!resolvedVersion) {
        // Peer dep not installed at all — treat as breaking
        issues.push({
          package: pkg,
          peerDep: peerName,
          requiredRange,
          resolvedVersion: ',
        });
        continue;
      }

      const satisfies = satisfiesRange(resolvedVersion, requiredRange);
      if (!satisfies) {
        const parsed = parseVersion(resolvedVersion);
        const breaking = parsed ? isBreakingChange(parsed, requiredRange) : true;
        issues.push({
          package: pkg,
          peerDep: peerName,
          requiredRange,
          resolvedVersion,
          breaking,
        });
      }
    }
  }

  return issues;
}

/**
 * Returns only the breaking peer dependency issues.
 */
export function getBreakingPeerIssues(issues: PeerDepIssue[]): PeerDepIssue[] {
  return issues.filter((i) => i.breaking);
}
